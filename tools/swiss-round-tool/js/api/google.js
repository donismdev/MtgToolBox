// api/google.js

// ================================
// 0) 설정 (OAuth / API / 시트 이름 / 컬럼 헤더)
// ================================
export const CLIENT_ID = '205763770894-en8rkhvrt6e2riliidothiqacm352cqg.apps.googleusercontent.com';	// OAuth Client ID

// 이 모듈은 Drive + Sheets + Picker를 사용
const DISCOVERY_DOCS = [
	"https://www.googleapis.com/discovery/v1/apis/drive/v3/rest",
	"https://sheets.googleapis.com/$discovery/rest?version=v4",
];

// 최소 권한: drive.file + 시트 읽기/쓰기
const SCOPES = [
	"https://www.googleapis.com/auth/drive.file",
	"https://www.googleapis.com/auth/spreadsheets",
].join(" ");

const MIME = {
	folder: "application/vnd.google-apps.folder",
	spreadsheet: "application/vnd.google-apps.spreadsheet",
};

const FOLDER_NAME = "mtg-tool-box";
const DEFAULT_SPREADSHEET_NAME = "MtgToolBox_SwissData";

// === 시트 탭 이름(최종 스키마) ===
const PLAYERS_SHEET = "players";
const EVENTS_SHEET = "events";
const ROUNDS_SHEET = "rounds";
const META_SHEET = "meta";

// === 헤더(최종 스키마) ===
// Players: player_id | name | created_date | last_updated
const PLAYERS_HEADER = ["player_id", "name", "created_date", "last_updated"];

// Events: event_id | date | best_of | event_format
const EVENTS_HEADER = ["event_id", "date", "best_of", "event_format"];

// Rounds: event_id | round_no | table_no | playerA_id | playerB_id
//         a_wins | a_draws | a_losses | b_wins | b_draws | b_losses | result_type
const ROUNDS_HEADER = [
	"event_id", "round_no", "table_no", "playerA_id", "playerB_id",
	"a_wins", "a_draws", "a_losses", "b_wins", "b_draws", "b_losses", "result_type"
];

// meta: key-value 테이블(키 표준화)
// - last_player_id: 마지막 발급 플레이어 ID (초기 0 → 다음은 1)
// - last_event_id: 마지막 발급 이벤트 ID (초기 0 → 다음은 1)
// - first_game_date: 첫 경기 날짜(ISO 문자열). 없으면 최초 라운드 입력 시 지정
// - last_game_date: 마지막 경기 날짜(ISO 문자열). 라운드 입력 시 갱신
// - event_count: 생성된 이벤트 개수
// - size3_meets ~ size16_meets: N인 모임 횟수 (원하면 사용), 초기 0

// META_DEFAULTS

const META_HEADER = [
	"last_player_id",
	"last_event_id",
	"first_game_date",
	"last_game_date",
	"event_count",
];

const META_DefaultValue = [
	0,
	0,
	"", // 오늘 날짜
	"", // 오늘 날짜
	0,
];

const STORAGE_KEY = "mtg_spreadsheet_id";

// 내부 상태
let gapiLoaded = false;
let pickerLoaded = false;
let tokenClient = null;
let accessToken = null;
let spreadsheetId = null;

// 전역 gapi 참조
const gapi = window.gapi;

// ================================
// 1) 초기화 / 로그인
// ================================

/**
 * Google API Client + Picker 모듈을 초기화하고,
 * GIS 토큰 클라이언트를 준비한다.
 * @param {(signedIn: boolean) => void} onAuthChange 토큰 보유 여부 콜백
 */
