import { setState, getState } from '../config.js';

export default function MatchSettingsView() {
    const element = document.createElement('div');
    element.id = 'match-settings-view-container';

    // --- 내부 상태 ---
    const { players } = getState();
    let status = { type: 'info', message: '경기의 세부 설정을 진행해주세요.' };
    
    // ★★★ 설정값 상태 관리
    // 인원 수에 따른 추천 라운드 계산
    let suggestedRounds;
    const playerCount = players?.length || 0;
    if (playerCount <= 3) suggestedRounds = 2;
    else if (playerCount <= 8) suggestedRounds = 3;
    else if (playerCount <= 16) suggestedRounds = 4;
    else suggestedRounds = Math.ceil(Math.log2(playerCount));

    let settings = {
        format: 'cube draft',
        customFormat: '',
        rounds: suggestedRounds,
        bestOf: 3,
        timerMinutes: 50
    };
    
    // --- 렌더링 함수 ---
    const render = () => {
        if (!players || players.length < 2) {
            element.innerHTML = `<div class="status-bar error">오류: 설정할 플레이어 정보가 없습니다. <a href="#/">처음으로 돌아가기</a></div>`;
            return;
        }

        const formats = ['cube draft', 'standard', 'modern', 'pioneer', 'legacy', 'vintage', 'pauper', 'commander', 'custom'];

        element.innerHTML = `
            <h2>매치 설정</h2>
            <div class="status-bar ${status.type}">${status.message}</div>
            <div class="section">
                <h3>참가자 (${players.length}명)</h3>
                <p>${players.map(p => p.name).join(', ')}</p>
            </div>
            <div class="section">
                <form id="match-settings-form">
                    
                    <div class="form-grid">
                        <div class="form-group">
                            <label for="format-select">이벤트 형식</label>
                            <select id="format-select">
                                ${formats.map(f => `<option value="${f}" ${settings.format === f ? 'selected' : ''}>${f}</option>`).join('')}
                            </select>
                            ${settings.format === 'custom' ? `
                                <input type="text" id="custom-format-input" placeholder="커스텀 형식 입력..." value="${settings.customFormat}" required>
                            ` : ''}
                        </div>

                        <div class="form-group">
                            <label for="rounds-input">라운드 수 (추천: ${suggestedRounds})</label>
                            <input type="number" id="rounds-input" min="1" value="${settings.rounds}" required>
                        </div>

                        <div class="form-group">
                            <label for="best-of-select">Best Of</label>
                            <select id="best-of-select">
                                <option value="1" ${settings.bestOf == 1 ? 'selected' : ''}>1 (단판)</option>
                                <option value="3" ${settings.bestOf == 3 ? 'selected' : ''}>3 (3판 2선)</option>
                                <option value="5" ${settings.bestOf == 5 ? 'selected' : ''}>5 (5판 3선)</option>
                            </select>
                        </div>

                        <div class="form-group">
                            <label for="timer-input">타이머 (분)</label>
                            <input type="number" id="timer-input" min="10" step="5" value="${settings.timerMinutes}" required>
                        </div>
                    </div>

                    <hr>
                    <button type="submit" class="primary-btn">설정 완료하고 경기 시작</button>
                </form>
            </div>
            <style>
                .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
                .form-group { display: flex; flex-direction: column; }
                .form-group label { margin-bottom: 0.5rem; font-weight: bold; }
                .form-group input, .form-group select { padding: 0.5rem; }
            </style>
        `;
        attachEventListeners();
    };

    // --- 이벤트 핸들러 ---
    const attachEventListeners = () => {
        element.querySelector('#match-settings-form')?.addEventListener('submit', handleStartMatch);
        
        // 각 설정 변경 시 상태 업데이트
        element.querySelector('#format-select')?.addEventListener('change', e => {
            settings.format = e.target.value;
            render();
        });
        element.querySelector('#custom-format-input')?.addEventListener('input', e => { settings.customFormat = e.target.value; });
        element.querySelector('#rounds-input')?.addEventListener('input', e => { settings.rounds = parseInt(e.target.value, 10); });
        element.querySelector('#best-of-select')?.addEventListener('input', e => { settings.bestOf = parseInt(e.target.value, 10); });
        element.querySelector('#timer-input')?.addEventListener('input', e => { settings.timerMinutes = parseInt(e.target.value, 10); });
    };

    const handleStartMatch = (e) => {
        e.preventDefault();

        let finalFormat = settings.format;
        if (settings.format === 'custom') {
            if (!settings.customFormat.trim()) {
                updateStatus('error', '커스텀 형식을 입력해주세요.');
                render();
                return;
            }
            finalFormat = settings.customFormat.trim().toLowerCase();
        }

        const isTempMatch = players.some(p => String(p.player_id).startsWith('temp_'));

        setState({
            currentEvent: {
                id: isTempMatch ? `temp_${Date.now()}` : null,
                players: players,
                settings: {
                    format: finalFormat,
                    rounds: settings.rounds,
                    bestOf: settings.bestOf,
                    timerMinutes: settings.timerMinutes,
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

    render();
    return element;
}