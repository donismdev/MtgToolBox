import { calculateStandings } from '../modules/utils.js';

export default function ResultView() {
    const element = document.createElement('div');
    const standings = calculateStandings();

    element.innerHTML = `
        <h2>최종 순위</h2>
        <div class="table-container">
            <table class="results-table">
                <thead>
                    <tr>
                        <th>순위</th>
                        <th>플레이어</th>
                        <th>승점</th>
                        <th>승-패-무</th>
                        <th>GWP</th>
                        <th>OMW%</th>
                    </tr>
                </thead>
                <tbody></tbody>
            </table>
        </div>
        <button id="restart" class="primary-btn">새 토너먼트 시작</button>
    `;

    const tbody = element.querySelector('tbody');
    standings.forEach(([player, data], index) => {
        const row = tbody.insertRow();
        row.innerHTML = `
            <td>${index + 1}</td>
            <td>${player}</td>
            <td>${data.points}</td>
            <td>${data.wins}-${data.losses}-${data.draws}</td>
            <td>${(data.gwp * 100).toFixed(2)}%</td>
            <td>${(data.omw * 100).toFixed(2)}%</td>
        `;
    });

    element.querySelector('#restart').addEventListener('click', () => {
        window.location.hash = '/';
    });

    return element;
}
