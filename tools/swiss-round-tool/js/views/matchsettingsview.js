import { setState, getState } from '../config.js';

export default function MatchSettingsView() {
    const element = document.createElement('div');
    element.id = 'match-settings-view-container';

    const { players } = getState();
    let status = { type: 'info', message: window.i18n.t('matchSettingsPrompt') };
    
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
            element.innerHTML = `<div class="status-bar error">${window.i18n.t('errorNoPlayers')} <a href="#/">${window.i18n.t('backToStart')}</a></div>`;
            return;
        }
        
        const formats = ['cubeDraft', 'standard', 'modern', 'pioneer', 'legacy', 'vintage', 'pauper', 'commander', 'custom'];

        element.innerHTML = `
            <h2>${window.i18n.t('matchSettings')}</h2>
            <div class="status-bar ${status.type}">${status.message}</div>
            <div class="section">
                <h3>${window.i18n.t('participantList', { count: players.length })}</h3>
                <p>${players.map(p => p.name).join(', ')}</p>
            </div>
            <div class="section">
                <form id="match-settings-form">
                    <div class="form-grid">
                        <div class="form-group">
                            <label for="format-select">${window.i18n.t('eventFormat')}</label>
                            <select id="format-select">${formats.map(f => `<option value="${f}" ${uiState.format === f ? 'selected' : ''}>${window.i18n.t(f)}</option>`).join('')}</select>
                            ${uiState.format === 'custom' ? `<input type="text" id="custom-format-input" placeholder="${window.i18n.t('enterCustomFormat')}" required>` : ''}
                        </div>
                        <div class="form-group">
                            <label for="rounds-input">${window.i18n.t('rounds', { rounds: suggestedRounds })}</label>
                            <input type="number" id="rounds-input" min="1" value="${uiState.rounds}" required>
                        </div>
                        <div class="form-group">
                            <label for="best-of-select">${window.i18n.t('bestOf')}</label>
                            <select id="best-of-select">
                                <option value="1">${window.i18n.t('bo1')}</option>
                                <option value="3" selected>${window.i18n.t('bo3')}</option>
                                <option value="5">${window.i18n.t('bo5')}</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="timer-input">${window.i18n.t('timerMinutes')}</label>
                            <input type="number" id="timer-input" min="10" step="5" value="50" required>
                        </div>
                    </div>
                    <hr>
                    <button type="submit" class="primary-btn">${window.i18n.t('completeSettingsAndStart')}</button>
                </form>
            </div>
            <style>.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; } .form-group { display: flex; flex-direction: column; } .form-group label { margin-bottom: 0.5rem; font-weight: bold; } .form-group input, .form-group select { padding: 0.5rem; }</style>
        `;
        attachEventListeners();
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
        const selectedFormat = form.querySelector('#format-select').value;
        const customFormatInput = form.querySelector('#custom-format-input');
        
        let finalFormat = selectedFormat;
        if (selectedFormat === 'custom') {
            const customFormatValue = customFormatInput?.value.trim();
            if (!customFormatValue) {
                status = { type: 'error', message: window.i18n.t('enterCustomFormatPrompt') };
                render();
                return;
            }
            finalFormat = customFormatValue.toLowerCase();
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