import { setState, getState } from '../config.js';
import * as GoogleApi from '../api/google.js';

export default function PlayerView() {
    const element = document.createElement('div');
    element.id = 'player-view-container';

    // --- 뷰의 내부 상태 ---
    let localPlayers = [];
    let selectedPlayers = [];
    let status = { type: 'info', message: '환영합니다! 경기 방식을 선택해주세요.' };
    
    let isConnectingSheet = false;
    let isAddingPlayer = false;
    let isLoadingPlayers = false;

    // --- 렌더링 함수 ---
    const render = () => {
        const { isSignedIn, spreadsheetId } = getState();
        if (spreadsheetId && localPlayers.length === 0 && !isLoadingPlayers) {
            setTimeout(loadPlayers, 0);
        }
        element.innerHTML = `
            <h2>참가자 설정</h2>

            ${spreadsheetId ? `
                <div class="sheet-info-bar">
                    <span><strong>연결된 시트:</strong> ${spreadsheetId.slice(0, 20)}...</span>
                    <button id="pick-sheet-btn" class="secondary-btn small-btn">다른 시트 선택</button>
                </div>
            ` : ''}

            <div class="status-bar ${status.type}">${status.message}</div>

            <div class="mode-container">
                <div class="mode-section">
                    <h3>임시 경기 (로그인 불필요)</h3>
                    <p>플레이어 이름을 직접 입력하여 참가 명단을 구성합니다.</p>
                    ${renderParticipantManager('temp')}
                </div>
                <div class="mode-section">
                    <h3>정규 경기 (Google 시트 연동)</h3>
                    ${!isSignedIn 
                        ? `<p>Google 계정으로 로그인하여 모든 기록을 시트에 저장하세요.</p><button id="google-signin-btn" class="primary-btn">Google 계정으로 로그인</button>`
                        : renderSheetManager({ spreadsheetId })
                    }
                </div>
            </div>
            <style>
                .mode-container { display: flex; gap: 2rem; align-items: flex-start; }
                .mode-section { flex: 1; padding: 1.5rem; border: 1px solid #ddd; border-radius: 8px; }
                .sheet-info-bar { display: flex; justify-content: space-between; align-items: center; padding: 0.75rem 1rem; background-color: #f0f8ff; border: 1px solid #add8e6; border-radius: 8px; margin-bottom: 1rem; }
                #selected-players-list { list-style-type: none; padding: 0; margin-top: 1rem; }
                #selected-players-list li { display: flex; justify-content: space-between; align-items: center; padding: 0.5rem; border-bottom: 1px solid #eee; }
                .remove-player-btn { background: #ff4d4d; color: white; border: none; cursor: pointer; border-radius: 4px; padding: 2px 6px;}
                /* ★★★ 수정: 작은 버튼을 위한 CSS 추가 ★★★ */
                .small-btn { padding: 0.25rem 0.6rem; font-size: 0.8em; vertical-align: middle; }
            </style>
        `;
        attachEventListeners();
    };
    
    const renderSheetManager = ({ spreadsheetId }) => {
        if (!spreadsheetId) {
            return `
                <p>데이터를 저장할 스프레드시트를 선택하거나 생성하세요.</p>
                <button id="ensure-sheet-btn" class="primary-btn" ${isConnectingSheet ? 'disabled' : ''}>${isConnectingSheet ? '시트 생성 중...' : '새 시트 생성/연결'}</button>
                <button id="pick-sheet-btn" class="secondary-btn">기존 시트 선택</button>
            `;
        }
        return `
            <div class="section">
                <h4>신규 플레이어 등록</h4>
                <form id="add-player-form">
                    <input type="text" id="new-player-name" placeholder="새 플레이어 이름 입력" ${isAddingPlayer ? 'disabled' : ''}>
                    <button type="submit" ${isAddingPlayer ? 'disabled' : ''}>${isAddingPlayer ? '추가 중...' : '시트에 추가'}</button>
                </form>
            </div>
            <hr>
            ${renderParticipantManager('regular')}
        `;
    };

    const renderParticipantManager = (mode) => {
        const isRegular = mode === 'regular';
        return `
            <div class="participant-manager">
                ${isRegular ? `
                    <p>${isLoadingPlayers ? '선수 목록 로딩 중...' : `${localPlayers.length}명의 선수가 로드됨.`} <button id="reload-players-btn" class="small-btn">새로고침</button></p>
                    <form id="select-player-form">
                        <label for="player-search">참가할 플레이어 선택:</label>
                        <input type="text" id="player-search" list="player-datalist" placeholder="이름으로 검색..." autocomplete="off">
                        <datalist id="player-datalist">${localPlayers.map(p => `<option value="${p.name}"></option>`).join('')}</datalist>
                        <button type="submit">명단에 추가</button>
                    </form>
                ` : `
                    <form id="add-temp-player-form">
                        <label for="temp-player-name">참가할 플레이어 이름:</label>
                        <input type="text" id="temp-player-name" placeholder="이름 입력 후 추가">
                        <button type="submit">명단에 추가</button>
                    </form>
                `}
                
                <h4>참가 명단 (${selectedPlayers.length}명)</h4>
                <ul id="selected-players-list">
                    ${selectedPlayers.length === 0 ? `<li>참가할 선수를 추가해주세요.</li>` : ''}
                    ${selectedPlayers.map((p, index) => `
                        <li>
                            <span>${p.name} ${p.player_id.startsWith('temp_') ? '(임시)' : `(ID:${p.player_id})`}</span>
                            <button class="remove-player-btn" data-index="${index}">X</button>
                        </li>
                    `).join('')}
                </ul>
                <button class="start-match-btn primary-btn" ${selectedPlayers.length < 3 ? 'disabled' : ''}>${selectedPlayers.length}명으로 매치 설정 시작</button>
            </div>
        `;
    };

    const attachEventListeners = () => {
        element.querySelector('#google-signin-btn')?.addEventListener('click', () => GoogleApi.signIn());
        element.querySelector('#ensure-sheet-btn')?.addEventListener('click', () => connectSheet(true));
        element.querySelector('#pick-sheet-btn')?.addEventListener('click', () => connectSheet(false));
        element.querySelector('#reload-players-btn')?.addEventListener('click', () => loadPlayers());
        element.querySelector('#add-player-form')?.addEventListener('submit', (e) => handleAddPlayerToSheet(e));
        element.querySelector('#select-player-form')?.addEventListener('submit', (e) => handleSelectPlayer(e));
        element.querySelector('#add-temp-player-form')?.addEventListener('submit', (e) => handleAddTempPlayer(e));
        element.querySelectorAll('.remove-player-btn').forEach(btn => btn.addEventListener('click', (e) => handleRemovePlayer(e)));
        element.querySelectorAll('.start-match-btn').forEach(btn => btn.addEventListener('click', () => startMatch()));
    };

    const connectSheet = async (allowCreateOrPick) => {
        isConnectingSheet = true; render();
        try {
            const id = allowCreateOrPick ? await GoogleApi.ensureSpreadsheetId({ allowCreate: true }) : await GoogleApi.openSpreadsheetPicker();
            setState({ spreadsheetId: id });
            localPlayers = [];
            selectedPlayers = [];
            await loadPlayers();
        } catch (err) {
            updateStatus('error', `시트 연결 실패: ${err.message}`);
        } finally {
            isConnectingSheet = false; render();
        }
    };
    
    const loadPlayers = async () => {
        if (isLoadingPlayers) return;
        isLoadingPlayers = true;
        updateStatus('info', '선수 목록을 불러오는 중...');
        render();
        try {
            localPlayers = await GoogleApi.getPlayers();
            updateStatus('success', `총 ${localPlayers.length}명의 선수를 불러왔습니다.`);
        } catch (err) {
            updateStatus('error', `선수 목록 로딩 실패: ${err.message}`);
        } finally {
            isLoadingPlayers = false;
            render();
        }
    };

    const handleAddPlayerToSheet = async (e) => {
        e.preventDefault();
        if (isAddingPlayer) return;
        const input = e.target.querySelector('#new-player-name');
        const playerName = input.value.trim();
        if (!playerName) {
            updateStatus('error', '추가할 플레이어의 이름을 입력하세요.');
            render(); return;
        }
        if (localPlayers.some(p => p.name.toLowerCase() === playerName.toLowerCase())) {
            updateStatus('error', `"${playerName}" 선수는 이미 시트에 등록되어 있습니다.`);
            render(); return;
        }
        isAddingPlayer = true; render();
        try {
            await GoogleApi.addPlayers([{ name: playerName }]);
            input.value = '';
            updateStatus('success', `✅ "${playerName}" 선수를 시트에 추가했습니다. 목록을 새로고침합니다.`);
            await loadPlayers();
        } catch (err) {
            updateStatus('error', `선수 추가 실패: ${err.message}`);
        } finally {
            isAddingPlayer = false; render();
        }
    };
    
    const handleSelectPlayer = (e) => {
        e.preventDefault();
        const input = e.target.querySelector('#player-search');
        const playerName = input.value.trim();
        if (!playerName) return;
        const player = localPlayers.find(p => p.name.toLowerCase() === playerName.toLowerCase());
        if (!player) {
            updateStatus('error', '등록되지 않은 이름입니다. 목록에서 선택하거나 새로 등록해주세요.');
            render(); return;
        }
        if (selectedPlayers.some(p => p.player_id === player.player_id)) {
            updateStatus('error', '이미 명단에 추가된 선수입니다.');
            render(); return;
        }
        selectedPlayers.push(player);
        input.value = '';
        render();
    };

    const handleAddTempPlayer = (e) => {
        e.preventDefault();
        const input = e.target.querySelector('#temp-player-name');
        const playerName = input.value.trim();
        if (!playerName) return;
        if (selectedPlayers.some(p => p.name.toLowerCase() === playerName.toLowerCase())) {
            updateStatus('error', '이미 명단에 추가된 이름입니다.');
            render(); return;
        }
        selectedPlayers.push({ name: playerName, player_id: `temp_${Date.now()}` });
        input.value = '';
        render();
    };

    const handleRemovePlayer = (e) => {
        const indexToRemove = parseInt(e.target.dataset.index, 10);
        selectedPlayers.splice(indexToRemove, 1);
        render();
    };

    const startMatch = () => {
        if (selectedPlayers.length < 3) {
            updateStatus('error', '매치를 시작하려면 최소 3명 이상의 선수가 필요합니다.');
            render(); return;
        }
        setState({ players: selectedPlayers });
        window.location.hash = '/match';
    };

    const updateStatus = (type, message) => { status = { type, message }; };

    if (getState().spreadsheetId) {
        setTimeout(loadPlayers, 0);
    }
    render();
    return element;
}