export async function initGoogleClient(onAuthChange = () => {}) {
	// gapi client / picker 로딩
	await new Promise((resolve) => {
		gapi.load("client:picker", resolve);
	});
	gapiLoaded = true;
	pickerLoaded = true;

	// gapi client 초기화
	await gapi.client.init({ discoveryDocs: DISCOVERY_DOCS });

	// GIS 토큰 클라이언트 준비
	tokenClient = window.google.accounts.oauth2.initTokenClient({
		client_id: CLIENT_ID,
		scope: SCOPES,
		callback: (resp) => {
			accessToken = resp.access_token || null;
			if (accessToken != null) {
				gapi.client.setToken({ access_token: accessToken });
			}
			onAuthChange(accessToken != null);
		},
	});

	// 앱 재진입 시 저장된 spreadsheetId 복구
	const savedId = window.localStorage.getItem(STORAGE_KEY);
	if (savedId != null && savedId.length > 0) {
		spreadsheetId = savedId;
	}

	// 초기 상태 통지(토큰은 아직 없음)
	onAuthChange(accessToken != null);
}

/** 로그인(액세스 토큰 요청) */
export function signIn(prompt = "consent") {
	ensureInit();
	tokenClient.requestAccessToken({ prompt }); // 'consent' | 'select_account' | 'none'
}

/** 로그아웃(토큰 폐기 및 상태 초기화) */
export function signOut() {
	if (accessToken != null) {
		window.google.accounts.oauth2.revoke(accessToken, () => {});
	}
	accessToken = null;
	gapi.client.setToken(null);
	spreadsheetId = null;
	window.localStorage.removeItem(STORAGE_KEY);
}

/** 내부: 초기화 보장 */
function ensureInit() {
	if (gapiLoaded !== true || pickerLoaded !== true || tokenClient == null) {
		throw new Error("Google API가 아직 초기화되지 않았습니다. initGoogleClient()를 먼저 호출하세요.");
	}
}

// ================================
// 2) Spreadsheet 선택 / 생성 / 캐싱
// ================================

/** 현재 spreadsheetId 반환(없으면 null) */
export function getCurrentSpreadsheetId() {
	return spreadsheetId;
}

/** spreadsheetId를 직접 설정(외부에서 Picker로 구했을 때 등) */
export function setCurrentSpreadsheetId(id) {
	spreadsheetId = id;
	if (id != null) {
		window.localStorage.setItem(STORAGE_KEY, id);
	} else {
		window.localStorage.removeItem(STORAGE_KEY);
	}
}

/** Google Picker로 스프레드시트 선택 후 ID 저장/반환 */
export function openSpreadsheetPicker({ title = "스프레드시트 선택" } = {}) {
	ensureInit();

	return new Promise((resolve, reject) => {
		const oauthToken = gapi.client.getToken()?.access_token || accessToken;
		if (oauthToken == null) {
			reject(new Error("토큰이 없습니다. signIn() 후 다시 시도하세요."));
			return;
		}

		const view = new window.google.picker.View(window.google.picker.ViewId.SPREADSHEETS);
		const picker = new window.google.picker.PickerBuilder()
			.setTitle(title)
			.setOAuthToken(oauthToken)
			.addView(view)
			.setCallback((data) => {
				if (data.action === window.google.picker.Action.PICKED) {
					const doc = data.docs && data.docs[0];
					const id = doc?.id || null;
					if (id != null) {
						setCurrentSpreadsheetId(id);
						resolve(id);
					} else {
						reject(new Error("선택된 문서에서 ID를 찾지 못했습니다."));
					}
				} else if (data.action === window.google.picker.Action.CANCEL) {
					reject(new Error("사용자가 선택을 취소했습니다."));
				}
			})
			.build();
		picker.setVisible(true);
	});
}

/** mtg-tool-box 폴더를 찾거나 생성 후 ID 반환 */
async function findOrCreateFolder() {
	ensureInit();

	const res = await gapi.client.drive.files.list({
		q: `mimeType='${MIME.folder}' and name='${FOLDER_NAME}' and trashed=false`,
		fields: "files(id,name)",
		pageSize: 1,
	});
	if (res.result.files && res.result.files.length > 0) {
		return res.result.files[0].id;
	}

	const create = await gapi.client.drive.files.create({
		resource: { name: FOLDER_NAME, mimeType: MIME.folder },
		fields: "id",
	});
	return create.result.id;
}

