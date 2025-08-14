import { getState, setState, saveRoundResult, getRoundData } from '../config.js';
import { createPairings } from '../modules/utils.js';
import { startTimer, stopTimer } from '../modules/timer.js';

function getPlayerName(player) {
    if (!player) return null;
    return player.name || player;
}

export default function GameView() {
    const element = document.createElement('div');
    const { currentEvent, currentRound } = getState();

    if (!currentEvent) {
        element.innerHTML = `<h2>오류: 진행 중인 토너먼트 정보가 없습니다.</h2><a href="#/">처음으로 돌아가기</a>`;
        return element;
    }

    const { players, settings, history } = currentEvent;
    const { rounds, bestOf, timerMinutes } = settings;
    const winsNeeded = Math.ceil(bestOf / 2);

    let pairings = [];
    let matchResults = {};

    const isRoundFullyConfirmed = () => {
        return pairings.length > 0 && pairings.every((_, idx) => {
            const r = matchResults[idx];
            if (!r) return false;
            if (getPlayerName(pairings[idx][1]) === 'BYE') return true;
            return !!r.winner;
        });
    };

    const render = () => {
        element.innerHTML = `
            <div class="round-header">
                <h2>Round ${currentRound} / ${rounds} (Event ID: ${currentEvent.id})</h2>
                <div id="timer">${timerMinutes}:00</div>
            </div>
            <div class="matchups-grid"></div>
            <div class="navigation-btns">
                <button id="prev-round" class="secondary-btn" ${currentRound === 1 ? 'disabled' : ''}>이전 라운드</button>
                <button id="next-round" class="primary-btn" ${isRoundFullyConfirmed() ? '' : 'disabled'}>다음 라운드</button>
            </div>
        `;

        const matchupsContainer = element.querySelector('.matchups-grid');
        pairings.forEach((match, index) => {
            const [p1, p2] = match;
            const result = matchResults[index] || {};
            const p1Name = getPlayerName(p1);
            const p2Name = getPlayerName(p2);
            const isFinished = !!result.winner;
            const a_wins = result.report?.a_wins ?? 0;
            const b_wins = result.report?.b_wins ?? 0;

            const matchCard = document.createElement('div');
            matchCard.className = `match-card ${isFinished ? 'finished' : ''}`;
            matchCard.dataset.matchIndex = index;

            if (p2Name !== 'BYE') {
                matchCard.innerHTML = `
                    <div class="match-body-interactive">
                        <div class="player-side" data-player="A" style="display:flex; flex-direction:column; align-items:center; gap:6px;">
                            <div class="player-name" style="font-weight:600;">${p1Name}</div>
                            <div class="win-controls" style="display:flex; gap:6px; width:100%;">
                                <button class="player-button" style="flex:1" data-action="decrement-win" data-player="A" ${isFinished ? 'disabled' : ''}>−</button>
                                <button class="player-button" style="flex:1" data-action="increment-win" data-player="A" ${isFinished ? 'disabled' : ''}>＋</button>
                            </div>
                        </div>
                        <div class="score-display" style="min-width:84px; display:flex; align-items:center; justify-content:center; gap:6px;">
                            <span class="score-digit">${a_wins}</span>
                            <span>-</span>
                            <span class="score-digit">${b_wins}</span>
                        </div>
                        <div class="player-side" data-player="B" style="display:flex; flex-direction:column; align-items:center; gap:6px;">
                            <div class="player-name" style="font-weight:600;">${p2Name}</div>
                            <div class="win-controls" style="display:flex; gap:6px; width:100%;">
                                <button class="player-button" style="flex:1" data-action="decrement-win" data-player="B" ${isFinished ? 'disabled' : ''}>−</button>
                                <button class="player-button" style="flex:1" data-action="increment-win" data-player="B" ${isFinished ? 'disabled' : ''}>＋</button>
                            </div>
                        </div>
                        <div class="match-actions-group">
                            <select class="result-type-select" ${isFinished ? 'disabled' : ''}>
                                <option value="OK" ${result.report?.result_type === 'OK' ? 'selected' : ''}>정상 종료</option>
                                <option value="TIME_OUT" ${result.report?.result_type === 'TIME_OUT' ? 'selected' : ''}>시간 종료</option>
                                <option value="ID" ${result.report?.result_type === 'ID' ? 'selected' : ''}>의도적 무승부</option>
                                <option value="CONCEDE_A" ${result.report?.result_type === 'CONCEDE_A' ? 'selected' : ''}>${p1Name} 기권</option>
                                <option value="CONCEDE_B" ${result.report?.result_type === 'CONCEDE_B' ? 'selected' : ''}>${p2Name} 기권</option>
                            </select>
                            ${!isFinished
                                ? `<button class="confirm-btn" title="결과 확정" data-action="confirm-result">✓</button>`
                                : `<button class="edit-btn" title="결과 수정" data-action="edit-result">✎</button>`
                            }
                        </div>
                    </div>
                `;
            } else {
                matchCard.innerHTML = `<div class="match-body-interactive"><p class="bye-notice">${p1Name} 님의 부전승</p></div>`;
            }
            matchupsContainer.appendChild(matchCard);
        });

        startTimer(timerMinutes * 60, element.querySelector('#timer'));
    };

    // --- 이벤트 핸들러 ---
    
    const handleConfirmResult = (matchIndex) => {
        const result = matchResults[matchIndex];
        let report = result.report || { a_wins: 0, b_wins: 0 };
        const card = element.querySelector(`.match-card[data-match-index="${matchIndex}"]`);
        let resultType = card.querySelector('.result-type-select')?.value || 'OK';

        const isMatchFinishedByScore = report.a_wins >= winsNeeded || report.b_wins >= winsNeeded;
        if (!isMatchFinishedByScore && resultType === 'OK') {
            resultType = 'TIME_OUT';
        }

        const finalReport = {
            a_wins: report.a_wins || 0, b_wins: report.b_wins || 0,
            a_draws: 0, b_draws: 0,
            a_losses: report.b_wins || 0, b_losses: report.a_wins || 0,
            result_type: resultType,
        };

        if (resultType === 'TIME_OUT') {
            finalReport.a_draws = 1; finalReport.b_draws = 1;
        } else if (resultType === 'ID') {
            Object.assign(finalReport, { a_wins: 0, a_draws: 0, a_losses: 0, b_wins: 0, b_draws: 0, b_losses: 0 });
        } else if (resultType === 'CONCEDE_A') {
            Object.assign(finalReport, { a_wins: report.a_wins, a_losses: winsNeeded, b_wins: winsNeeded, b_losses: report.a_wins });
        } else if (resultType === 'CONCEDE_B') {
            Object.assign(finalReport, { a_wins: winsNeeded, a_losses: report.b_wins, b_wins: report.b_wins, b_losses: winsNeeded });
        }

        let winner = null;
        if (finalReport.a_wins > finalReport.b_wins) winner = getPlayerName(pairings[matchIndex][0]);
        else if (finalReport.b_wins > finalReport.a_wins) winner = getPlayerName(pairings[matchIndex][1]);
        else winner = 'DRAW';

        matchResults[matchIndex] = { ...result, winner, report: finalReport, scores: { [getPlayerName(pairings[matchIndex][0])]: finalReport.a_wins, [getPlayerName(pairings[matchIndex][1])]: finalReport.b_wins }};
        render();
    };
    
    const handleEditResult = (matchIndex) => {
        matchResults[matchIndex].winner = null;
        render();
    };

    const handleNextRound = () => {
        if (!isRoundFullyConfirmed()) {
            alert('모든 매치의 결과가 확정되지 않았습니다.');
            return;
        }
        stopTimer();
        // ★★★ 에러를 막는 핵심 수정 ★★★
        // saveRoundResult는 { pairings, results } 객체를 인자로 받습니다.
        saveRoundResult({
            pairings: pairings,
            results: Object.values(matchResults)
        });
        if (currentRound < rounds) {
            setState({ currentRound: currentRound + 1 });
            element.parentElement.replaceChild(GameView(), element);
        } else {
            window.location.hash = '/result';
        }
    };
    
    const handlePrevRound = () => {
        stopTimer();
        setState({ currentRound: currentRound - 1 });
        element.parentElement.replaceChild(GameView(), element);
    };

    element.addEventListener('click', (e) => {
        const target = e.target;
        const action = target.dataset.action;
        const card = target.closest('.match-card');
        if (!card && target.id) {
            if (target.id === 'next-round') handleNextRound();
            if (target.id === 'prev-round') handlePrevRound();
            return;
        }
        if (!card) return;

        const matchIndex = Number(card.dataset.matchIndex);
        if (Number.isNaN(matchIndex)) return;
        
        const result = (matchResults[matchIndex] = matchResults[matchIndex] || { report: { a_wins: 0, b_wins: 0 } });
        result.report = result.report || { a_wins: 0, b_wins: 0 };
        const scoreKey = target.dataset.player === 'A' ? 'a_wins' : 'b_wins';
        const currentScore = result.report[scoreKey] || 0;

        switch (action) {
            case 'increment-win':
                if (currentScore < winsNeeded) {
                    result.report[scoreKey] = currentScore + 1;
                    render();
                }
                break;
            case 'decrement-win':
                if (currentScore > 0) {
                    result.report[scoreKey] = currentScore - 1;
                    render();
                }
                break;
            case 'confirm-result':
                handleConfirmResult(matchIndex);
                break;
            case 'edit-result':
                handleEditResult(matchIndex);
                break;
        }
    });

    const roundData = getRoundData(currentRound);
    if (roundData) {
        pairings = roundData.pairings;
        roundData.results.forEach((res, i) => { matchResults[i] = res; });
    } else {
        pairings = createPairings(players, history.slice(0, currentRound - 1));
        pairings.forEach((match, index) => {
            const [p1, p2] = match;
            matchResults[index] = { scores: {}, winner: null, report: {}, players: match };
            if (getPlayerName(p2) === 'BYE') {
                matchResults[index] = {
                    players: match, winner: getPlayerName(p1),
                    scores: { [getPlayerName(p1)]: winsNeeded },
                    report: { result_type: 'BYE', a_wins: winsNeeded, a_draws: 0, a_losses: 0, b_wins: 0, b_draws: 0, b_losses: 0 }
                };
            }
        });
    }

    render();
    return element;
}