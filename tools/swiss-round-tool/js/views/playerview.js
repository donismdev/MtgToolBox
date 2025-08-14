import { setState, getState } from '../config.js';
import * as GoogleApi from '../api/google.js';

export default function PlayerView() {
    const element = document.createElement('div');
    element.id = 'player-view-container';

    let localPlayers = [];
    let status = { type: 'info', message: '환영합니다! 모드를 선택해주세요.' };
    
    let isConnectingSheet = false;
    let isAddingPlayer = false;
    let isLoadingPlayers = false; 
    let hasLoadedPlayers = false;

    // --- 렌더링 함수 ---
    const render = () => {
        const { isSignedIn, spreadsheetId } = getState();

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

    // ★★★ 수정: 최소 인원을 3명으로 변경하고 안내 문구 수정
    const renderLoginView = () => `
        <div class="section">
            <h3>임시 경기로 빠른 시작</h3>
            <p>로그인 없이 바로 경기를 시작합니다. (최소 3명)</p>
            <form id="temp-match-form">
                <label for="player-count">참가 인원:</label>
                <input type="number" id="player-count" min="3" value="4" required>
                <button type="submit" class="secondary-btn">임시 경기로 시작</button>
            </form>
            <hr>
            <h3>정규 경기로 시작</h3>
            <p>Google 계정으로 로그인하여 모든 기록을 시트에 저장합니다.</p>
            <button id="google-signin-btn" class="primary-btn">Google 계정으로 로그인</button>
        </div>
    `;

    const renderRegularMatchView = ({ spreadsheetId }) => {
        if (!spreadsheetId) {
            return `
                <div class="section">
                    <h3>스프레드시트 연결</h3>
                    <p>데이터를 저장할 스프레드시트를 선택하거나 생성하세요.</p>
                    <button id="ensure-sheet-btn" class="primary-btn" ${isConnectingSheet ? 'disabled' : ''}>
                        ${isConnectingSheet ? '시트 생성 및 연결 중...' : '시트 자동 생성 및 연결'}
                    </button>
                </div>
            `;
        }
        return renderPlayerManagementView();
    };
    
    // ★★★ 수정: 선수 선택(checkbox) UI 및 로직 완전 제거
    const renderPlayerManagementView = () => {
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
                <h3>등록된 플레이어 목록</h3>
                <p>시트에 등록된 모든 플레이어가 경기에 참여합니다. (최소 3명)</p>
                
                <div style="max-height: 200px; overflow-y: auto; border: 1px solid #ddd;">
                    ${(isLoadingPlayers) ? `<p>플레이어 목록을 불러오는 중입니다...</p>` : `
                    <table>
                        <thead><tr><th>ID</th><th>이름</th><th>최근 활동일</th></tr></thead>
                        <tbody>
                            ${sortedPlayers.map(p => `
                                <tr>
                                    <td>${p.player_id}</td>
                                    <td>${p.name}</td>
                                    <td>${p.last_updated ? p.last_updated.slice(0, 10) : p.created_date.slice(0, 10)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>`}
                </div>

                <div id="player-selection-actions" class="${localPlayers.length > 0 ? '' : 'hidden'}">
                    <hr>
                    <button id="start-match-btn" class="primary-btn" ${localPlayers.length < 3 ? 'disabled' : ''}>
                        전체 ${localPlayers.length}명으로 매치 설정 시작
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
            if (target.id === 'start-match-btn') startMatch();
            // 선수 선택 체크박스 핸들러 제거
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
            const id = await GoogleApi.ensureSpreadsheetId({ allowCreate });
            const newMeta = await GoogleApi.getConfigMap();
            setState({ spreadsheetId: id, meta: newMeta });
            updateStatus('info', '시트 연결 완료! 이제 플레이어 목록을 자동으로 불러옵니다.');
        } catch (err) {
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
            updateStatus('success', `총 ${localPlayers.length}명의 플레이어를 불러왔습니다. 3명 이상이면 경기를 시작할 수 있습니다.`);
        } catch (err) {
            hasLoadedPlayers = false;
            updateStatus('error', `플레이어 로딩 실패: ${err.message}`);
        } finally {
            isLoadingPlayers = false;
            render();
        }
    };
    
    const handleAddPlayerSubmit = async () => {
        if (isAddingPlayer) return;
        const namesInput = element.querySelector('#player-names');
        const names = namesInput.value.split(',').map(name => name.trim()).filter(Boolean);
        if (names.length === 0) {
            updateStatus('error', '추가할 플레이어 이름을 입력하세요.');
            render(); return;
        }

        for (const name of names) {
            const isEnglishLike = /^[a-zA-Z0-9\s-]*$/.test(name);
            const limit = isEnglishLike ? 20 : 10;
            if (name.length > limit) {
                updateStatus('error', `이름이 너무 깁니다: "${name}" (${isEnglishLike ? '영문' : '한글'} ${limit}자까지)`);
                render(); return;
            }
            if (localPlayers.some(p => p.name.toLowerCase() === name.toLowerCase())) {
                updateStatus('error', `이미 등록된 이름입니다: "${name}"`);
                render(); return;
            }
        }
        isAddingPlayer = true;
        render();
        try {
            await GoogleApi.addPlayers(names.map(name => ({ name })));
            namesInput.value = '';
            hasLoadedPlayers = false; 
            updateStatus('success', `✅ 이름이 등록되었습니다. 목록을 갱신합니다.`);
        } catch (err) {
            updateStatus('error', `플레이어 추가 실패: ${err.message}`);
        } finally {
            isAddingPlayer = false;
            render();
        }
    };

    // ★★★ 수정: 선택된 플레이어(selectedPlayers) 대신 전체 플레이어(localPlayers)를 사용
    const startMatch = () => {
        if (localPlayers.length < 3) {
            updateStatus('error', '매치를 시작하려면 최소 3명 이상의 플레이어가 있어야 합니다.');
            render();
            return;
        }
        setState({ players: localPlayers });
        window.location.hash = '/match';
    };

    // ★★★ 수정: 최소 인원을 3명으로 변경
    const handleTempMatchSubmit = () => {
        const countInput = element.querySelector('#player-count');
        const count = parseInt(countInput.value, 10);
        if (isNaN(count) || count < 3) {
            updateStatus('error', '참가자는 최소 3명 이상이어야 합니다.');
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