/**
 * (핵심) 스프레드시트를 보장한다.
 * - 존재하면 그대로 사용
 * - 없으면 생성 후 탭/헤더 구성 + meta 기본값 채움
 */
export async function ensureSpreadsheetId({ allowCreate = true } = {}) {
	if (spreadsheetId != null) return spreadsheetId;

	const saved = window.localStorage.getItem(STORAGE_KEY);
	if (saved) {
		try {
			await gapi.client.sheets.spreadsheets.get({ spreadsheetId: saved, fields: "spreadsheetId" });
			setCurrentSpreadsheetId(saved);
			// 기존 문서에도 시트 탭/헤더/meta 기본값이 있는지 보장
			await ensureSheetsAndHeaders();
			await ensureMetaDefaults();
			return saved;
		} catch (_e) {
			window.localStorage.removeItem(STORAGE_KEY);
		}
	}

	if (allowCreate !== true) {
		throw new Error("연결된 스프레드시트가 없습니다. Picker로 선택하거나 allowCreate=true로 생성하세요.");
	}

	// 새 문서 생성 플로우
	const folderId = await findOrCreateFolder();

	// 동일 이름 검색(폴더 내)
	const found = await gapi.client.drive.files.list({
		q: `'${folderId}' in parents and mimeType='${MIME.spreadsheet}' and name='${DEFAULT_SPREADSHEET_NAME}' and trashed=false`,
		fields: "files(id,name)",
		pageSize: 1,
	});
	if (found.result.files && found.result.files.length > 0) {
		const id = found.result.files[0].id;
		setCurrentSpreadsheetId(id);
		await ensureSheetsAndHeaders();
		await ensureMetaDefaults();
		return id;
	}

	// 새 스프레드시트 생성(부모=폴더 지정)
	const createFile = await gapi.client.drive.files.create({
		resource: {
			name: DEFAULT_SPREADSHEET_NAME,
			mimeType: MIME.spreadsheet,
			parents: [folderId],
			appProperties: { mtgTool: "true" },
		},
		fields: "id",
	});
	const newId = createFile.result.id;
	setCurrentSpreadsheetId(newId);

	// 탭/헤더 구성 + meta 기본값 기록
	await ensureSheetsAndHeaders();	// 새 문서에도 기본 Sheet1 존재 → 아래에서 정리
	await ensureMetaDefaults();

	// 기본 'Sheet1' 제거(가능 시)
	try {
		const meta = await gapi.client.sheets.spreadsheets.get({ spreadsheetId: newId });
		const sheet1 = (meta.result.sheets || []).find(s => s.properties?.title === "Sheet1");
		if (sheet1 && typeof sheet1.properties?.sheetId === "number") {
			await gapi.client.sheets.spreadsheets.batchUpdate({
				spreadsheetId: newId,
				resource: { requests: [{ deleteSheet: { sheetId: sheet1.properties.sheetId } }] },
			});
		}
	} catch (_e) { /* 무시 */ }

	return newId;
}

