import { setState, getState } from '../config.js';
import * as GoogleApi from '../api/google.js';

export default function MatchSettingsView() {
    const element = document.createElement('div');
    element.id = 'match-settings-view-container';

    // --- 내부 상태 ---
    const { players } = getState();
    let status = { type: 'info', message: '경기의 세부 설정을 진행해주세요.' };
    
    let suggestedRounds;
    const playerCount = players?.length || 0;
    if (playerCount <= 4) suggestedRounds = 2;
    else if (playerCount <= 8) suggestedRounds = 3;
    else if (playerCount <= 16) suggestedRounds = 4;
    else suggestedRounds = Math.ceil(Math.log2(playerCount));

    // UI 표시에만 사용하고, 최종 데이터는 제출 시 폼에서 직접 읽어옵니다.
    let currentUiSettings = {
        format: 'cube draft',
        rounds: suggestedRounds,
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
                                ${formats.map(f => `<option value="${f}" ${currentUiSettings.format === f ? 'selected' : ''}>${f}</option>`).join('')}
                            </select>
                            ${currentUiSettings.format === 'custom' ? `
                                <input type="text" id="custom-format-input" placeholder="커스텀 형식 입력..." required>
                            ` : ''}
                        </div>

                        <div class="form-group">
                            <label for="rounds-input">라운드 수 (추천: ${suggestedRounds})</label>
                            <input type="number" id="rounds-input" min="1" value="${currentUiSettings.rounds}" required>
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
        
        // UI 변경에 따라 실시간으로 화면을 다시 그려주는 역할만 수행
        element.querySelector('#format-select')?.addEventListener('change', e => {
            currentUiSettings.format = e.target.value;
            render();
        });
        element.querySelector('#rounds-input')?.addEventListener('input', e => {
            currentUiSettings.rounds = parseInt(e.target.value, 10);
        });
    };

    // ★★★ 수정: 버그 해결을 위한 핵심 로직 ★★★
    const handleStartMatch = async (e) => {
        e.preventDefault();

        // 1. 제출 시점에 폼에서 직접 모든 값을 읽어와 정확성을 보장합니다.
        const form = element.querySelector('#match-settings-form');
        const selectedFormat = form.querySelector('#format-select').value;
        const customFormatInput = form.querySelector('#custom-format-input');
        const rounds = parseInt(form.querySelector('#rounds-input').value, 10);
        const bestOf = parseInt(form.querySelector('#best-of-select').value, 10);
        const timerMinutes = parseInt(form.querySelector('#timer-input').value, 10);

        let finalFormat = selectedFormat;
        if (selectedFormat === 'custom') {
            const customFormatValue = customFormatInput?.value.trim();
            if (!customFormatValue) {
                updateStatus('error', '커스텀 형식을 입력해주세요.');
                render();
                return;
            }
            finalFormat = customFormatValue.toLowerCase();
        }
        
        const isTempMatch = players.some(p => String(p.player_id).startsWith('temp_'));
        let eventId;

        if (isTempMatch) {
            eventId = `temp_${Date.now()}`;
        } else {
            // 2. 정규 경기일 경우, Google API를 호출하여 시트에 이벤트를 '생성'하고 'ID'를 받아옵니다.
            //    이 과정에서 meta 시트의 last_event_id와 날짜가 자동으로 업데이트됩니다.
            try {
                updateStatus('info', '이벤트를 생성하고 시트에 기록하는 중...');
                render();
                
                const newEventData = {
                    date: new Date().toISOString().slice(0, 10),
                    best_of: bestOf,
                    event_format: finalFormat,
                };
                eventId = await GoogleApi.addEvent(newEventData);

            } catch (err) {
                console.error("이벤트 생성 실패:", err);
                updateStatus('error', `이벤트 생성에 실패했습니다: ${err.message}`);
                render();
                return;
            }
        }

        // 3. 정상적으로 받아온 eventId와 설정값으로 최종 상태를 확정합니다.
        setState({
			currentEvent: {
				id: eventId,
				date: new Date().toISOString().slice(0, 10), // ★★★ 날짜 정보 추가 ★★★
				players: players,
				settings: {
					format: finalFormat,
					rounds: rounds,
					bestOf: bestOf,
					timerMinutes: timerMinutes,
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