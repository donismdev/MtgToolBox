/* eslint-disable no-tabs */
// js/main.js
// - 바뀐 api/google.js 스키마에 맞춘 테스트 UI
// - 인증/스프레드시트 보장/Players·Events·Rounds CRUD(append)/Meta 조회

import {
	initGoogleClient, signIn, signOut,
	openSpreadsheetPicker, ensureSpreadsheetId, getCurrentSpreadsheetId,
	getConfigMap, setConfig,
	getPlayers, addPlayers,
	getEvents, addEvent,
	getRounds, addRounds,
	ensureSheetsAndHeaders,		// 내부 보장 루틴도 노출되어 있어 사용 가능
} from "../api/google.js";

// ---------- DOM ----------
const $ = (sel)=>document.querySelector(sel);
const statusBar = $("#status-bar");

const txtSpreadsheetId = $("#txtSpreadsheetId");

const btnSignIn = $("#btnSignIn");
const btnSignOut = $("#btnSignOut");
const btnEnsure = $("#btnEnsure");
const btnPicker = $("#btnPicker");

const playerName = $("#playerName");
const btnAddPlayer = $("#btnAddPlayer");
const btnLoadPlayers = $("#btnLoadPlayers");
const tblPlayers = $("#tblPlayers tbody");

const eventDate = $("#eventDate");
const eventBestOf = $("#eventBestOf");
const eventFormat = $("#eventFormat");
const btnAddEvent = $("#btnAddEvent");
const btnLoadEvents = $("#btnLoadEvents");
const tblEvents = $("#tblEvents tbody");

const rEventId = $("#rEventId");
const rRoundNo = $("#rRoundNo");
const rTableNo = $("#rTableNo");
const rResult = $("#rResult");
const rAId = $("#rAId");
const rAW = $("#rAW");
const rAD = $("#rAD");
const rAL = $("#rAL");
const rBId = $("#rBId");
const rBW = $("#rBW");
const rBD = $("#rBD");
const rBL = $("#rBL");
const btnAddRound = $("#btnAddRound");
const btnLoadRounds = $("#btnLoadRounds");
const tblRounds = $("#tblRounds tbody");

const btnLoadMeta = $("#btnLoadMeta");
const btnInitAll = $("#btnInitAll");
const tblMeta = $("#tblMeta tbody");

// ---------- UI helpers ----------
function setStatus(type, msg){
	statusBar.className = "status-bar " + (type || "info");
	statusBar.textContent = msg;
}

function fillTable(tbody, rows){
	tbody.innerHTML = "";
	const frag = document.createDocumentFragment();
	for (const row of rows){
		const tr = document.createElement("tr");
		for (const cell of row){
			const td = document.createElement("td");
			td.textContent = (cell ?? "");
			tr.appendChild(td);
		}
		frag.appendChild(tr);
	}
	tbody.appendChild(frag);
}

function showSpreadsheetId(){
	const id = getCurrentSpreadsheetId();
	txtSpreadsheetId.value = id || "";
}

// ---------- Loaders ----------
async function loadPlayers(){
	const list = await getPlayers();
	const rows = list.map(p=>[p.player_id,p.name,p.created_date,p.last_updated]);
	fillTable(tblPlayers, rows);
}

async function loadEvents(){
	const list = await getEvents();
	const rows = list.map(e=>[e.event_id, e.date, e.best_of, e.event_format]);
	fillTable(tblEvents, rows);
}

async function loadRounds(){
	const list = await getRounds();
	const rows = list.map(r=>[
		r.event_id, r.round_no, r.table_no,
		r.playerA_id, r.playerB_id,
		r.a_wins, r.a_draws, r.a_losses,
		r.b_wins, r.b_draws, r.b_losses,
		r.result_type
	]);
	fillTable(tblRounds, rows);
}

async function loadMeta(){
	const cfg = await getConfigMap();
	const keys = Object.keys(cfg).sort();
	const rows = keys.map(k=>[k, cfg[k]]);
	fillTable(tblMeta, rows);
}

// ---------- Actions ----------
btnSignIn.addEventListener("click", async ()=>{
	try{
		signIn("consent");
		setStatus("info","로그인 요청을 보냈습니다. 팝업을 확인하세요.");
	}catch(e){
		setStatus("error","로그인 실패: " + (e?.message || e));
	}
});

btnSignOut.addEventListener("click", async ()=>{
	try{
		signOut();
		showSpreadsheetId();
		setStatus("success","로그아웃 완료");
	}catch(e){
		setStatus("error","로그아웃 실패: " + (e?.message || e));
	}
});

btnEnsure.addEventListener("click", async ()=>{
	try{
		setStatus("info","스프레드시트를 보장(생성/연결) 중…");
		const id = await ensureSpreadsheetId({ allowCreate:true });
		await ensureSheetsAndHeaders(); // 탭/헤더 보장
		showSpreadsheetId();
		setStatus("success","스프레드시트 준비됨: " + id);
	}catch(e){
		setStatus("error","보장 실패: " + (e?.message || e));
	}
});