/** (중요) 필요한 탭과 헤더를 모두 보장한다. */
async function ensureSheetsAndHeaders() {
	const ssId = await (spreadsheetId ? spreadsheetId : ensureSpreadsheetId({ allowCreate: true }));
	const meta = await gapi.client.sheets.spreadsheets.get({ spreadsheetId: ssId });

	// 현재 시트 이름 목록
	const existing = new Map((meta.result.sheets || []).map(s => [s.properties?.title, s.properties?.sheetId]));

	const wants = [
		{ title: PLAYERS_SHEET, header: PLAYERS_HEADER },
		{ title: EVENTS_SHEET,  header: EVENTS_HEADER  },
		{ title: ROUNDS_SHEET,  header: ROUNDS_HEADER  },
		{ title: META_SHEET,    header: META_HEADER },
	];

	// 1) 없는 시트 추가
	const addReqs = wants
		.filter(w => !existing.has(w.title))
		.map(w => ({ addSheet: { properties: { title: w.title } } }));
	if (addReqs.length > 0) {
		await gapi.client.sheets.spreadsheets.batchUpdate({
			spreadsheetId: ssId,
			resource: { requests: addReqs },
		});
	}

	// 2) 각 시트의 첫 행에 헤더 보장(비어 있으면 써넣음)
	for (const w of wants) {
		const rows = await getSheetData(`${w.title}!A1:Z1`);
		const hasHeader = Array.isArray(rows) && rows.length >= 1 && rows[0] && rows[0].length > 0;
		if (!hasHeader) {
			await updateSheetData(`${w.title}!A1:${colLabel(w.header.length)}1`, [w.header]);
		}
	}
}

/** A, B, ... Z, AA, AB ... 변환(간단) */
function colLabel(n) {
	const A = 65;
	let s = "";
	while (n > 0) {
		const mod = (n - 1) % 26;
		s = String.fromCharCode(A + mod) + s;
		n = Math.floor((n - 1) / 26);
	}
	return s;
}

/** meta 기본값을 보장한다(없으면 생성). */
async function ensureMetaDefaults() {
    const rows = await getSheetData(META_SHEET);
    // 헤더만 있거나 시트가 비어있는 경우 (rows.length <= 1), 기본값 데이터 행을 추가
    if (rows.length <= 1) {
        await appendSheetData(META_SHEET, [META_DefaultValue]);
    }
}

// ================================
// 3) 시트 데이터 입출력 (Generic)
// ================================

/** 시트 전체(또는 A1 range 지정) 데이터를 가져온다. */
export async function getSheetData(range) {
	const ssId = await ensureSpreadsheetId();
	try {
		const res = await gapi.client.sheets.spreadsheets.values.get({ spreadsheetId: ssId, range });
		return res.result.values || [];
	} catch (err) {
		console.error(`getSheetData 실패(${range}):`, err?.result?.error?.message || err.message);
		return [];
	}
}

/** 특정 시트에 행들을 append한다. */
export async function appendSheetData(sheetName, rows) {
	const ssId = await ensureSpreadsheetId();
	return gapi.client.sheets.spreadsheets.values.append({
		spreadsheetId: ssId,
		range: `${sheetName}`,
		valueInputOption: "USER_ENTERED",
		insertDataOption: "INSERT_ROWS",
		resource: { values: rows },
	});
}

/** 특정 범위를 업데이트한다. */
export async function updateSheetData(range, values) {
	const ssId = await ensureSpreadsheetId();
	return gapi.client.sheets.spreadsheets.values.update({
		spreadsheetId: ssId,
		range,
		valueInputOption: "USER_ENTERED",
		resource: { values },
	});
}

/** 여러 범위 업데이트를 한번에(batch) 처리 */
export async function batchUpdateValues(updates) {
	const ssId = await ensureSpreadsheetId();
	return gapi.client.sheets.spreadsheets.values.batchUpdate({
		spreadsheetId: ssId,
		resource: {
			valueInputOption: "USER_ENTERED",
			data: updates.map(u => ({ range: u.range, values: u.values })),
		},
	});
}

// ================================
// 4) View 계층에서 바로 쓰기 좋은 헬퍼
// ================================

