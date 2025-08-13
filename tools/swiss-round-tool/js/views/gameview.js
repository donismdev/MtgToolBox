import { getState, setState, saveRoundResult, getRoundData } from '../config.js';
import { createPairings } from '../modules/utils.js';
import { startTimer, stopTimer } from '../modules/timer.js';

// --- 헬퍼 함수 ---
function getPlayerName(player) {
    if (!player) return null;
    return player.name || player;
}

function getPlayerId(player) {
    if (!player) return null;
    return player.player_id || player;
}

/**
 * (핵심) 사용자의 입력을 바탕으로 최종 결과 객체를 표준화하고 계산합니다.
 * @param {object} rawInput - { scoreA, scoreB, resultType }
 * @param {number} bestOf - Best Of N (e.g., 3)
 * @returns {object} - { scores, winner, report }
 */
function normalizeResult(rawInput, bestOf) {
    const { scoreA, scoreB, resultType, p1Name, p2Name } = rawInput;
    const winsNeeded = Math.ceil(bestOf / 2);

    let report = {
        a_wins: 0, a_draws: 0, a_losses: 0,
        b_wins: 0, b_draws: 0, b_losses: 0,
    };
    let winner = null;

    switch (resultType) {
        case 'CONCEDE_A': // A가 기권
            winner = p2Name;
            report.a_wins = scoreA;
            report.a_losses = winsNeeded;
            report.b_wins = winsNeeded;
            report.b_losses = scoreA;
            break;
        case 'CONCEDE_B': // B가 기권
            winner = p1Name;
            report.b_wins = scoreB;
            report.b_losses = winsNeeded;
            report.a_wins = winsNeeded;
            report.a_losses = scoreB;
            break;
        case 'ID': // 의도적 무승부
            winner = 'DRAW';
            break;
        case 'TIME_OUT': // 시간 종료
            const totalGames = scoreA + scoreB;
            if (totalGames < bestOf) {
                report.a_draws = 1;
                report.b_draws = 1;
            }
            report.a_wins = scoreA;
            report.a_losses = scoreB;
            report.b_wins = scoreB;
            report.b_losses = scoreA;
            winner = (scoreA > scoreB) ? p1Name : (scoreB > scoreA) ? p2Name : 'DRAW';
            break;
        case 'OK': // 정상 종료
        default:
            report.a_wins = scoreA;
            report.a_losses = scoreB;
            report.b_wins = scoreB;
            report.b_losses = scoreA;
            if (scoreA >= winsNeeded) winner = p1Name;
            else if (scoreB >= winsNeeded) winner = p2Name;
            else winner = 'DRAW';
            break;
    }

    return {
        scores: { [p1Name]: report.a_wins, [p2Name]: report.b_wins },
        winner,
        report,
    };
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

    let pairings = [];
    let matchResults = {};

    const render = () => {
        element.innerHTML = `
            <div class="round-header">
                <h2>Round ${currentRound} / ${rounds} (Event ID: ${currentEvent.id})</h2>
                <div id="timer">${timerMinutes}:00</div>
            </div>
            <div class="matchups-grid"></div>
            <div class="navigation-btns">
                <button id="prev-round" class="secondary-btn" ${currentRound === 1 ? 'disabled' : ''}>이전 라운드</button>
                <button id="next-round" class="primary-btn">다음 라운드</button>
            </div>
            <div id="modal-container"></div>
        `;
        
        const matchupsContainer = element.querySelector('.matchups-grid');
        pairings.forEach((match, index) => {
            const [p1, p2] = match;
            const result = matchResults[index];
            const p1Name = getPlayerName(p1);
            const p2Name = getPlayerName(p2);

            let resultText = "결과 입력 대기중";
            if (result.winner) {
                const { a_wins, a_draws, a_losses } = result.report;
                resultText = `결과: ${a_wins}-${a_losses}` + (a_draws > 0 ? `-${a_draws}` : '');
            }
            
            const matchCard = document.createElement('div');
            matchCard.className = `match-card ${result.winner ? 'finished' : ''}`;
            matchCard.innerHTML = `
                <div class="match-title">
                    <span>${p1Name} vs ${p2Name || 'BYE'}</span>
                    <span class="game-score">${resultText}</span>
                </div>
                ${p2Name !== 'BYE' ? `
                <div class="match-body">
                    <button class="primary-btn" data-action="open-modal" data-match-index="${index}">결과 입력</button>
                </div>
                ` : ''}
            `;
            matchupsContainer.appendChild(matchCard);
        });

        startTimer(timerMinutes * 60, element.querySelector('#timer'));
    };

    const openResultModal = (matchIndex) => {
        const modalContainer = element.querySelector('#modal-container');
        const match = pairings[matchIndex];
        const [p1, p2] = match;
        const p1Name = getPlayerName(p1);
        const p2Name = getPlayerName(p2);

        modalContainer.innerHTML = `
            <div class="modal-backdrop">
                <div class="modal-content">
                    <h3>결과 입력: ${p1Name} vs ${p2Name}</h3>
                    <form id="result-form">
                        <div class="form-group">
                            <label>게임 스코어</label>
                            <div class="score-input">
                                <input type="number" id="scoreA" value="0" min="0" max="${bestOf}">
                                <span>-</span>
                                <input type="number" id="scoreB" value="0" min="0" max="${bestOf}">
                            </div>
                        </div>
                        <div class="form-group">
                            <label>결과 유형</label>
                            <select id="resultType">
                                <option value="OK" selected>정상 종료</option>
                                <option value="TIME_OUT">시간 종료 (미완료 게임 있음)</option>
                                <option value="ID">의도적 무승부 (ID)</option>
                                <option value="CONCEDE_A">${p1Name} 기권</option>
                                <option value="CONCEDE_B">${p2Name} 기권</option>
                            </select>
                        </div>
                        <div class="modal-actions">
                           <button type="submit" class="primary-btn">저장</button>
                           <button type="button" data-action="close-modal" class="secondary-btn">취소</button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        modalContainer.querySelector('#result-form').addEventListener('submit', (e) => {
            e.preventDefault();
            const rawInput = {
                scoreA: parseInt(document.getElementById('scoreA').value, 10),
                scoreB: parseInt(document.getElementById('scoreB').value, 10),
                resultType: document.getElementById('resultType').value,
                p1Name: p1Name,
                p2Name: p2Name,
            };

            const finalResult = normalizeResult(rawInput, bestOf);
            
            matchResults[matchIndex] = {
                ...matchResults[matchIndex],
                ...finalResult,
            };
            
            closeModal();
            render();
        });
    };

    const closeModal = () => {
        element.querySelector('#modal-container').innerHTML = '';
    };
    
    const handleNextRound = () => {
        const allMatchesDecided = Object.values(matchResults).every(result => result.winner !== null);
        if (!allMatchesDecided) {
            alert('모든 매치의 결과가 입력되지 않았습니다.');
            return;
        }

        stopTimer();
        saveRoundResult(pairings, Object.values(matchResults));
        
        if (currentRound < rounds) {
            setState({ currentRound: currentRound + 1 });
            const newView = GameView();
            element.parentElement.replaceChild(newView, element);
        } else {
            window.location.hash = '/result';
        }
    };
    
    element.addEventListener('click', (e) => {
        const target = e.target;
        const action = target.dataset.action;

        if (action === 'open-modal') {
            openResultModal(target.dataset.matchIndex);
        } else if (action === 'close-modal') {
            closeModal();
        } else if (target.id === 'next-round') {
            handleNextRound();
        } else if (target.id === 'prev-round') {
            // --- ▼ 이전 라운드 로직 (채워진 부분) ▼ ---
            stopTimer();
            setState({ currentRound: currentRound - 1 });
            const newView = GameView();
            element.parentElement.replaceChild(newView, element);
            // --- ▲ 이전 라운드 로직 (채워진 부분) ▲ ---
        }
    });

    // --- 라운드 데이터 초기화 ---
    const roundData = getRoundData(currentRound);
    if (roundData) {
        pairings = roundData.pairings;
        roundData.results.forEach((res, i) => { matchResults[i] = res; });
    } else {
        pairings = createPairings(players, history.slice(0, currentRound - 1));
        
        pairings.forEach((match, index) => {
            const [p1, p2] = match;
            const p2Name = getPlayerName(p2);
            
            matchResults[index] = {
                scores: {}, winner: null, report: {}, players: match
            };
            
            if (p2Name === 'BYE') {
                const winsNeeded = Math.ceil(bestOf / 2);
                const finalResult = normalizeResult({
                    scoreA: winsNeeded, scoreB: 0, resultType: 'OK', 
                    p1Name: getPlayerName(p1), p2Name: 'BYE'
                }, bestOf);
                
                matchResults[index] = { ...matchResults[index], ...finalResult, report: { ...finalResult.report, result_type: 'BYE' } };
            }
        });
    }

    render();
    return element;
}