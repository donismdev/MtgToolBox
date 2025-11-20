
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
            ${currentView !== 'initial' ? `<button class="back-btn secondary-btn small-btn" data-target="initial">${window.i18n.t('backToStart')}</button>` : ''}
            <h2>${window.i18n.t('participantSettings')}</h2>
            <div class="status-bar ${status.type}">${status.message}</div>
            <div class="view-content">
                ${content}
            </div>
        `;
        attachEventListeners();
    };


    const renderInitialView = () => `
        <div class="initial-buttons">
            <button id="show-quick-match-btn" class="secondary-btn">${window.i18n.t('startQuickMatch')}</button>
            <button id="google-signin-btn" class="primary-btn">${window.i18n.t('startRegularMatch')}</button>
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
			<h3>${isRegular ? window.i18n.t('regularMatch') : window.i18n.t('quickMatch')}: ${window.i18n.t('participantSettings')}</h3>
			<p>${isRegular ? window.i18n.t('regularMatchDesc') : window.i18n.t('quickMatchDesc')}</p>

			${isRegular ? `
				<!-- ✅ 항상 노출되는 "시트에 선수 추가" 폼 -->
				<form id="add-sheet-players-form" class="inline-add">
					<label for="sheet-player-names"><strong>${window.i18n.t('addPlayer')}</strong> ${window.i18n.t('addMultiplePlayers')}</label>
					<textarea id="sheet-player-names" rows="2" placeholder="${window.i18n.t('playerAddExample')}"></textarea>
					<div class="actions">
						<button type="submit" class="primary-btn" ${isLoading ? 'disabled' : ''}>${window.i18n.t('addToSheet')}</button>
						<button type="button" id="open-sheet-btn" class="secondary-btn" ${ssId ? "" : "disabled"}>${window.i18n.t('openSpreadsheet')}</button>
						<button type="button" id="refresh-players-btn" class="secondary-btn" ${isLoading ? 'disabled' : ''}>${window.i18n.t('refreshList')}</button>
					</div>
				</form>

				<p class="muted">${isLoading ? window.i18n.t('loadingPlayerList') : window.i18n.t('totalPlayers', { count: localPlayers.length })}</p>

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
					<input type="text" id="temp-player-name" placeholder="${window.i18n.t('enterNameAndAdd')}" autocomplete="off">
					<button type="submit">${window.i18n.t('addToList')}</button>
				</form>
			`}

			<h4 id="selected-count">${window.i18n.t('participantList', { count: selectedPlayers.length })}</h4>
			<ul id="selected-players-list">
				${selectedPlayers.length === 0 ? `<li>${window.i18n.t('addPlayersPrompt')}</li>` : ''}
				${selectedPlayers.map((p, index) => `
					<li>
						<span>${p.name}</span>
						<button class="remove-player-btn" data-index="${index}">X</button>
					</li>
				`).join('')}
			</ul>

			<button id="start-match-btn" class="start-match-btn primary-btn" ${selectedPlayers.length < 3 ? 'disabled' : ''}>
				${window.i18n.t('startMatchSetup', { count: selectedPlayers.length })}
			</button>
		`;
	};

    // --- 이하 나머지 함수들은 이전과 동일합니다 ---

    const renderSheetManager = () => `
		<h3>${window.i18n.t('selectSpreadsheetTitle')}</h3>
		<p>${window.i18n.t('selectSpreadsheetDesc')}</p>
		<div class="actions">
			<button id="ensure-sheet-btn" class="primary-btn" ${isLoading ? 'disabled' : ''}>
				${isLoading ? window.i18n.t('creatingSheet') : window.i18n.t('createConnectSheet')}
			</button>
			<button id="pick-sheet-btn" class="secondary-btn" ${isLoading ? 'disabled' : ''}>
				${window.i18n.t('selectExistingSheet')}
			</button>
			${isLoading ? `<button id="cancel-loading-btn" class="secondary-btn danger-btn">${window.i18n.t('cancel')}</button>` : ''}
		</div>
	`;

	function withTimeout(promise, ms, label = '작업') {
	return new Promise((resolve, reject) => {
		const timer = setTimeout(() => reject(new Error(`${window.i18n.t(label)} ${window.i18n.t('timeout', { ms: ms })}`)), ms);
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
		if (raw.length === 0) { updateStatus('error', window.i18n.t('enterName')); render(); return; }

		const names = Array.from(new Set(raw.split(/[\n,]/g).map(s => s.trim()).filter(Boolean)));
		const existingLower = new Set(localPlayers.map(p => (p.name || '').toLowerCase()));
		const unique = names.filter(n => !existingLower.has(n.toLowerCase()));
		if (unique.length === 0) { updateStatus('info', window.i18n.t('noNewPlayers')); render(); return; }

		try {
			isLoading = true; render();
			// 한 번의 addPlayers에 몰아서 처리(429 방지)
			await GoogleApi.addPlayers(unique.map(name => ({ name })));

			// 중요: 여기서 isLoading을 내려야 loadPlayers 가드에 안 걸림
			isLoading = false;
			await loadPlayers(false); // 스피너 없이 즉시 목록 재빌드
			updateStatus('success', window.i18n.t('playersAdded', { count: unique.length }));
			ta.value = '';
		} catch (err) {
			isLoading = false;
			updateStatus('error', `${window.i18n.t('addPlayerFailed', { error: err.message || err })}`);
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
			updateStatus('info', window.i18n.t('operationCanceled'));
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
			const label = allowCreateOrPick ? 'createEnsureSheet' : 'selectSheet';
			const actionPromise = allowCreateOrPick
				? GoogleApi.ensureSpreadsheetId({ allowCreate: true })
				: GoogleApi.openSpreadsheetPicker();

			// ⏱ 20초 타임아웃 (네트워크/권한 지연 대비)
			const id = await withTimeout(actionPromise, 20000, label);

			// 구조 보장도 타임아웃으로 감싼다(드물게 지연되는 경우)
			if (typeof GoogleApi.prepareCurrentSpreadsheet === 'function') {
				await withTimeout(GoogleApi.prepareCurrentSpreadsheet(), 15000, 'ensureSheetStructure');
			}

			// 통일된 진입
			await enterRegularMode(id);
		} catch (err) {
			updateStatus('error', window.i18n.t('sheetConnectFailed', { error: err.message || err }));
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
			updateStatus('success', window.i18n.t('totalPlayersLoaded', { count: localPlayers.length }));
		} catch (err) {
			updateStatus('error', window.i18n.t('loadPlayersFailed', { error: err.message }));
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
		  updateStatus('error', window.i18n.t('nameAlreadyExists'));
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
            updateStatus('error', window.i18n.t('min3Players')); render(); return;
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