import { getState, setState, saveRoundResult, getRoundData } from '../config.js';
import { createPairings } from '../modules/utils.js';
import { startTimer, stopTimer } from '../modules/timer.js';

export default function GameView() {
    const element = document.createElement('div');
    let { players, rounds, bestOf, timerMinutes, currentRound, history } = getState();
    let pairings = [];
    let matchResults = {}; // { matchIndex: { scores: { p1: 0, p2: 0 }, winner: null } }

    function render() {
        const winsNeeded = Math.ceil(bestOf / 2);
        element.innerHTML = `
            <div class="round-header">
                <h2>라운드 ${currentRound} / ${rounds}</h2>
                <div id="timer">${timerMinutes}:00</div>
            </div>
            <div class="matchups-grid"></div>
            <div class="navigation-btns">
                <button id="prev-round" class="secondary-btn" ${currentRound === 1 ? 'disabled' : ''}>이전 라운드</button>
                <button id="next-round" class="primary-btn">다음 라운드</button>
            </div>
        `;

        const matchupsContainer = element.querySelector('.matchups-grid');
        pairings.forEach((match, index) => {
            const [p1, p2] = match;
            const result = matchResults[index] || { scores: { [p1]: 0, [p2]: 0 }, winner: null };

            const matchCard = document.createElement('div');
            matchCard.className = 'match-card';
            matchCard.innerHTML = `
                <div class="match-title">
                    <span>${p1} vs ${p2 || 'BYE'}</span>
                    <span class="game-score">${result.scores[p1]} - ${p2 !== 'BYE' ? result.scores[p2] : ''}</span>
                </div>
                ${p2 !== 'BYE' ? `
                <div class="match-body">
                    <div class="match-actions">
                        <button class="win-btn" data-match="${index}" data-winner="${p1}">${p1} 승리</button>
                        <button class="win-btn" data-match="${index}" data-winner="${p2}">${p2} 승리</button>
                    </div>
                     <button class="draw-btn" data-match="${index}">무승부</button>
                </div>
                ` : ''}
            `;
            matchupsContainer.appendChild(matchCard);
        });

        // 승리/무승부 버튼 상태 업데이트
        updateButtonStates();
        startTimer(timerMinutes * 60, element.querySelector('#timer'));
    }

    function updateButtonStates() {
        const winsNeeded = Math.ceil(bestOf / 2);
        document.querySelectorAll('.win-btn, .draw-btn').forEach(btn => {
            const matchIndex = btn.dataset.match;
            if (matchResults[matchIndex]?.winner) {
                btn.disabled = true;
            }
        });
    }

    function handleWin(matchIndex, winner) {
        const result = matchResults[matchIndex];
        if (result.winner) return;

        const match = pairings[matchIndex];
        const [p1, p2] = match;
        
        result.scores[winner]++;
        
        const winsNeeded = Math.ceil(bestOf / 2);
        if (result.scores[winner] >= winsNeeded) {
            result.winner = winner;
        }
        render(); // Re-render to update scores and button states
    }

    function handleDraw(matchIndex) {
        const result = matchResults[matchIndex];
        if (result.winner) return;
        result.winner = 'DRAW';
        render();
    }

    element.addEventListener('click', (e) => {
        if (e.target.classList.contains('win-btn')) {
            handleWin(e.target.dataset.match, e.target.dataset.winner);
        } else if (e.target.classList.contains('draw-btn')) {
            handleDraw(e.target.dataset.match);
        } else if (e.target.id === 'next-round') {
            // 모든 매치의 승자가 결정되었는지 확인
            const allMatchesDecided = Object.values(matchResults).every(result => result.winner !== null);
            if (!allMatchesDecided) {
                alert('모든 매치의 결과(승자/무승부)가 입력되지 않았습니다.');
                return;
            }

            stopTimer();
            saveRoundResult(pairings, Object.values(matchResults).map((r, i) => ({ players: pairings[i], ...r })));
            if (currentRound < rounds) {
                setState({ currentRound: currentRound + 1 });
                // 페이지를 새로고침하는 대신, 뷰를 다시 렌더링하여 상태를 업데이트합니다.
                const newView = GameView();
                element.parentElement.replaceChild(newView, element);
            } else {
                window.location.hash = '/result';
            }
        } else if (e.target.id === 'prev-round') {
            stopTimer();
            setState({ currentRound: currentRound - 1 });
            const newView = GameView();
            element.parentElement.replaceChild(newView, element);
        }
    });

    // Initial setup for the current round
    const roundData = getRoundData(currentRound);
    if (roundData) {
        pairings = roundData.pairings;
        matchResults = roundData.results.reduce((acc, res, i) => ({...acc, [i]: res }), {});
    } else {
        pairings = createPairings(players, history.slice(0, currentRound - 1));
        pairings.forEach((match, index) => {
            const [p1, p2] = match;
            matchResults[index] = { scores: { [p1]: 0, [p2]: 0 }, winner: p2 === 'BYE' ? p1 : null };
        });
    }

    render();
    return element;
}