/** Meta(Config) key-value 맵 읽기 (없으면 ensure 후 반환) */
export async function getConfigMap() {
	await ensureSpreadsheetId({ allowCreate: true });
	await ensureSheetsAndHeaders();
	await ensureMetaDefaults();

	const rows = await getSheetData(META_SHEET);
    if (rows.length < 2) {
        console.error("Meta 시트에서 헤더 또는 데이터 행을 찾을 수 없습니다.");
        return {}; // 문제가 있으면 빈 객체 반환
    }

    const header = rows[0]; // ["last_player_id", "last_event_id", ...]
    const values = rows[1]; // ["0", "0", ...]

    const map = {};
    header.forEach((key, index) => {
        if (key) { // 키가 비어있지 않은 경우에만
            map[key] = values[index] ?? ""; // 해당 인덱스의 값을 할당
        }
    });
    return map;
}

/** Meta(Config) key 하나 업데이트(없으면 append) */
export async function setConfig(key, value) {
	await ensureSpreadsheetId({ allowCreate: true });

    // 헤더를 읽어와서 key에 해당하는 열 인덱스를 찾음
    const headerRows = await getSheetData(`${META_SHEET}!A1:Z1`);
    if (!headerRows || headerRows.length === 0) {
        throw new Error("Meta 시트의 헤더를 읽을 수 없습니다.");
    }
    const header = headerRows[0];
    const colIndex = header.findIndex(h => h === key);

    if (colIndex === -1) {
        console.warn(`'${key}'는 유효한 meta 설정이 아닙니다.`);
        return;
    }

    // 0-based index를 'A', 'B' ... 와 같은 열 문자로 변환
    const colLetter = colLabel(colIndex + 1);
    // 항상 2번째 행의 해당 열을 업데이트
    const range = `${META_SHEET}!${colLetter}2`;

    return updateSheetData(range, [[String(value)]]);
}

// -------- Players --------

/** players 탭 읽기 → 객체 배열 */
export async function getPlayers() {
	await ensureSpreadsheetId({ allowCreate: true });
	await ensureSheetsAndHeaders();
	const rows = await getSheetData(`${PLAYERS_SHEET}`);
	if (rows.length < 2) return [];
	const header = rows[0];
	return rows.slice(1).map((r) => {
		const obj = {};
		header.forEach((k, i) => obj[k] = r[i] ?? "");
		return obj;
	});
}

/**
 * (중요) 다음 player_id 발급: meta.last_player_id + 1
 * - 0은 “없음/초기값” 의미. 실제 ID로 사용 금지.
 */
export async function getNextPlayerId() {
	const cfg = await getConfigMap();
	const last = parseInt(cfg["last_player_id"] ?? "0", 10) || 0;
	const next = last + 1;
	await setConfig("last_player_id", String(next));
	return next;
}

/** Players 행 append (연속 ID 자동 부여 옵션) */
export async function addPlayers(newPlayers) {
	await ensureSpreadsheetId({ allowCreate: true });
	await ensureSheetsAndHeaders();
	await ensureMetaDefaults();

	const rows = [];
	for (const p of newPlayers) {
		const id = Number.isFinite(p.player_id) && p.player_id > 0 ? p.player_id : await getNextPlayerId();
		const now = new Date().toISOString();
		rows.push([
			id,
			p.name ?? "",
			p.created_date ?? now,
			p.last_updated ?? now,
		]);
	}
	return appendSheetData(PLAYERS_SHEET, rows);
}

// -------- Events --------

/** events 탭 읽기 */
export async function getEvents() {
	await ensureSpreadsheetId({ allowCreate: true });
	await ensureSheetsAndHeaders();
	const rows = await getSheetData(`${EVENTS_SHEET}`);
	if (rows.length < 2) return [];
	const header = rows[0];
	return rows.slice(1).map((r) => {
		const obj = {};
		header.forEach((k, i) => obj[k] = r[i] ?? "");
		return obj;
	});
}

/** 다음 event_id 발급: meta.last_event_id + 1 */
export async function getNextEventId() {
	const cfg = await getConfigMap();
	const last = parseInt(cfg["last_event_id"] ?? "0", 10) || 0;
	const next = last + 1;
	await setConfig("last_event_id", String(next));
	return next;
}

