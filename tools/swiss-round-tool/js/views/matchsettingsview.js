import { setState, getState } from '../config.js';

export default function MatchSettingsView() {
    const element = document.createElement('div');
    element.id = 'match-settings-view-container';

    // --- 내부 상태 ---
    const { players } = getState();
    let status = { type: 'info', message: '경기의 세부 설정을 진행해주세요.' };
    
    // ★★★ 수정: 넘어온 플레이어 정보를 보고 정규/임시 경기인지 판단 ★★★
    const isTempMatch = players && players.length > 0 && String(players[0].player_id).startsWith('temp_');

    let suggestedRounds;
    const playerCount = players?.length || 0;
    if (playerCount <= 4) suggestedRounds = 2;
    else if (playerCount <= 8) suggestedRounds = 3;
    else if (playerCount <= 16) suggestedRounds = 4;
    else suggestedRounds = Math.ceil(Math.log2(playerCount));

    let uiState = { format: 'cube draft', rounds: suggestedRounds };

    // --- 렌더링 함수 ---
    const render = () => {
        if (!players || !players.length) {
            element.innerHTML = `<div class="status-bar error">오류: 설정할 플레이어 정보가 없습니다. <a href="#/">처음으로 돌아가기</a></div>`;
            return;
        }
        
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
                        ${renderFormatSelector()} 
                        <div class="form-group">
                            <label for="rounds-input">라운드 수 (추천: ${suggestedRounds})</label>
                            <input type="number" id="rounds-input" min="1" value="${uiState.rounds}" required>
                        </div>
                        <div class="form-group">
                            <label for="best-of-select">Best Of</label>
                            <select id="best-of-select">
                                <option value="1">1 (단판)</option>
                                <option value="3" selected>3 (3판 2선)</option>
                                <option value="5">5 (5판 3선)</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="timer-input">타이머 (분)</label>
                            <input type="number" id="timer-input" min="10" step="5" value="50" required>
                        </div>
                    </div>
                    <hr>
                    <button type="submit" class="primary-btn">설정 완료하고 경기 시작</button>
                </form>
            </div>
            <style>.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; } .form-group { display: flex; flex-direction: column; } .form-group label { margin-bottom: 0.5rem; font-weight: bold; } .form-group input, .form-group select { padding: 0.5rem; }</style>
        `;
        attachEventListeners();
    };

    // ★★★ 수정: 경기 모드에 따라 다른 UI를 그리는 헬퍼 함수 ★★★
    const renderFormatSelector = () => {
        if (isTempMatch) {
            return `
                <div class="form-group">
                    <label>이벤트 형식</label>
                    <p style="padding: 0.5rem 0;">임시 경기 (저장되지 않음)</p>
                </div>
            `;
        }

        const formats = ['cube draft', 'standard', 'modern', 'pioneer', 'legacy', 'vintage', 'pauper', 'commander', 'custom'];
        return `
            <div class="form-group">
                <label for="format-select">이벤트 형식</label>
                <select id="format-select">${formats.map(f => `<option value="${f}" ${uiState.format === f ? 'selected' : ''}>${f}</option>`).join('')}</select>
                ${uiState.format === 'custom' ? `<input type="text" id="custom-format-input" placeholder="커스텀 형식 입력..." required>` : ''}
            </div>
        `;
    };

    const attachEventListeners = () => {
        element.querySelector('#match-settings-form')?.addEventListener('submit', handleStartMatch);
        element.querySelector('#format-select')?.addEventListener('change', e => {
            uiState.format = e.target.value;
            render();
        });
        element.querySelector('#rounds-input')?.addEventListener('input', e => { uiState.rounds = parseInt(e.target.value, 10); });
    };

    const handleStartMatch = (e) => {
        e.preventDefault();
        const form = element.querySelector('#match-settings-form');
        
        let finalFormat;
        // ★★★ 수정: 임시 경기일 때와 정규 경기일 때의 format 값을 다르게 처리 ★★★
        if (isTempMatch) {
            finalFormat = 'temporary';
        } else {
            const selectedFormat = form.querySelector('#format-select').value;
            const customFormatInput = form.querySelector('#custom-format-input');
            finalFormat = selectedFormat;
            if (selectedFormat === 'custom') {
                const customFormatValue = customFormatInput?.value.trim();
                if (!customFormatValue) {
                    status = { type: 'error', message: '커스텀 형식을 입력해주세요.' };
                    render();
                    return;
                }
                finalFormat = customFormatValue.toLowerCase();
            }
        }

        setState({
            currentEvent: {
                id: null,
                date: new Date().toISOString().slice(0, 10),
                players: players,
                settings: {
                    format: finalFormat,
                    rounds: parseInt(form.querySelector('#rounds-input').value, 10),
                    bestOf: parseInt(form.querySelector('#best-of-select').value, 10),
                    timerMinutes: parseInt(form.querySelector('#timer-input').value, 10),
                },
                history: [],
            },
            currentRound: 1,
        });
        window.location.hash = '/game';
    };

    render();
    return element;
}