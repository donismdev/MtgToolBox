import { setState, getState } from '../config.js';
import * as GoogleApi from '../api/google.js';

export default function PlayerView() {
    const element = document.createElement('div');
    element.id = 'player-view-container';

    // --- 뷰의 내부 상태 ---
    let localPlayers = [];
    let selectedPlayers = [];
    let status = { type: 'info', message: '환영합니다! 모드를 선택해주세요.' };
    
    let isConnectingSheet = false;
    let isAddingPlayer = false;
    let isLoadingPlayers = false; 
    let hasLoadedPlayers = false;

    // --- 렌더링 함수 ---
    const render = () => {
        const { isSignedIn, spreadsheetId, meta } = getState();

        if (spreadsheetId && !hasLoadedPlayers && !isLoadingPlayers) {
            setTimeout(loadPlayers, 0);
        }

        element.innerHTML = `
            <h2>참가자 설정</h2>
            <div class="status-bar ${status.type}">${status.message}</div>
            ${!isSignedIn ? renderLoginView() : renderRegularMatchView({ spreadsheetId })}
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

    // ★★★ 수정: 시트 연결 후에는 연결 UI를 숨기고 바로 플레이어 관리 화면을 보여줌
    const renderRegularMatchView = ({ spreadsheetId }) => {
        if (!spreadsheetId) {
            return `
                <div class="section">
                    <h3>스프레드시트 연결</h3>
                    <p>데이터를 저장할 스프레드시트를 선택하거나 생성하세요.</p>
                    <button id="ensure-sheet-btn" class="primary-btn" ${isConnectingSheet ? 'disabled' : ''}>
                        ${isConnectingSheet ? '시트 생성 및 연결 중...' : '시트 자동 생성 및 연결'}
                    </button>
                    <button id="pick-sheet-btn" class="secondary-btn" ${isConnectingSheet ? 'disabled' : ''}>기존 시트 선택</button>
                </div>
            `;
        }
        return renderPlayerManagementView();
    };
    
    // ★★★ 수정: 플레이어 목록 정렬 기능 추가
    const renderPlayerManagementView = () => {
        // 정렬 로직: 1. 마지막 업데이트(참여일) 내림차순, 2. ID 오름차순
        const sortedPlayers = [...localPlayers].sort((a, b) => {
            const dateA = a.last_updated ? new Date(a.last_updated).getTime() : 0;
            const dateB = b.last_updated ? new Date(b.last_updated).getTime() : 0;
            if (dateB !== dateA) return dateB - dateA;
            return parseInt(a.player_id, 10) - parseInt(b.player_id, 10);
        });

        return `
            <div class="section">
                <h3>새 플레이어 등록</h3>
                <form id="add-player-form">
                    <label for="player-names">새 플레이어 이름 (쉼표(,)로 여러 명 동시 등록 가능)</label>
                    <textarea id="player-names" placeholder="김철수, 이영희, 박지성..." rows="3" ${isAddingPlayer ? 'disabled' : ''}></textarea>
                    <button type="submit" ${isAddingPlayer ? 'disabled' : ''}>
                        ${isAddingPlayer ? '추가하는 중...' : '플레이어 추가'}
                    </button>
                </form>
            </div>

            <div class="section">
                <h3>토너먼트 참가자 선택</h3>
                <p>플레이어 목록은 최근 활동 순으로 정렬됩니다.</p>
                
                <h4>등록된 플레이어 목록</h4>
                <div style="max-height: 200px; overflow-y: auto; border: 1px solid #ddd;">
                    ${(isLoadingPlayers) ? `<p>플레이어 목록을 불러오는 중입니다...</p>` : `
                    <table>
                        <thead><tr><th>ID</th><th>이름</th><th>최근 활동일</th><th>선택</th></tr></thead>
                        <tbody>
                            ${sortedPlayers.map(p => `
                                <tr>
                                    <td>${p.player_id}</td>
                                    <td>${p.name}</td>
                                    <td>${p.last_updated ? p.last_updated.slice(0, 10) : p.created_date.slice(0, 10)}</td>
                                    <td><input type="checkbox" class="player-checkbox" data-player-id="${p.player_id}" 
                                        ${selectedPlayers.some(sp => sp.player_id === p.player_id) ? 'checked' : ''}>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>`}
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
    };

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
        if (target.disabled) return;
        
        try {
            if (target.id === 'google-signin-btn') GoogleApi.signIn();
            if (target.id === 'ensure-sheet-btn') await connectSheet(true);
            if (target.id === 'pick-sheet-btn') await connectSheet(false);
            if (target.id === 'start-match-btn') startMatch();
            if (target.classList.contains('player-checkbox')) handlePlayerSelection(target);
        } catch (err) {
            updateStatus('error', err.message);
            render();
        }
    };
    
    const connectSheet = async (allowCreate) => {
        isConnectingSheet = true;
        updateStatus('info', '시트 확인 및 연결 중입니다...');
        render();
        
        try {
            const id = allowCreate 
                ? await GoogleApi.ensureSpreadsheetId({ allowCreate: true })
                : await GoogleApi.openSpreadsheetPicker();
            
            const newMeta = await GoogleApi.getConfigMap();
            setState({ spreadsheetId: id, meta: newMeta });
            updateStatus('info', '시트 연결 완료! 이제 플레이어 목록을 자동으로 불러옵니다.');
        } catch (err) {
            console.error("Sheet connection error:", err);
            updateStatus('error', `시트 연결에 실패했습니다: ${err.message}`);
        } finally {
            isConnectingSheet = false;
            render();
        }
    };

    const loadPlayers = async () => {
        if (isLoadingPlayers) return;

        try {
            isLoadingPlayers = true;
            updateStatus('info', '플레이어 목록을 불러오는 중...');
            render();

            const players = await GoogleApi.getPlayers();
            localPlayers = players;
            hasLoadedPlayers = true;
            updateStatus('success', `총 ${localPlayers.length}명의 플레이어를 불러왔습니다.`);
        } catch (err) {
            hasLoadedPlayers = false;
            updateStatus('error', `플레이어 로딩 실패: ${err.message}`);
        } finally {
            isLoadingPlayers = false;
            render();
        }
    };
    
    // ★★★ 수정: 동명이인 검사 로직 추가
    const handleAddPlayerSubmit = async () => {
        if (isAddingPlayer) return;

        const namesInput = element.querySelector('#player-names');
        const names = namesInput.value.split(',').map(name => name.trim()).filter(Boolean);
        
        if (names.length === 0) {
            updateStatus('error', '추가할 플레이어 이름을 입력하세요.');
            render();
            return;
        }

        for (const name of names) {
            // 이름 길이 검증
            const isEnglishLike = /^[a-zA-Z0-9\s-]*$/.test(name);
            const limit = isEnglishLike ? 20 : 10;
            if (name.length > limit) {
                const lang = isEnglishLike ? '영문/숫자' : '한글 등 기타 언어';
                updateStatus('error', `이름이 너무 깁니다: "${name}" (${lang} 이름은 ${limit}자까지 가능)`);
                render();
                return;
            }
            // 동명이인 검증
            const isDuplicate = localPlayers.some(p => p.name.toLowerCase() === name.toLowerCase());
            if (isDuplicate) {
                updateStatus('error', `이미 등록된 이름입니다: "${name}"`);
                render();
                return;
            }
        }

        isAddingPlayer = true;
        updateStatus('info', `${names.length}명의 플레이어 추가 중...`);
        render();
        
        try {
            await GoogleApi.addPlayers(names.map(name => ({ name })));
            namesInput.value = '';
            hasLoadedPlayers = false; // 목록 갱신을 위해 false로 설정
            updateStatus('success', `✅ 이름이 등록되었습니다. 목록을 갱신합니다.`);
        } catch (err) {
            updateStatus('error', `플레이어 추가 실패: ${err.message}`);
        } finally {
            isAddingPlayer = false;
            render();
        }
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

        setState({ players });
        window.location.hash = '/match';
    };
    
    const updateStatus = (type, message) => {
        status = { type, message };
    };

    render();
    return element;
}