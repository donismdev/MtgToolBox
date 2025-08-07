import { getState } from '../config.js';

// 플레이어 목록을 섞는 함수
function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// 스위스 페어링 로직 (점수 기반)
export function createPairings(players, history) {
    const playerScores = {};
    players.forEach(p => { playerScores[p] = { points: 0, opponents: [] }; });

    history.forEach(round => {
        round.results.forEach(match => {
            const p1 = match.players[0];
            const p2 = match.players[1];
            if (p2 === 'BYE') {
                playerScores[p1].points += 3;
            } else {
                playerScores[p1].opponents.push(p2);
                playerScores[p2].opponents.push(p1);
                if (match.winner === p1) playerScores[p1].points += 3;
                else if (match.winner === p2) playerScores[p2].points += 3;
                else { // 무승부
                    playerScores[p1].points += 1;
                    playerScores[p2].points += 1;
                }
            }
        });
    });

    const sortedPlayers = players.sort((a, b) => playerScores[b].points - playerScores[a].points);

    const pairings = [];
    const paired = new Set();

    for (const player of sortedPlayers) {
        if (paired.has(player)) continue;

        let opponentFound = false;
        for (const potentialOpponent of sortedPlayers) {
            if (player === potentialOpponent || paired.has(potentialOpponent) || playerScores[player].opponents.includes(potentialOpponent)) {
                continue;
            }
            pairings.push([player, potentialOpponent]);
            paired.add(player);
            paired.add(potentialOpponent);
            opponentFound = true;
            break;
        }

        if (!opponentFound && !paired.has(player)) {
            pairings.push([player, 'BYE']);
            paired.add(player);
        }
    }

    return pairings;
}

// 최종 순위 및 타이브레이커 계산
export function calculateStandings() {
    const { players, history } = getState();
    const standings = {};

    players.forEach(p => {
        standings[p] = { points: 0, matches: 0, wins: 0, losses: 0, draws: 0, gamePoints: 0, totalGames: 0, opponents: [] };
    });

    history.forEach(round => {
        round.results.forEach(match => {
            const [p1, p2] = match.players;
            if (!p1 || (p2 !== 'BYE' && !p2)) return;

            standings[p1].matches++;
            if (p2 !== 'BYE') standings[p2].matches++;

            standings[p1].opponents.push(p2);
            if (p2 !== 'BYE') standings[p2].opponents.push(p1);

            if (match.winner === p1) {
                standings[p1].points += 3;
                standings[p1].wins++;
                if (p2 !== 'BYE') standings[p2].losses++;
            } else if (p2 !== 'BYE' && match.winner === p2) {
                standings[p2].points += 3;
                standings[p2].wins++;
                standings[p1].losses++;
            } else if (p2 !== 'BYE') { // 무승부
                standings[p1].points += 1;
                standings[p2].points += 1;
                standings[p1].draws++;
                standings[p2].draws++;
            } else { // BYE
                standings[p1].points += 3;
                standings[p1].wins++;
            }

            standings[p1].gamePoints += match.scores[p1];
            standings[p1].totalGames += match.scores[p1] + (p2 !== 'BYE' ? match.scores[p2] : 0);
            if (p2 !== 'BYE') {
                standings[p2].gamePoints += match.scores[p2];
                standings[p2].totalGames += match.scores[p1] + match.scores[p2];
            }
        });
    });

    // OMW (Opponent's Match Win Percentage) 계산
    players.forEach(p => {
        let omw_total = 0;
        const opponents = standings[p].opponents.filter(o => o !== 'BYE');
        if (opponents.length === 0) {
            standings[p].omw = 0;
            return;
        }

        opponents.forEach(opp => {
            const oppWins = standings[opp].wins;
            const oppMatches = standings[opp].matches;
            omw_total += Math.max(0.33, oppWins / oppMatches);
        });
        standings[p].omw = omw_total / opponents.length;
    });

    // GWP (Game Win Percentage) 계산
    players.forEach(p => {
        standings[p].gwp = standings[p].totalGames === 0 ? 0 : standings[p].gamePoints / standings[p].totalGames;
    });

    return Object.entries(standings).sort(([, a], [, b]) => {
        if (b.points !== a.points) return b.points - a.points;
        if (b.omw !== a.omw) return b.omw - a.omw;
        if (b.gwp !== a.gwp) return b.gwp - a.gwp;
        return 0;
    });
}
