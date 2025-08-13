import { setState, getState } from '../config.js';
// 'GoogleApi'는 이 파일에서 더 이상 직접 호출하지 않으므로 import가 필요 없습니다.

export default function MatchView() {
    const element = document.createElement('div');

    // 1. PlayerView에서 넘겨받은 참가자 정보와 main.js에서 로드한 meta 데이터를 가져옵니다.
    const { players, meta } = getState();

    // 렌더링 함수: 참가자 목록과 토너먼트 설정 폼을 표시합니다.
    const render = () => {
        // 참가자 수에 따라 스위스 라운드 수를 자동으로 추천합니다. (예: 8명 -> 3라운드)
        const suggestedRounds = players.length > 1 ? Math.ceil(Math.log2(players.length)) : 1;
        
        element.innerHTML = `
            <h2>토너먼트 설정</h2>
            
            <h3>참가자 (${players.length}명)</h3>
            <div style="max-height: 150px; overflow-y: auto; border: 1px solid #ddd; padding: 10px; margin-bottom: 20px;">
                <ul>${players.map(p => `<li>${p.name} (ID: ${p.player_id})</li>`).join('')}</ul>
            </div>
            
            <form id="setup-form">
                <label for="event-format">이벤트 형식 (예: Modern, Cube Draft)</label>
                <input type="text" id="event-format" value="Swiss Tournament" required>

                <label for="rounds">총 라운드 수</label>
                <input type="number" id="rounds" min="1" value="${suggestedRounds}" required>

                <label for="bestOf">매치 형식 (Best of)</label>
                <select id="bestOf">
                    <option value="3" selected>3전 2선승 (Bo3)</option>
                    <option value="1">1전 1선승 (Bo1)</option>
                    <option value="5">5전 3선승 (Bo5)</option>
                </select>
                
                <button type="submit" class="primary-btn">토너먼트 시작</button>
            </form>
        `;
    };

    // 폼 제출 이벤트 핸들러
    const handleSubmit = (e) => {
        e.preventDefault();
        
        // 2. 폼에서 사용자가 입력한 설정값을 가져옵니다.
        const event_format = document.getElementById('event-format').value;
        const rounds = parseInt(document.getElementById('rounds').value, 10);
        const bestOf = parseInt(document.getElementById('bestOf').value, 10);
        
        // 3. 로컬에 캐싱된 meta 정보로 다음 이벤트 ID를 계산합니다. (API 호출 없음)
        const nextEventId = parseInt(meta.last_event_id, 10) + 1;

        // 4. 모든 토너먼트 정보를 'currentEvent' 객체에 담아 전역 상태에 저장합니다.
        // 이 정보는 GameView를 거쳐 ResultView에서 최종 저장될 때까지 로컬에만 존재합니다.
        setState({
            currentEvent: {
                id: nextEventId,
                date: new Date().toISOString().slice(0, 10), // YYYY-MM-DD 형식
                format: event_format,
                players: players, // PlayerView에서 선택된 참가자들
                settings: {
                    rounds: rounds,
                    bestOf: bestOf,
                    timerMinutes: 50, // 기본 타이머 시간
                },
                history: [], // 라운드 결과가 저장될 빈 배열
            },
            currentRound: 1, // 게임 진행을 위한 라운드 포인터
        });

        // 5. GameView로 이동합니다.
        window.location.hash = '/game';
    };

    element.addEventListener('submit', handleSubmit);

    render();
    return element;
}
