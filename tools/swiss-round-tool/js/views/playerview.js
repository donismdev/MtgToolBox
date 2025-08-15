
import { setState, getState } from '../config.js';
import * as GoogleApi from '../api/google.js';

export default function PlayerView() {
    const element = document.createElement('div');
    element.id = 'player-view-container';

    // --- 뷰의 내부 상태 (이전과 동일) ---
    let localPlayers = [];
    let selectedPlayers = [];
    let status = { type: 'info', message: '환영합니다! 경기 방식을 선택해주세요.' };
    let currentView = 'initial';
    let isLoading = false;

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

	/*
    const render = () => {
        const { isSignedIn, spreadsheetId } = getState();

        if (currentView === 'initial' && isSignedIn) {
            currentView = spreadsheetId ? 'regular' : 'sheet';
        }

        let content = '';
        switch (currentView) {
            case 'quick':
                content = renderParticipantManager('temp');
                break;
            case 'sheet':
                content = renderSheetManager();
                break;
            case 'regular':
                content = renderParticipantManager('regular');
                break;
            case 'initial':
            default:
                content = renderInitialView();
                break;
        }

        element.innerHTML = `
            ${currentView !== 'initial' ? `<button class="back-btn secondary-btn small-btn" data-target="initial">← 처음으로</button>` : ''}
            <h2>참가자 설정</h2>
            <div class="status-bar ${status.type}">${status.message}</div>
            <div class="view-content">
                ${content}
            </div>
            
            <style>
                .view-content { padding: 1.5rem; border: 1px solid #ddd; border-radius: 8px; margin-top: 1rem; }
                .initial-buttons { display: flex; flex-direction: column; gap: 1.5rem; }
                .initial-buttons button { padding: 1.5rem; font-size: 1.2em; }
                #selected-players-list { list-style-type: none; padding: 0; margin-top: 1rem; }
                
                #selected-players-list li { 
                    display: flex; 
                    align-items: center;
                    gap: 8px;
                    padding: 0.5rem; 
                    border-bottom: 1px solid #eee; 
                }
                #selected-players-list li span { 
                    flex: 1 1 auto;
                    white-space: nowrap; 
                    overflow: hidden; 
                    text-overflow: ellipsis;
                    color: #1c1e21;
                }
                .remove-player-btn { 
                    flex: 0 0 auto;
                    background: #ff4d4d; 
                    color: white; 
                    border: none; 
                    cursor: pointer; 
                    border-radius: 4px; 
                    padding: 2px 8px; 
                    font-size: 0.8em; 
                }
                
                .small-btn { padding: 0.25rem 0.6rem; font-size: 0.8em; vertical-align: middle; }
                .back-btn { margin-bottom: 1rem; }

                .player-pool-list {
                    max-height: 250px;
                    overflow-y: auto;
                    border: 1px solid #ccc;
                    border-radius: 4px;
                    padding: 0.5rem;
                    margin: 1rem 0;
                }
                .player-pool-list label {
                    display: flex;
                    align-items: center;
                    padding: 0.6rem;
                    cursor: pointer;
                    border-radius: 4px;
                    color: #1c1e21;
                }
                .player-pool-list label:hover {
                    background-color: #f0f0f0;
                }
                .player-pool-list input[type="checkbox"] {
                    transform: scale(1.4);
                    margin-right: 1rem;
                    flex-shrink: 0;
                }
            </style>
        `;
        attachEventListeners();
    };
	*/

    const renderInitialView = () => `
        <div class="initial-buttons">
            <button id="show-quick-match-btn" class="secondary-btn">빠른 경기 시작 (로그인 불필요)</button>
            <button id="google-signin-btn" class="primary-btn">Google 로그인 (정규 경기 시작)</button>
        </div>
    `;

    const renderParticipantManager = (mode) => {
        const isRegular = mode === 'regular';
        
        if (isRegular && localPlayers.length === 0 && !isLoading) {
            setTimeout(loadPlayers, 0);
        }

        const sortedPlayerPool = [...localPlayers].sort((a, b) => a.name.localeCompare(b.name));

        return `
            <h3>${isRegular ? '정규 경기' : '빠른 경기'}: 참가 명단 구성</h3>
            <p>${isRegular ? '시트에 등록된 선수를 선택하여 명단에 추가하세요.' : '참가할 선수의 이름을 직접 입력하여 명단에 추가하세요.'}</p>
            
            ${isRegular ? `
                <p>${isLoading ? '선수 목록 로딩 중...' : `총 ${localPlayers.length}명의 선수가 있습니다.`}</p>

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
            
            <h4>참가 명단 (${selectedPlayers.length}명)</h4>
            <ul id="selected-players-list">
                ${selectedPlayers.length === 0 ? `<li>참가할 선수를 추가해주세요. (최소 3명)</li>` : ''}
                ${selectedPlayers.map((p, index) => `
                    <li>
                        <span>${p.name}</span>
                        <button class="remove-player-btn" data-index="${index}">X</button>
                    </li>
                `).join('')}
            </ul>
            <button class="start-match-btn primary-btn" ${selectedPlayers.length < 3 ? 'disabled' : ''}>${selectedPlayers.length}명으로 매치 설정 시작</button>
        `;
    };

    // --- 이하 나머지 함수들은 이전과 동일합니다 ---

    const renderSheetManager = () => `
        <h3>정규 경기: 스프레드시트 선택</h3>
        <p>데이터를 저장할 스프레드시트를 선택하거나 생성하세요.</p>
        <button id="ensure-sheet-btn" class="primary-btn" ${isLoading ? 'disabled' : ''}>${isLoading ? '시트 생성 중...' : '새 시트 생성/연결'}</button>
        <button id="pick-sheet-btn" class="secondary-btn" ${isLoading ? 'disabled' : ''}>기존 시트 선택</button>
    `;

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
        
        element.querySelectorAll('.player-checkbox').forEach(box => box.addEventListener('change', (e) => handlePlayerCheckboxChange(e)));
        element.querySelector('#add-temp-player-form')?.addEventListener('submit', (e) => handleAddTempPlayer(e));

        element.querySelectorAll('.remove-player-btn').forEach(btn => btn.addEventListener('click', (e) => handleRemovePlayer(e)));
        element.querySelectorAll('.start-match-btn').forEach(btn => btn.addEventListener('click', () => startMatch()));
    };

    const connectSheet = async (allowCreateOrPick) => {
        isLoading = true; render();
        try {
            const id = allowCreateOrPick ? await GoogleApi.ensureSpreadsheetId({ allowCreate: true }) : await GoogleApi.openSpreadsheetPicker();
            setState({ spreadsheetId: id });
            localPlayers = [];
            selectedPlayers = [];
            currentView = 'regular';
        } catch (err) {
            updateStatus('error', `시트 연결 실패: ${err.message}`);
        } finally {
            isLoading = false; render();
        }
    };
    
	const loadPlayers = async () => {
		if (isLoading) return;
		isLoading = true; render();
		try {
			localPlayers = await GoogleApi.getPlayers();
			
			// ✨✨✨ 문제 해결을 위한 핵심 진단 코드 ✨✨✨
			// 구글 시트에서 받아온 원본 데이터가 어떤 모양인지 확인합니다.
			console.log("구글 시트에서 받아온 선수 데이터:", localPlayers); 
			
			updateStatus('success', `총 ${localPlayers.length}명의 선수를 불러왔습니다.`);
		} catch (err) {
			updateStatus('error', `선수 목록 로딩 실패: ${err.message}`);
			console.error("선수 데이터 로딩 에러:", err); // 에러도 함께 출력
		} finally {
			isLoading = false; render();
		}
	};
    
    const handlePlayerCheckboxChange = (e) => {
        const checkbox = e.target;
        const playerId = checkbox.dataset.playerId;
        
        if (checkbox.checked) {
            const playerToAdd = localPlayers.find(p => p.player_id === playerId);
            if (playerToAdd && !selectedPlayers.some(p => p.player_id === playerId)) {
                selectedPlayers.push(playerToAdd);
            }
        } else {
            const indexToRemove = selectedPlayers.findIndex(p => p.player_id === playerId);
            if (indexToRemove > -1) {
                selectedPlayers.splice(indexToRemove, 1);
            }
        }
        render();
    };

    const handleAddTempPlayer = (e) => {
        e.preventDefault();
        const input = e.target.querySelector('#temp-player-name');
        const playerName = input.value.trim();
        if (!playerName) return;
        if (selectedPlayers.some(p => p.name.toLowerCase() === playerName.toLowerCase())) {
            updateStatus('error', '이미 명단에 추가된 이름입니다.'); render(); return;
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
            updateStatus('error', '매치를 시작하려면 최소 3명 이상의 선수가 필요합니다.'); render(); return;
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