btnPicker.addEventListener("click", async ()=>{
	try{
		setStatus("info","기존 스프레드시트를 선택하세요.");
		const { openSpreadsheetPicker } = await import("../api/google.js"); // 동적 import 안전
		const id = await openSpreadsheetPicker({ title:"스프레드시트 선택" });
		showSpreadsheetId();
		setStatus("success","선택됨: " + id);
	}catch(e){
		setStatus("error","선택 실패: " + (e?.message || e));
	}
});

btnAddPlayer.addEventListener("click", async ()=>{
	try{
		const name = (playerName.value || "").trim();
		if (name.length === 0){
			setStatus("error","플레이어 이름을 입력하세요.");
			return;
		}
		await addPlayers([{ name }]);
		playerName.value = "";
		await loadPlayers();
		setStatus("success","플레이어 추가 완료");
	}catch(e){
		setStatus("error","플레이어 추가 실패: " + (e?.message || e));
	}
});

btnLoadPlayers.addEventListener("click", async ()=>{
	try{
		await loadPlayers();
		setStatus("success","플레이어 목록 새로고침 완료");
	}catch(e){
		setStatus("error","플레이어 목록 로드 실패: " + (e?.message || e));
	}
});

btnAddEvent.addEventListener("click", async ()=>{
	try{
		const date = eventDate.value || new Date().toISOString().slice(0,10);
		const best_of = parseInt(eventBestOf.value, 10) || 3;
		const event_format = (eventFormat.value || "cube").toLowerCase();
		const id = await addEvent({ date, best_of, event_format });
		await loadEvents();
		setStatus("success","이벤트 생성 완료: " + id);
	}catch(e){
		setStatus("error","이벤트 생성 실패: " + (e?.message || e));
	}
});

btnLoadEvents.addEventListener("click", async ()=>{
	try{
		await loadEvents();
		setStatus("success","이벤트 목록 새로고침 완료");
	}catch(e){
		setStatus("error","이벤트 목록 로드 실패: " + (e?.message || e));
	}
});

btnAddRound.addEventListener("click", async ()=>{
	try{
		const event_id = parseInt(rEventId.value, 10) || 0;
		const round_no = parseInt(rRoundNo.value, 10) || 0;
		const table_no = parseInt(rTableNo.value, 10) || 0;
		const result_type = (rResult.value || "OK").toUpperCase();

		const playerA_id = parseInt(rAId.value, 10) || 0;
		const a_wins = parseInt(rAW.value, 10) || 0;
		const a_draws = parseInt(rAD.value, 10) || 0;
		const a_losses = parseInt(rAL.value, 10) || 0;

		const playerB_raw = rBId.value.trim();
		const playerB_id = playerB_raw === "" ? null : (parseInt(playerB_raw, 10) || 0);
		const b_wins = parseInt(rBW.value, 10) || 0;
		const b_draws = parseInt(rBD.value, 10) || 0;
		const b_losses = parseInt(rBL.value, 10) || 0;

		// 간단 검증: 0 ID 금지(BYE는 null)
		if (event_id <= 0){ setStatus("error","event_id가 올바르지 않습니다(1 이상)."); return; }
		if (round_no <= 0){ setStatus("error","round_no가 올바르지 않습니다(1 이상)."); return; }
		if (table_no <= 0){ setStatus("error","table_no가 올바르지 않습니다(1 이상)."); return; }
		if (playerA_id <= 0){ setStatus("error","playerA_id는 1 이상이어야 합니다."); return; }
		if (playerB_id === 0){ setStatus("error","playerB_id=0은 사용할 수 없습니다. (BYE는 빈칸)"); return; }

		await addRounds([{
			event_id, round_no, table_no,
			playerA_id, playerB_id,
			a_wins, a_draws, a_losses,
			b_wins, b_draws, b_losses,
			result_type
		}]);

		await loadRounds();
		setStatus("success","라운드 추가 완료");
	}catch(e){
		setStatus("error","라운드 추가 실패: " + (e?.message || e));
	}
});

btnLoadRounds.addEventListener("click", async ()=>{
	try{
		await loadRounds();
		setStatus("success","라운드 목록 새로고침 완료");
	}catch(e){
		setStatus("error","라운드 목록 로드 실패: " + (e?.message || e));
	}
});

btnLoadMeta.addEventListener("click", async ()=>{
	try{
		await loadMeta();
		setStatus("success","메타 조회 완료");
	}catch(e){
		setStatus("error","메타 조회 실패: " + (e?.message || e));
	}
});

btnInitAll.addEventListener("click", async ()=>{
	try{
		setStatus("info","초기화 중… 폴더/문서/탭/헤더/메타를 보장합니다.");
		await ensureSpreadsheetId({ allowCreate:true });
		await ensureSheetsAndHeaders();
		await loadMeta();
		showSpreadsheetId();
		setStatus("success","초기화 완료");
	}catch(e){
		setStatus("error","초기화 실패: " + (e?.message || e));
	}
});

// ---------- boot ----------
(async function boot(){
	try{
		setStatus("info","앱을 초기화하는 중…");
		await initGoogleClient((signedIn)=>{
			setStatus(signedIn?"success":"info", signedIn?"로그인됨":"로그인 필요");
		});
		showSpreadsheetId();
	}catch(e){
		setStatus("error","초기화 실패: " + (e?.message || e));
	}
})();