/**
 * Event 생성 + meta 갱신
 * - event_count += 1
 * - last_game_date ← event date (초기엔 동일)
 */
export async function addEvent(e) {
	await ensureSpreadsheetId({ allowCreate: true });
	await ensureSheetsAndHeaders();
	await ensureMetaDefaults();

	const id = Number.isFinite(e.event_id) && e.event_id > 0 ? e.event_id : await getNextEventId();
	const row = [
		id,
		e.date ?? new Date().toISOString().slice(0, 10),	// YYYY-MM-DD
		Number.isFinite(e.best_of) ? e.best_of : 3,
		(e.event_format ?? "cube").toLowerCase()
	];
	await appendSheetData(EVENTS_SHEET, [row]);

	// meta 갱신
	const cfg = await getConfigMap();
	const eventCount = parseInt(cfg["event_count"] ?? "0", 10) || 0;
	await setConfig("event_count", String(eventCount + 1));
	await setConfig("last_game_date", String(row[1]));	// 이벤트 날짜로 세팅(라운드 입력 시 다시 갱신될 수 있음)

	return id;
}

// -------- Rounds (매치 로그) --------

/** rounds 탭 읽기 */
export async function getRounds() {
	await ensureSpreadsheetId({ allowCreate: true });
	await ensureSheetsAndHeaders();
	const rows = await getSheetData(`${ROUNDS_SHEET}`);
	if (rows.length < 2) return [];
	const header = rows[0] || ROUNDS_HEADER;
	return rows.slice(1).map((r) => {
		const obj = {};
		header.forEach((k, i) => obj[k] = r[i] ?? "");
		return obj;
	});
}

/**
 * 라운드(1:1 경기) 추가
 * - BYE일 경우: playerB_id = "" 또는 null 전달 + result_type='BYE'
 * - a_* / b_* 는 미완(1:0, 1:1 등)까지 정확히 반영
 * - meta.first_game_date / last_game_date 자동 보정
 */
export async function addRounds(newRounds) {
	await ensureSpreadsheetId({ allowCreate: true });
	await ensureSheetsAndHeaders();
	await ensureMetaDefaults();

	const rows = [];
	for (const m of newRounds) {
		// 안전장치: 0 ID 금지(0은 메타 초기값 의미)
		const aId = Number(m.playerA_id) || 0;
		const bId = m.playerB_id != null && m.playerB_id !== "" ? (Number(m.playerB_id) || 0) : null;
		if (aId <= 0) throw new Error("playerA_id는 1 이상의 정수가 필요합니다.");
		if (bId === 0) throw new Error("playerB_id=0은 사용할 수 없습니다. (BYE는 null/빈값)");

		const resultType = (m.result_type ?? "OK").toUpperCase();
		const a_w = Number(m.a_wins)   || 0;
		const a_d = Number(m.a_draws)  || 0;
		const a_l = Number(m.a_losses) || 0;
		const b_w = Number(m.b_wins)   || 0;
		const b_d = Number(m.b_draws)  || 0;
		const b_l = Number(m.b_losses) || 0;

		// 상호 일관성(OK/CONCEDE/NO_SHOW에도 동일하게 맞춰두길 권장)
		if (resultType !== "BYE") {
			if (!(a_w === b_l && a_l === b_w && a_d === b_d)) {
				console.warn("a_*와 b_*의 상호 일관성이 맞지 않습니다. (자동 검증 권장)");
			}
		}

		rows.push([
			Number(m.event_id) || 0,						// event_id(0 금지. UI단에서 보장 권장)
			Number(m.round_no) || 0,						// round_no
			Number(m.table_no) || 0,						// table_no
			aId,											// playerA_id
			bId == null ? "" : bId,							// playerB_id (BYE면 빈값)
			a_w, a_d, a_l,
			b_w, b_d, b_l,
			resultType,
		]);
	}

	// append
	await appendSheetData(ROUNDS_SHEET, rows);

	// meta의 first_game_date / last_game_date 보정
	// round에 "날짜" 컬럼이 없으므로, 이벤트의 date를 사용(필요시 라운드 날짜 컬럼 추가 가능)
	const cfg = await getConfigMap();
	const events = await getEvents();
	if (events.length > 0) {
		// 마지막으로 기록된 라운드들의 이벤트 중 가장 최신 date로 last_game_date 갱신
		const dateSet = new Set(rows.map(r => String(r[1]))); // round_no (자리) 아니고… 이벤트 날짜를 가져와야 함
		// 위 한 줄은 단독으로 이벤트 날짜를 못 얻음 → 안전하게 전체 이벤트에서 최신 날짜를 취함
		let first = cfg["first_game_date"] ?? "";
		let last = cfg["last_game_date"] ?? "";
		const dates = events.map(e => e.date).filter(Boolean).sort();
		if (dates.length > 0) {
			const minDate = dates[0];
			const maxDate = dates[dates.length - 1];
			if (!first) await setConfig("first_game_date", String(minDate));
			await setConfig("last_game_date", String(maxDate));
		}
	}
}

