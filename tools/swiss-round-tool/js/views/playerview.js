import { setState, getState } from '../config.js';
import * as GoogleApi from '../api/google.js';

export default function PlayerView() {
    const element = document.createElement('div');
    element.id = 'player-view-container';

    // --- 뷰의 내부 상태 ---
    const { isSignedIn, meta } = getState();
    const spreadsheetId = GoogleApi.getCurrentSpreadsheetId();
    let localPlayers = [];
    let selectedPlayers = [];
    let status = { type: 'info', message: '환영합니다! 모드를 선택해주세요.' };
    
    // ★★★ 수정된 부분 1: 로딩 상태를 관리할 변수 추가 ★★★
    let isConnectingSheet = false;

    // --- 렌더링 함수 ---

    const render = () => {
        element.innerHTML = `
            <h2>참가자 설정</h2>
            <div class="status-bar ${status.type}">${status.message}</div>
            ${!isSignedIn ? renderLoginView() : renderRegularMatchView()}
        `;
        attachEventListeners();
    };

    const renderLoginView = () => `
        <div class="section">
            <p>정규 경기를 진행하려면 Google 계정으로 로그인해야 합니다.</p>
            <button id="google-signin-btn" class="primary-btn">Google 계정으로 로그인</button>
            <hr>
            <p>또는, 로그인이 필요 없는 임시 경기를 진행할 수 있습니다.</p>
            <form id="temp-match-form">
                <label for="player-count">임시 참가 인원:</label>
                <input type="number" id="player-count" min="4" value="4" required>
                <button type="submit" class="secondary-btn">임시 경기로 시작</button>
            </form>
        </div>
    `;

    // ★★★ 수정된 부분 2: 로딩 상태에 따라 버튼을 비활성화하고 텍스트 변경 ★★★
    const renderRegularMatchView = () => `
        <div class="section">
            <h3>1. 스프레드시트 연결</h3>
            ${!spreadsheetId ? `
                <p>데이터를 저장할 스프레드시트를 선택하거나 생성하세요.</p>
                <button id="ensure-sheet-btn" class="primary-btn" ${isConnectingSheet ? 'disabled' : ''}>
                    ${isConnectingSheet ? '시트 생성 및 연결 중...' : '시트 연결 및 확인'}
                </button>
                <button id="pick-sheet-btn" class="secondary-btn" ${isConnectingSheet ? 'disabled' : ''}>기존 시트 선택</button>
            ` : `
                <p>✅ 연결된 시트: <strong>${meta?.spreadsheetId || spreadsheetId}</strong></p>
                <button id="disconnect-sheet-btn" class="secondary">다른 시트 선택</button>
            `}
        </div>
        ${spreadsheetId ? renderPlayerManagementView() : ''}
    `;
    
    const renderPlayerManagementView = () => `
        <div class="section">
            <h3>2. 새 플레이어 등록</h3>
            <form id="add-player-form">
                <label for="player-names">새 플레이어 이름 (쉼표(,)로 여러 명 동시 등록 가능)</label>
                <textarea id="player-names" placeholder="김철수, 이영희, 박지성..." rows="3"></textarea>
                <button type="submit">플레이어 추가</button>
            </form>
        </div>

        <div class="section">
            <h3>3. 토너먼트 참가자 선택</h3>
            <button id="load-players-btn">전체 플레이어 목록 불러오기</button>
            
            <h4>등록된 플레이어 목록</h4>
            <div style="max-height: 200px; overflow-y: auto; border: 1px solid #ddd;">
                <table>
                    <thead><tr><th>ID</th><th>이름</th><th>최초 생성일</th><th>선택</th></tr></thead>
                    <tbody>
                        ${localPlayers.map(p => `
                            <tr>
                                <td>${p.player_id}</td>
                                <td>${p.name}</td>
                                <td>${p.created_date.slice(0, 10)}</td>
                                <td><input type="checkbox" class="player-checkbox" data-player-id="${p.player_id}" 
                                    ${selectedPlayers.some(sp => sp.player_id === p.player_id) ? 'checked' : ''}>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>

            <div id="player-selection-actions" class="${localPlayers.length > 0 ? '' : 'hidden'}">
                <hr>
                <p><strong>선택된 플레이어:</strong> ${selectedPlayers.length}명</p>
                <button id="start-match-btn" class="primary-btn" ${selectedPlayers.length < 2 ? 'disabled' : ''}>
                    매치 설정 시작 (${selectedPlayers.length}명)
                </button>
            </div>
        </div>
    `;
    
    // --- 이벤트 핸들러 ---

    const attachEventListeners = () => {
        element.addEventListener('click', handleViewClick);
        element.addEventListener('submit', handleSubmit);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (e.target.id === 'add-player-form') await handleAddPlayerSubmit();
        if (e.target.id === 'temp-match-form') handleTempMatchSubmit();
    };
    
    const handleViewClick = async (e) => {
        const target = e.target;
        try {
            if (target.id === 'google-signin-btn') GoogleApi.signIn();
            // ★★★ 수정된 부분 3: connectSheet 호출은 그대로 유지, 내부 로직이 변경됨 ★★★
            if (target.id === 'ensure-sheet-btn') await connectSheet(true);
            if (target.id === 'pick-sheet-btn') await connectSheet(false);
            if (target.id === 'disconnect-sheet-btn') disconnectSheet();
            if (target.id === 'load-players-btn') await loadPlayers();
            if (target.id === 'start-match-btn') startMatch();
            if (target.classList.contains('player-checkbox')) handlePlayerSelection(target);
        } catch (err) {
            updateStatus('error', err.message);
            // 에러 발생 시에도 isConnectingSheet가 false로 설정되어야 하므로 connectSheet 내부에서 처리
            render();
        }
    };

    // ★★★ 수정된 부분 4: 시트 연결/생성 함수의 로직을 안정적으로 변경 ★★★
    const connectSheet = async (allowCreate) => {
        if (isConnectingSheet) return; // 중복 실행 방지

        isConnectingSheet = true;
        updateStatus('info', '시트 확인 및 연결 중입니다. 잠시만 기다려주세요...');
        render(); // 로딩 UI 즉시 렌더링 (버튼 비활성화)
        
        try {
            // '시트 연결 및 확인'은 allowCreate=true 이므로 ensureSpreadsheetId를 호출.
            // 이 함수는 폴더, 시트 파일, 4개의 탭, 헤더, 메타데이터까지 모두 자동으로 생성 및 확인합니다.
            const id = allowCreate 
                ? await GoogleApi.ensureSpreadsheetId({ allowCreate: true })
                : await GoogleApi.openSpreadsheetPicker();
            
            // 성공 시, 최신 meta 데이터를 불러와 전역 상태 업데이트
            const newMeta = await GoogleApi.getConfigMap();
            setState({ spreadsheetId: id, meta: newMeta });
            updateStatus('success', `✅ 시트가 성공적으로 준비되었습니다!`);

        } catch (err) {
            // 에러는 상위 핸들러에서 처리하지만, 여기서도 상태 메시지를 업데이트 할 수 있습니다.
            console.error("Sheet connection error:", err);
            updateStatus('error', `시트 연결에 실패했습니다: ${err.message}`);
            throw err; // 에러를 다시 던져서 상위 catch 블록에서 최종 렌더링을 처리하도록 함

        } finally {
            // 성공하든 실패하든, 작업이 끝나면 로딩 상태를 해제
            isConnectingSheet = false;
            // 여기서 render()를 호출하여 성공 시 바뀐 화면을 보여주거나, 실패 시 버튼을 다시 활성화
            render();
        }
    };

    const disconnectSheet = () => {
        GoogleApi.setCurrentSpreadsheetId(null);
        setState({ spreadsheetId: null, meta: null });
        localPlayers = [];
        selectedPlayers = [];
        updateStatus('info', '시트 연결이 해제되었습니다.');
        render();
    };

    const loadPlayers = async () => {
        updateStatus('info', '플레이어 목록 로딩 중...');
        render();
        try {
            localPlayers = await GoogleApi.getPlayers();
            updateStatus('success', `${localPlayers.length}명의 플레이어를 불러왔습니다.`);
        } catch (err) {
            updateStatus('error', `플레이어 로딩 실패: ${err.message}`);
        }
        render();
    };

    const handleAddPlayerSubmit = async () => {
        const namesInput = element.querySelector('#player-names');
        const names = namesInput.value.split(',').map(name => name.trim()).filter(Boolean);
        if (names.length === 0) {
            updateStatus('error', '추가할 플레이어 이름을 입력하세요.');
            render();
            return;
        }

        updateStatus('info', `${names.length}명의 플레이어 추가 중...`);
        render();
        
        try {
            await GoogleApi.addPlayers(names.map(name => ({ name })));
            const newMeta = await GoogleApi.getConfigMap();
            setState({ meta: newMeta });
            updateStatus('success', `${names.length}명 추가 완료. 목록을 다시 불러오세요.`);
            namesInput.value = '';
        } catch (err) {
            updateStatus('error', `플레이어 추가 실패: ${err.message}`);
        }
        render();
    };

    const handlePlayerSelection = (checkbox) => {
        const playerId = checkbox.dataset.playerId;
        if (checkbox.checked) {
            const player = localPlayers.find(p => p.player_id === playerId);
            if (player) selectedPlayers.push(player);
        } else {
            selectedPlayers = selectedPlayers.filter(p => p.player_id !== playerId);
        }
        render();
    };
    
    const startMatch = () => {
        if (selectedPlayers.length < 2) {
            updateStatus('error', '매치를 시작하려면 최소 2명 이상의 플레이어를 선택해야 합니다.');
            render();
            return;
        }
        setState({ players: selectedPlayers });
        window.location.hash = '/match';
    };

    const handleTempMatchSubmit = () => {
        const countInput = element.querySelector('#player-count');
        const count = parseInt(countInput.value, 10);
        if (isNaN(count) || count < 2) {
            updateStatus('error', '참가자는 최소 2명 이상이어야 합니다.');
            render();
            return;
        }
        const players = Array.from({ length: count }, (_, i) => ({ 
            name: `Player ${i + 1}`, 
            player_id: `temp_${i + 1}`
        }));

        let suggestedRounds;
        if (players.length <= 3) {
            suggestedRounds = 2;
        } else if (players.length <= 8) {
            suggestedRounds = 3;
        } else {
            suggestedRounds = Math.ceil(Math.log2(players.length));
        }

        setState({
            players, 
            currentEvent: {
                id: `temp_${Date.now()}`,
                players: players,
                settings: {
                    rounds: suggestedRounds,
                    bestOf: 3,
                    timerMinutes: 50,
                },
                history: [],
            },
            currentRound: 1,
        });
        window.location.hash = '/game';
    };
    
    const updateStatus = (type, message) => {
        status = { type, message };
    };

    // --- 초기 렌더링 ---
    render();
    return element;
}