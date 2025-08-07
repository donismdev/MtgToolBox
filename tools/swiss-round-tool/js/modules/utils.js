import { getState } from '../config.js';

// 플레이어의 현재 점수, 상대했던 플레이어 목록, 부전승 여부를 계산하는 헬퍼 함수
function getPlayerStats(history) {
    const stats = {};
    const { players } = getState();
    players.forEach(p => {
        stats[p] = { points: 0, opponents: [], hadBye: false };
    });

    history.forEach(round => {
        round.results.forEach(match => {
            const [p1, p2] = match.players;
            if (!p1) return;

            if (p2 === 'BYE') {
                stats[p1].points += 3;
                stats[p1].hadBye = true;
            } else {
                stats[p1].opponents.push(p2);
                stats[p2].opponents.push(p1);
                if (match.winner === p1) {
                    stats[p1].points += 3;
                } else if (match.winner === p2) {
                    stats[p2].points += 3;
                } else { // 무승부
                    stats[p1].points += 1;
                    stats[p2].points += 1;
                }
            }
        });
    });
    return stats;
}

// 새로운 스위스 페어링 알고리즘
export function createPairings(players, history) {
    const stats = getPlayerStats(history);
    let unPairedPlayers = [...players].sort((a, b) => stats[b].points - stats[a].points);
    const pairings = [];

    // 홀수 인원일 경우 BYE 처리
    if (unPairedPlayers.length % 2 !== 0) {
        // 가장 점수가 낮고, BYE를 받은 적 없는 플레이어를 찾음
        for (let i = unPairedPlayers.length - 1; i >= 0; i--) {
            const player = unPairedPlayers[i];
            if (!stats[player].hadBye) {
                pairings.push([player, 'BYE']);
                unPairedPlayers.splice(i, 1); // 페어링된 플레이어는 목록에서 제거
                break;
            }
        }
        // 모든 플레이어가 BYE를 받은 경우, 그냥 가장 낮은 점수 플레이어에게 부여
        if (unPairedPlayers.length % 2 !== 0) {
            const playerToBye = unPairedPlayers.pop();
            pairings.push([playerToBye, 'BYE']);
        }
    }

    // 점수 기반 페어링
    while (unPairedPlayers.length > 0) {
        const p1 = unPairedPlayers.shift();
        let opponentFound = false;
        // 가장 이상적인 상대(점수 같고, 만난 적 없는)를 찾음
        for (let i = 0; i < unPairedPlayers.length; i++) {
            const p2 = unPairedPlayers[i];
            if (!stats[p1].opponents.includes(p2)) {
                pairings.push([p1, p2]);
                unPairedPlayers.splice(i, 1);
                opponentFound = true;
                break;
            }
        }
        // 이상적인 상대를 못 찾으면, 그냥 남은 플레이어 중 첫 번째와 페어링 (재대결 허용)
        if (!opponentFound) {
            const p2 = unPairedPlayers.shift();
            pairings.push([p1, p2]);
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