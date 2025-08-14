import { getState, setState } from '../config.js';
import { calculateStandings } from '../modules/utils.js';
import * as GoogleApi from '../api/google.js';

function getPlayerId(player) {
    if (!player) return null;
    return player.player_id || null;
}

export default function ResultView() {
    const element = document.createElement('div');
    const { currentEvent } = getState();

    if (!currentEvent) {
        element.innerHTML = `<h2>오류: 표시할 토너먼트 결과가 없습니다.</h2><a href="#/">처음으로 돌아가기</a>`;
        return element;
    }

    const standings = calculateStandings(currentEvent.players, currentEvent.history);
    let isSaved = false;

    // ★★★ 수정: 클립보드 복사 함수 추가
    const handleCopyToClipboard = () => {
        const statusDiv = element.querySelector('#save-status');
        let text = `Tournament Results (${currentEvent.date})\n`;
        text += `Format: ${currentEvent.settings.format}\n\n`;
        text += `== Final Standings ==\n`;
        standings.forEach(([player, data], index) => {
            text += `${index + 1}. ${player} (Points: ${data.points}, Record: ${data.wins}-${data.losses}-${data.draws})\n`;
        });
        
        navigator.clipboard.writeText(text).then(() => {
            statusDiv.className = 'status-bar success';
            statusDiv.textContent = '✅ 결과가 클립보드에 복사되었습니다!';
        }, () => {
            statusDiv.className = 'status-bar error';
            statusDiv.textContent = '복사에 실패했습니다.';
        });
    };

    const handleSaveResults = async () => {
        if (isSaved) return;
        const saveButton = element.querySelector('#save-btn');
        const statusDiv = element.querySelector('#save-status');
        saveButton.disabled = true;
        saveButton.textContent = '저장 중...';
        statusDiv.className = 'status-bar info';
        statusDiv.textContent = '스프레드시트에 모든 결과를 기록하고 있습니다...';

        try {
            const freshMeta = await GoogleApi.getConfigMap();
            const newEventId = await GoogleApi.addEvent({
                date: currentEvent.date,
                best_of: currentEvent.settings.bestOf,
                event_format: currentEvent.settings.format,
            });
            const allRoundLogs = [];
            currentEvent.history.forEach((roundData, roundIndex) => {
                const round_no = roundIndex + 1;
                roundData.results.forEach((result, tableIndex) => {
                    const [p1, p2] = result.players;
                    allRoundLogs.push({
                        event_id: newEventId,
                        round_no,
                        table_no: tableIndex + 1,
                        playerA_id: getPlayerId(p1),
                        playerB_id: getPlayerId(p2),
                        ...result.report
                    });
                });
            });
            await GoogleApi.addRounds(allRoundLogs);
            const participantIds = currentEvent.players.map(p => p.player_id);
            await GoogleApi.updatePlayerTimestamps(participantIds);
            
            isSaved = true;
            saveButton.textContent = '저장 완료';
            statusDiv.className = 'status-bar success';
            statusDiv.textContent = '✅ 모든 결과가 성공적으로 저장되었습니다!';
        } catch (err) {
            statusDiv.className = 'status-bar error';
            statusDiv.textContent = `저장 실패: ${err.message}`;
            saveButton.disabled = false;
            saveButton.textContent = '토너먼트 결과 저장';
        }
    };
    
    // ★★★ 수정: 임시/정규 경기에 따라 다른 버튼을 렌더링
    const render = () => {
        const isTempEvent = String(currentEvent.id).startsWith('temp_') || currentEvent.players.some(p => String(p.player_id).startsWith('temp_'));
        
        element.innerHTML = `
            <h2>최종 순위</h2>
            <div class="table-container">
                <table class="results-table">
                    <thead>
                        <tr>
                            <th>순위</th><th>플레이어</th><th>승점</th>
                            <th>승-패-무</th><th>GWP</th><th>OMW%</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${standings.map(([player, data], index) => `
                            <tr>
                                <td>${index + 1}</td>
                                <td>${player}</td>
                                <td>${data.points}</td>
                                <td>${data.wins}-${data.losses}-${data.draws}</td>
                                <td>${(data.gwp * 100).toFixed(2)}%</td>
                                <td>${(data.omw * 100).toFixed(2)}%</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>

            <div class="section">
                <h3>토너먼트 관리</h3>
                ${isTempEvent
                    ? `<p>임시 경기 결과는 저장되지 않습니다. 필요 시 결과를 복사하여 사용하세요.</p>
                       <button id="copy-btn" class="primary-btn">결과 텍스트로 복사</button>`
                    : `<p>결과를 확인하고, 이상이 없다면 스프레드시트에 영구적으로 저장하세요.</p>
                       <button id="save-btn" class="primary-btn">토너먼트 결과 저장</button>`
                }
                <button id="edit-btn" class="secondary">마지막 라운드 수정</button>
                <div id="save-status"></div>
            </div>
            
            <hr>
            <button id="restart-btn" class="secondary">새 토너먼트 시작</button>
        `;
    };

    element.addEventListener('click', (e) => {
        if (e.target.id === 'save-btn') handleSaveResults();
        if (e.target.id === 'copy-btn') handleCopyToClipboard(); // ★★★ 추가된 핸들러
        if (e.target.id === 'edit-btn') window.location.hash = '/game';
        if (e.target.id === 'restart-btn') {
            setState({ currentEvent: null, players: [], currentRound: 1 });
            window.location.hash = '/';
        }
    });

    render();
    return element;
}