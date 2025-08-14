import { getState, setState } from '../config.js';
import { calculateStandings } from '../modules/utils.js';
import * as GoogleApi from '../api/google.js';

// 플레이어 객체에서 ID를 안전하게 추출하는 헬퍼 함수
function getPlayerId(player) {
    if (!player) return null;
    return player.player_id || null;
}

export default function ResultView() {
    const element = document.createElement('div');

    // 1. config.js에서 현재 이벤트의 모든 정보를 가져옵니다.
    const { currentEvent, meta } = getState();

    // 토너먼트 정보가 없으면 오류 메시지를 표시하고 종료합니다.
    if (!currentEvent) {
        element.innerHTML = `<h2>오류: 표시할 토너먼트 결과가 없습니다.</h2><a href="#/">처음으로 돌아가기</a>`;
        return element;
    }

    // 2. 가져온 정보를 바탕으로 최종 순위를 계산합니다.
    const standings = calculateStandings(currentEvent.players, currentEvent.history);

    let isSaved = false; // 저장 완료 여부를 추적하는 상태 변수

    // 3. "결과 저장하기" 버튼을 눌렀을 때 실행될 함수
    const handleSaveResults = async () => {
		if (isSaved) return;

		const saveButton = element.querySelector('#save-btn');
		const statusDiv = element.querySelector('#save-status');

		saveButton.disabled = true;
		saveButton.textContent = '저장 중...';
		statusDiv.className = 'status-bar info';
		statusDiv.textContent = '스프레드시트에 모든 결과를 기록하고 있습니다...';

		try {
			// ★★★ STEP 1: 이벤트 생성 및 실제 ID 확보 ★★★
			// 모든 경기가 끝난 이 시점에 이벤트를 시트에 기록하고, 고유 ID를 부여받습니다.
			const newEventId = await GoogleApi.addEvent({
				date: currentEvent.date,
				best_of: currentEvent.settings.bestOf,
				event_format: currentEvent.settings.format,
			});

			// ★★★ STEP 2: 모든 라운드 기록 저장 ★★★
			// 위에서 받은 실제 newEventId를 사용하여 라운드 기록을 저장합니다.
			const allRoundLogs = [];
			currentEvent.history.forEach((roundData, roundIndex) => {
				const round_no = roundIndex + 1;
				roundData.results.forEach((result, tableIndex) => {
					const [p1, p2] = result.players;
					allRoundLogs.push({
						event_id: newEventId, // <--- 확보한 새 이벤트 ID 사용
						round_no: round_no,
						table_no: tableIndex + 1,
						playerA_id: getPlayerId(p1),
						playerB_id: getPlayerId(p2),
						...result.report
					});
				});
			});
			await GoogleApi.addRounds(allRoundLogs);

			// --- STEP 3: 참가자 정보 업데이트 (last_updated) ---
			const participantIds = currentEvent.players.map(p => p.player_id);
			await GoogleApi.updatePlayerTimestamps(participantIds);
			
			// ★★★ STEP 4: size 카운터 버그 수정 ★★★
			// 저장 직전에 시트에서 최신 meta 데이터를 다시 가져와서 계산합니다.
			const freshMeta = await GoogleApi.getConfigMap();
			const sizeKey = `size${currentEvent.players.length}_meets`;
			if (freshMeta.hasOwnProperty(sizeKey)) {
				const currentCount = parseInt(freshMeta[sizeKey] || '0', 10);
				const newCount = currentCount + 1;
				await GoogleApi.setConfig(sizeKey, String(newCount));
			}

			// 최종 성공 처리
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

    // 4. 화면 UI를 그리는 함수
    const render = () => {
        const isTempEvent = String(currentEvent.id).startsWith('temp_');
        
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
                <p>결과를 확인하고, 이상이 없다면 스프레드시트에 영구적으로 저장하세요.</p>
                
                ${isTempEvent 
                    ? `<p class="status-bar info">임시 경기는 저장되지 않습니다.</p>`
                    : `<button id="save-btn" class="primary-btn">토너먼트 결과 저장</button>`
                }
                
                <button id="edit-btn" class="secondary">마지막 라운드 수정</button>
                <div id="save-status"></div>
            </div>
            
            <hr>
            <button id="restart-btn" class="secondary">새 토너먼트 시작</button>
        `;
    };

    // 5. 이벤트 리스너 부착
    element.addEventListener('click', (e) => {
        if (e.target.id === 'save-btn') {
            handleSaveResults();
        }
        if (e.target.id === 'edit-btn') {
            // 단순히 이전 게임 화면으로 돌아갑니다. 상태는 그대로 유지됩니다.
            window.location.hash = '/game';
        }
        if (e.target.id === 'restart-btn') {
            // 상태를 깨끗하게 초기화하고 첫 화면으로 이동합니다.
            setState({ currentEvent: null, players: [], currentRound: 1 });
            window.location.hash = '/';
        }
    });

    render();
    return element;
}