export async function updatePlayerTimestamps(playerIds) {
    const players = await getPlayers(); // 기존 플레이어 데이터 로드
    const updates = [];
    const now = new Date().toISOString();

    playerIds.forEach(id => {
        const rowIndex = players.findIndex(p => p.player_id === String(id));
        if (rowIndex !== -1) {
            // 헤더가 1행이므로 실제 시트 행 번호는 rowIndex + 2
            // last_updated는 D열(4번째)이라고 가정
            updates.push({
                range: `${PLAYERS_SHEET}!D${rowIndex + 2}`,
                values: [[now]]
            });
        }
    });

    if (updates.length > 0) {
        return batchUpdateValues(updates);
    }
}

/** meta 시트의 여러 key-value를 한 번에 업데이트 */
export async function batchUpdateMeta(newMeta) {
    const headerRows = await getSheetData(`${META_SHEET}!A1:Z1`);
    if (!headerRows || headerRows.length === 0) {
        throw new Error("Meta 시트의 헤더를 읽을 수 없습니다.");
    }
    const header = headerRows[0];
    
    const updates = [];
    for (const [key, value] of Object.entries(newMeta)) {
        const colIndex = header.findIndex(h => h === key);
        if (colIndex !== -1) {
            const colLetter = colLabel(colIndex + 1);
            updates.push({
                range: `${META_SHEET}!${colLetter}2`,
                values: [[String(value)]]
            });
        }
    }

    if (updates.length > 0) {
        return batchUpdateValues(updates);
    }
}


/*
사용 팁 요약
최초 실행 흐름

await initGoogleClient() → signIn()

await ensureSpreadsheetId() → 자동으로 폴더/문서/탭/헤더/메타 생성

플레이어 추가

js
복사
편집
await addPlayers([{ name: "김철수" }, { name: "홍길동" }]); // ID는 자동 1,2…
이벤트 생성

js
복사
편집
const eventId = await addEvent({ date: "2025-08-13", best_of: 3, event_format: "cube" });
라운드 기록(1:0 종료 예)

js
복사
편집
await addRounds([{
	event_id: eventId, round_no: 1, table_no: 1,
	playerA_id: 1, playerB_id: 2,
	a_wins: 1, a_draws: 1, a_losses: 0,
	b_wins: 0, b_draws: 1, b_losses: 1,
	result_type: "OK",
}]);
BYE

js
복사
편집
await addRounds([{
	event_id: eventId, round_no: 1, table_no: 2,
	playerA_id: 3, playerB_id: null,	// 또는 "" (빈값)
	a_wins: 2, a_draws: 0, a_losses: 0,	// 내부 정책(2–0 권장)
	b_wins: 0, b_draws: 0, b_losses: 0,
	result_type: "BYE",
}]);
*/