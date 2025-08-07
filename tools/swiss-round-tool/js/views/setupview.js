import { setState } from '../config.js';

export default function SetupView() {
    const element = document.createElement('div');
    element.innerHTML = `
        <h2>토너먼트 설정</h2>
        <form id="setup-form">
            <label for="players">참가자 (한 줄에 한 명씩)</label>
            <textarea id="players" rows="10" required placeholder="Player 1\nPlayer 2\nPlayer 3..."></textarea>
            
            <label for="rounds">라운드 수</label>
            <input type="number" id="rounds" min="1" value="3" required>

            <label for="bestOf">매치 형식</label>
            <select id="bestOf">
                <option value="3">3전 2선승 (Bo3)</option>
                <option value="1">1전 1선승 (Bo1)</option>
                <option value="5">5전 3선승 (Bo5)</option>
            </select>

            <label for="timerMinutes">라운드 시간 (분)</label>
            <input type="number" id="timerMinutes" min="1" value="50" required>

            <button type="submit" class="primary-btn">토너먼트 시작</button>
        </form>
    `;

    element.querySelector('#setup-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const players = document.getElementById('players').value.split('\n').filter(p => p.trim() !== '');
        if (players.length < 2) {
            alert('참가자는 최소 2명 이상이어야 합니다.');
            return;
        }
        
        setState({
            players,
            rounds: parseInt(document.getElementById('rounds').value, 10),
            bestOf: parseInt(document.getElementById('bestOf').value, 10),
            timerMinutes: parseInt(document.getElementById('timerMinutes').value, 10),
            currentRound: 1,
            history: [],
        });
        window.location.hash = '/game';
    });

    return element;
}
