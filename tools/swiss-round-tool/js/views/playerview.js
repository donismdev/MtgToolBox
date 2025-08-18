
import { setState, getState } from '../config.js';
import * as GoogleApi from '../api/google.js';

let hasTriedLoadPlayers = false;

export default function PlayerView() {
    const element = document.createElement('div');
    element.id = 'player-view-container';

    // --- 뷰의 내부 상태 (이전과 동일) ---
    let localPlayers = [];
    let selectedPlayers = [];
    let status = { type: 'info', message: '스프레드 시트를 선택하세요.' };
    let currentView = 'initial';
    let isLoading = false;

	// --- 헬퍼 함수들 ---
	function updateSelectionHUD() {
		const cnt = element.querySelector('#selected-count');
		const btn = element.querySelector('#start-match-btn');
		if (cnt) cnt.textContent = `참가 명단 (${selectedPlayers.length}명)`;
		if (btn) {
			btn.disabled = selectedPlayers.length < 3;
		btn.textContent = `${selectedPlayers.length}명으로 매치 설정 시작`;
  		}
	}

	function addSelectedPlayerDOM(player) {
		const ul = element.querySelector('#selected-players-list');
		if (!ul) return;
		const li = document.createElement('li');
		const idx = selectedPlayers.length - 1; // 막 추가된 인덱스
		li.innerHTML = `
			<span>${player.name}</span>
			<button class="remove-player-btn" data-index="${idx}">X</button>
		`;
		ul.appendChild(li);
	}

	function rebuildSelectedListIndices() {
		// 삭제 후 data-index를 재배열
		element.querySelectorAll('#selected-players-list .remove-player-btn')
			.forEach((btn, i) => btn.dataset.index = String(i));
	}

    // --- 렌더링 로직 ---
    const render = () => {
        const { isSignedIn, spreadsheetId } = getState();

        if (currentView === 'initial' && isSignedIn) {
            currentView = spreadsheetId ? 'regular' : 'sheet';
        }

        let content = '';
        switch (currentView) {
            case 'quick': content = renderParticipantManager('temp'); break;
            case 'sheet': content = renderSheetManager(); break;
            case 'regular': content = renderParticipantManager('regular'); break;
            default: content = renderInitialView(); break;
        }

        // ✨ [핵심 수정] 복잡한 <style> 블록을 완전히 제거했습니다.
        element.innerHTML = `
            ${currentView !== 'initial' ? `<button class="back-btn secondary-btn small-btn" data-target="initial">← 처음으로</button>` : ''}
            <h2>참가자 설정</h2>
            <div class="status-bar ${status.type}">${status.message}</div>
            <div class="view-content">
                ${content}
            </div>
        `;
        attachEventListeners();
    };


    const renderInitialView = () => `
        <div class="initial-buttons">
            <button id="show-quick-match-btn" class="secondary-btn">빠른 경기 시작</button>
            <button id="google-signin-btn" class="primary-btn">정규 경기 시작 (Google 로그인)</button>
        </div>
    `;



    const renderParticipantManager = (mode) => {
		const isRegular = mode === 'regular';

		// 자동 로딩은 1회만
		if (isRegular && localPlayers.length === 0 && !isLoading && hasTriedLoadPlayers === false) {
			hasTriedLoadPlayers = true;
			setTimeout(loadPlayers, 0);
		}

		const sortedPlayerPool = [...localPlayers].sort((a, b) => a.name.localeCompare(b.name));
		const ssId = (getState()?.spreadsheetId) || "";

		return `
			<h3>${isRegular ? '정규 경기' : '빠른 경기'}: 참가 명단 구성</h3>
			<p>${isRegular ? '시트에 등록된 선수를 선택/추가해서 명단을 구성하세요.' : '참가할 선수의 이름을 직접 입력하여 명단에 추가하세요.'}</p>

			${isRegular ? `
				<!-- ✅ 항상 노출되는 "시트에 선수 추가" 폼 -->
				<form id="add-sheet-players-form" class="inline-add">
					<label for="sheet-player-names"><strong>선수 추가</strong> (쉼표 또는 줄바꿈으로 여러 명)</label>
					<textarea id="sheet-player-names" rows="2" placeholder="예) 김철수, 홍길동&#10;이영희"></textarea>
					<div class="actions">
						<button type="submit" class="primary-btn" ${isLoading ? 'disabled' : ''}>시트에 추가</button>
						<button type="button" id="open-sheet-btn" class="secondary-btn" ${ssId ? "" : "disabled"}>스프레드시트 열기</button>
						<button type="button" id="refresh-players-btn" class="secondary-btn" ${isLoading ? 'disabled' : ''}>목록 새로고침</button>
					</div>
				</form>

				<p class="muted">${isLoading ? '선수 목록 로딩 중...' : `총 ${localPlayers.length}명의 선수가 있습니다.`}</p>

				<div class="player-pool-list">
					${sortedPlayerPool.map(player => `
						<label>
							<input 
								type="checkbox" 
								class="player-checkbox" 
								data-player-id="${player.player_id}"
								${selectedPlayers.some(p => p.player_id === player.player_id) ? 'checked' : ''}
							>
							<span>${player.name}</span>
						</label>
					`).join('')}
				</div>
			` : `
				<form id="add-temp-player-form">
					<input type="text" id="temp-player-name" placeholder="이름 입력 후 추가" autocomplete="off">
					<button type="submit">명단에 추가</button>
				</form>
			`}

			<h4 id="selected-count">참가 명단 (${selectedPlayers.length}명)</h4>
			<ul id="selected-players-list">
				${selectedPlayers.length === 0 ? `<li>참가할 선수를 추가/선택해주세요. (최소 3명)</li>` : ''}
				${selectedPlayers.map((p, index) => `
					<li>
						<span>${p.name}</span>
						<button class="remove-player-btn" data-index="${index}">X</button>
					</li>
				`).join('')}
			</ul>

			<button id="start-match-btn" class="start-match-btn primary-btn" ${selectedPlayers.length < 3 ? 'disabled' : ''}>
				${selectedPlayers.length}명으로 매치 설정 시작
			</button>
		`;
	};

    // --- 이하 나머지 함수들은 이전과 동일합니다 ---

    const renderSheetManager = () => `
		<h3>스프레드시트 선택</h3>
		<p>데이터를 저장할 스프레드시트를 선택하거나 생성하세요.</p>
		<div class="actions">
			<button id="ensure-sheet-btn" class="primary-btn" ${isLoading ? 'disabled' : ''}>
				${isLoading ? '시트 생성 중...' : '새 시트 생성/연결'}
			</button>
			<button id="pick-sheet-btn" class="secondary-btn" ${isLoading ? 'disabled' : ''}>
				기존 시트 선택
			</button>
			${isLoading ? '<button id="cancel-loading-btn" class="secondary-btn danger-btn">취소</button>' : ''}
		</div>
	`;

	function withTimeout(promise, ms, label = '작업') {
	return new Promise((resolve, reject) => {
		const timer = setTimeout(() => reject(new Error(`${label} 타임아웃(${ms}ms)`)), ms);
		promise.then(v => { clearTimeout(timer); resolve(v); })
		       .catch(e => { clearTimeout(timer); reject(e); });
	});
}

	async function enterRegularMode(spreadsheetId) {
		setState({ spreadsheetId });
		localPlayers = [];
		selectedPlayers = [];
		hasTriedLoadPlayers = false;
		currentView = 'regular';

		if (typeof GoogleApi.prepareCurrentSpreadsheet === 'function') {
			await GoogleApi.prepareCurrentSpreadsheet(); // 여기도 타임아웃을 쓰고 싶다면 withTimeout으로 감싸도 OK
		}
		await loadPlayers(true); // 스피너 있는 표준 로딩
	}

	const handleAddSheetPlayers = async (e) => {
		e.preventDefault();
		const ta = element.querySelector('#sheet-player-names');
		const raw = (ta?.value || "").trim();
		if (raw.length === 0) { updateStatus('error', '이름을 입력하세요.'); render(); return; }

		const names = Array.from(new Set(raw.split(/[\n,]/g).map(s => s.trim()).filter(Boolean)));
		const existingLower = new Set(localPlayers.map(p => (p.name || '').toLowerCase()));
		const unique = names.filter(n => !existingLower.has(n.toLowerCase()));
		if (unique.length === 0) { updateStatus('info', '새로 추가할 선수가 없습니다.'); render(); return; }

		try {
			isLoading = true; render();
			// 한 번의 addPlayers에 몰아서 처리(429 방지)
			await GoogleApi.addPlayers(unique.map(name => ({ name })));

			// 중요: 여기서 isLoading을 내려야 loadPlayers 가드에 안 걸림
			isLoading = false;
			await loadPlayers(false); // 스피너 없이 즉시 목록 재빌드
			updateStatus('success', `${unique.length}명 추가됨. 체크박스로 선택하세요.`);
			ta.value = '';
		} catch (err) {
			isLoading = false;
			updateStatus('error', `선수 추가 실패: ${err.message || err}`);
			render();
		}
	};

    const attachEventListeners = () => {
		element.querySelector('#show-quick-match-btn')?.addEventListener('click', () => { currentView = 'quick'; render(); });
		element.querySelectorAll('.back-btn').forEach(btn => btn.addEventListener('click', (e) => {
			currentView = e.target.dataset.target;
			selectedPlayers = [];
			render();
		}));

		element.querySelector('#google-signin-btn')?.addEventListener('click', () => GoogleApi.signIn());
	
		element.querySelector('#ensure-sheet-btn')?.addEventListener('click', () => connectSheet(true));
		element.querySelector('#pick-sheet-btn')?.addEventListener('click', () => connectSheet(false));
		element.querySelector('#cancel-loading-btn')?.addEventListener('click', () => {
			isLoading = false;
			updateStatus('info', '작업을 취소했습니다.');
			render();
		});
		
		// ✅ 정규 모드: 시트에 선수 추가 / 열기 / 새로고침
		element.querySelector('#add-sheet-players-form')?.addEventListener('submit', handleAddSheetPlayers);
		element.querySelector('#open-sheet-btn')?.addEventListener('click', () => {
			const id = getState()?.spreadsheetId;
			if (id) window.open(`https://docs.google.com/spreadsheets/d/${id}/edit`, '_blank', 'noopener,noreferrer');
		});
		element.querySelector('#refresh-players-btn')?.addEventListener('click', () => loadPlayers());

		element.querySelectorAll('.player-checkbox').forEach(box => box.addEventListener('change', (e) => handlePlayerCheckboxChange(e)));
		element.querySelector('#add-temp-player-form')?.addEventListener('submit', (e) => handleAddTempPlayer(e));

		const selList = element.querySelector('#selected-players-list');
		selList?.addEventListener('click', (e) => {
			const btn = e.target.closest('.remove-player-btn');
			if (!btn) return;
			const idx = parseInt(btn.dataset.index, 10);
			const removed = selectedPlayers.splice(idx, 1)[0];
			if (removed?.player_id) {
				const cb = element.querySelector(`.player-checkbox[data-player-id="${removed.player_id}"]`);
				if (cb) cb.checked = false;
			}
			btn.parentElement?.remove();
			rebuildSelectedListIndices();
			updateSelectionHUD();
		});

		element.querySelectorAll('.start-match-btn').forEach(btn => btn.addEventListener('click', () => startMatch()));
	};

    const connectSheet = async (allowCreateOrPick) => {
		if (isLoading === true) return;
		isLoading = true; render();
		try {
			const label = allowCreateOrPick ? '시트 생성/보장' : '시트 선택';
			const actionPromise = allowCreateOrPick
				? GoogleApi.ensureSpreadsheetId({ allowCreate: true })
				: GoogleApi.openSpreadsheetPicker();

			// ⏱ 20초 타임아웃 (네트워크/권한 지연 대비)
			const id = await withTimeout(actionPromise, 20000, label);

			// 구조 보장도 타임아웃으로 감싼다(드물게 지연되는 경우)
			if (typeof GoogleApi.prepareCurrentSpreadsheet === 'function') {
				await withTimeout(GoogleApi.prepareCurrentSpreadsheet(), 15000, '시트 구조 보장');
			}

			// 통일된 진입
			await enterRegularMode(id);
		} catch (err) {
			updateStatus('error', `시트 연결 실패: ${err.message || err}`);
			// 실패 시 시트 선택 화면 유지
			currentView = 'sheet';
		} finally {
			isLoading = false;
			render();
		}
	};
    
	function reconcileSelection() {
		const poolById = new Map(localPlayers.map(p => [String(p.player_id), p]));
		selectedPlayers = selectedPlayers
			.map(s => poolById.get(String(s.player_id)))
			.filter(Boolean);
	}

	async function fetchPlayersCore() {
		const list = await GoogleApi.getPlayers();
		localPlayers = Array.isArray(list) ? list : [];
		// 기존 선택 정합성만 유지(자동 선택 금지)
		const poolById = new Map(localPlayers.map(p => [String(p.player_id), p]));
		selectedPlayers = selectedPlayers
			.map(s => poolById.get(String(s.player_id)))
			.filter(Boolean);
	}

	const loadPlayers = async (showSpinner = true) => {
		// 스피너를 쓰지 않는 강제 리프레시도 허용
		if (showSpinner === true) {
			if (isLoading === true) return;
			isLoading = true; render();
		}
		try {
			await fetchPlayersCore();
			updateStatus('success', `총 ${localPlayers.length}명의 선수를 불러왔습니다.`);
		} catch (err) {
			updateStatus('error', `선수 목록 로딩 실패: ${err.message}`);
			console.error("선수 데이터 로딩 에러:", err);
		} finally {
			if (showSpinner === true) { isLoading = false; render(); }
			else { render(); }
		}
	};
    
	const handlePlayerCheckboxChange = (e) => {
		const cb = e.target;
		const playerId = cb.dataset.playerId;
		if (cb.checked) {
		const player = localPlayers.find(p => p.player_id === playerId);
		if (player && !selectedPlayers.some(p => p.player_id === playerId)) {
			selectedPlayers.push(player);
			addSelectedPlayerDOM(player);
			rebuildSelectedListIndices();
		}
		} else {
		const idx = selectedPlayers.findIndex(p => p.player_id === playerId);
		if (idx > -1) {
			selectedPlayers.splice(idx, 1);
			const ul = element.querySelector('#selected-players-list');
			ul?.children[idx]?.remove();
			rebuildSelectedListIndices();
		}
		}
		updateSelectionHUD();
	};

	const handleAddTempPlayer = (e) => {
		e.preventDefault();
		const input = e.target.querySelector('#temp-player-name');
		const name = (input.value || '').trim();
		if (!name) return;
		if (selectedPlayers.some(p => p.name.toLowerCase() === name.toLowerCase())) {
		  updateStatus('error', '이미 명단에 추가된 이름입니다.');
		  return;
		}
		const player = { name, player_id: `temp_${Date.now()}` };
		selectedPlayers.push(player);
		addSelectedPlayerDOM(player);
		rebuildSelectedListIndices();
		updateSelectionHUD();
		input.value = '';
	};

    const handleRemovePlayer = (e) => {
        const indexToRemove = parseInt(e.target.dataset.index, 10);
        selectedPlayers.splice(indexToRemove, 1);
        render();
    };

    const startMatch = () => {
        if (selectedPlayers.length < 3) {
            updateStatus('error', '매치를 시작하려면 최소 3명 이상의 선수가 필요합니다.'); render(); return;
        }
        setState({ players: selectedPlayers });
        window.location.hash = '/match';
    };

    const updateStatus = (type, message) => { status = { type, message }; };

    if (getState().spreadsheetId) {
		// 저장된 시트가 있으면 동일 함수로만 진입
		enterRegularMode(getState().spreadsheetId);
	} else {
		render();
	}
    render();
    return element;
}