import { setState, getState } from '../config.js';
import * as GoogleApi from '../api/google.js';

export default function PlayerView() {
    const element = document.createElement('div');
    element.id = 'player-view-container';

    // --- 뷰의 내부 상태 ---
    let localPlayers = [];      // 시트에서 불러온 전체 선수 풀
    let selectedPlayers = [];   // 이번 경기에 참여할 선수 목록
    let status = { type: 'info', message: '환영합니다! 경기 방식을 선택해주세요.' };
    
    // 현재 화면 상태를 관리 ('initial', 'quick', 'sheet', 'regular')
    let currentView = 'initial';
    
    // 로딩 상태
    let isLoading = false;

    // --- 렌더링 로직 ---
    const render = () => {
        const { isSignedIn, spreadsheetId } = getState();

        // 로그인 상태에 따라 초기 뷰를 결정 (로그인하면 바로 시트 선택으로)
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
                #selected-players-list li { display: flex; justify-content: space-between; align-items: center; padding: 0.5rem; border-bottom: 1px solid #eee; }
                .remove-player-btn { background: #ff4d4d; color: white; border: none; cursor: pointer; border-radius: 4px; padding: 2px 6px;}
                .small-btn { padding: 0.25rem 0.6rem; font-size: 0.8em; vertical-align: middle; }
                .back-btn { margin-top: 1rem; }
            </style>
        `;
        attachEventListeners();
    };

    // 1. 첫 화면: 경기 방식 선택
    const renderInitialView = () => `
        <div class="initial-buttons">
            <button id="show-quick-match-btn" class="secondary-btn">빠른 경기 시작 (로그인 불필요)</button>
            <button id="google-signin-btn" class="primary-btn">Google 로그인 (정규 경기 시작)</button>
        </div>
    `;

    // 2-1. 빠른 경기: 참가자 이름 직접 입력
    const renderParticipantManager = (mode) => {
        const isRegular = mode === 'regular';
        
        // 정규 경기일 때만 선수 풀 로드
        if (isRegular && localPlayers.length === 0 && !isLoading) {
            setTimeout(loadPlayers, 0);
        }

        return `
            <button class="back-btn secondary-btn small-btn" data-target="initial">← 처음으로</button>
            <h3>${isRegular ? '정규 경기' : '빠른 경기'}: 참가 명단 구성</h3>
            <p>${isRegular ? '시트에 등록된 선수를 검색하여 명단에 추가하세요.' : '참가할 선수의 이름을 직접 입력하여 명단에 추가하세요.'}</p>
            
            ${isRegular ? `
                <p>${isLoading ? '선수 목록 로딩 중...' : `${localPlayers.length}명의 선수가 로드됨.`} <button id="reload-players-btn" class="small-btn">새로고침</button></p>
                <form id="select-player-form">
                    <input type="text" id="player-search" list="player-datalist" placeholder="이름으로 검색..." autocomplete="off">
                    <datalist id="player-datalist">${localPlayers.map(p => `<option value="${p.name}"></option>`).join('')}</datalist>
                    <button type="submit">명단에 추가</button>
                </form>
            ` : `
                <form id="add-temp-player-form">
                    <input type="text" id="temp-player-name" placeholder="이름 입력 후 추가">
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

    // 2-2. 정규 경기: 시트 선택
    const renderSheetManager = () => `
        <button class="back-btn secondary-btn small-btn" data-target="initial">← 처음으로</button>
        <h3>정규 경기: 스프레드시트 선택</h3>
        <p>데이터를 저장할 스프레드시트를 선택하거나 생성하세요.</p>
        <button id="ensure-sheet-btn" class="primary-btn" ${isLoading ? 'disabled' : ''}>${isLoading ? '시트 생성 중...' : '새 시트 생성/연결'}</button>
        <button id="pick-sheet-btn" class="secondary-btn" ${isLoading ? 'disabled' : ''}>기존 시트 선택</button>
    `;

    // --- 이벤트 핸들러 ---
    const attachEventListeners = () => {
        // 화면 전환 버튼
        element.querySelector('#show-quick-match-btn')?.addEventListener('click', () => { currentView = 'quick'; render(); });
        element.querySelectorAll('.back-btn').forEach(btn => btn.addEventListener('click', (e) => {
            currentView = e.target.dataset.target;
            selectedPlayers = []; // 처음으로 돌아갈 때 명단 초기화
            render();
        }));

        // 기능 버튼
        element.querySelector('#google-signin-btn')?.addEventListener('click', () => GoogleApi.signIn());
        element.querySelector('#ensure-sheet-btn')?.addEventListener('click', () => connectSheet(true));
        element.querySelector('#pick-sheet-btn')?.addEventListener('click', () => connectSheet(false));
        element.querySelector('#reload-players-btn')?.addEventListener('click', () => loadPlayers());
        element.querySelector('#select-player-form')?.addEventListener('submit', (e) => handleSelectPlayer(e));
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
            currentView = 'regular'; // 시트 연결 성공 시, 정규 경기 선수 선택 화면으로 전환
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
            updateStatus('success', `총 ${localPlayers.length}명의 선수를 불러왔습니다.`);
        } catch (err) {
            updateStatus('error', `선수 목록 로딩 실패: ${err.message}`);
        } finally {
            isLoading = false; render();
        }
    };
    
    const handleSelectPlayer = (e) => {
        e.preventDefault();
        const input = e.target.querySelector('#player-search');
        const playerName = input.value.trim();
        if (!playerName) return;
        const player = localPlayers.find(p => p.name.toLowerCase() === playerName.toLowerCase());
        if (!player) {
            updateStatus('error', '등록되지 않은 이름입니다.'); render(); return;
        }
        if (selectedPlayers.some(p => p.player_id === player.player_id)) {
            updateStatus('error', '이미 명단에 추가된 선수입니다.'); render(); return;
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