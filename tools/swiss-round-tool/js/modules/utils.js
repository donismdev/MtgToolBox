// modules/utils.js
import { getState } from '../config.js';

/**
 * 플레이어 객체 또는 문자열에서 이름(식별자)을 반환하는 헬퍼 함수
 * @param {object|string} player - 플레이어 객체 또는 이름 문자열
 * @returns {string} 플레이어 이름
 */
function getPlayerName(player) {
    if (!player) return null;
    return typeof player === 'object' ? player.name : player;
}

// 플레이어의 현재 점수, 상대했던 플레이어 목록, 부전승 여부를 계산
function getPlayerStats(history) {
    const stats = {};
    const { players } = getState();
    
    // 플레이어 이름으로 stats 객체 초기화
    players.forEach(p => {
        const name = getPlayerName(p);
        stats[name] = { points: 0, opponents: [], hadBye: false };
    });

    history.forEach(round => {
        round.results.forEach(match => {
            const [p1, p2] = match.players;
            const p1Name = getPlayerName(p1);
            const p2Name = getPlayerName(p2);
            
            if (!p1Name) return;

            if (p2Name === 'BYE') {
                stats[p1Name].points += 3;
                stats[p1Name].hadBye = true;
            } else if (p2Name) {
                stats[p1Name].opponents.push(p2Name);
                stats[p2Name].opponents.push(p1Name);

                if (match.winner === p1Name) {
                    stats[p1Name].points += 3;
                } else if (match.winner === p2Name) {
                    stats[p2Name].points += 3;
                } else { // 무승부
                    stats[p1Name].points += 1;
                    stats[p2Name].points += 1;
                }
            }
        });
    });
    return stats;
}

function getPlayerStatsForPairing(players, history) {
    const stats = {};
    players.forEach(p => {
        const name = getPlayerName(p);
        stats[name] = { points: 0, opponents: [], hadBye: false };
    });

    history.forEach(round => {
        round.results.forEach(match => {
            const [p1, p2] = match.players;
            const p1Name = getPlayerName(p1);
            const p2Name = getPlayerName(p2);
            const report = match.report || {}; // report 객체 사용

            if (!p1Name) return;

            if (report.result_type === 'BYE' || p2Name === 'BYE') {
                stats[p1Name].points += 3;
                stats[p1Name].hadBye = true;
            } else if (p2Name) {
                stats[p1Name].opponents.push(p2Name);
                stats[p2Name].opponents.push(p1Name);

                // report에 기록된 게임 스코어를 기반으로 승점 계산
                if (report.a_wins > report.b_wins) {
                    stats[p1Name].points += 3;
                } else if (report.b_wins > report.a_wins) {
                    stats[p2Name].points += 3;
                } else { // 무승부
                    stats[p1Name].points += 1;
                    stats[p2Name].points += 1;
                }
            }
        });
    });
    return stats;
}

// 새로운 스위스 페어링 알고리즘 (플레이어 객체 지원)
export function createPairings(players, history) {
    const stats = getPlayerStatsForPairing(players, history);
    // 점수 기준으로 플레이어 '객체' 정렬
    let unPairedPlayers = [...players].sort((a, b) => {
        return stats[getPlayerName(b)].points - stats[getPlayerName(a)].points;
    });
    const pairings = [];

    if (unPairedPlayers.length % 2 !== 0) {
        let byeAssigned = false;
        for (let i = unPairedPlayers.length - 1; i >= 0; i--) {
            const player = unPairedPlayers[i];
            const playerName = getPlayerName(player);
            if (!stats[playerName].hadBye) {
                pairings.push([player, 'BYE']);
                unPairedPlayers.splice(i, 1);
                byeAssigned = true;
                break;
            }
        }
        if (!byeAssigned) {
            const playerToBye = unPairedPlayers.pop();
            pairings.push([playerToBye, 'BYE']);
        }
    }

    while (unPairedPlayers.length > 0) {
        const p1 = unPairedPlayers.shift();
        const p1Name = getPlayerName(p1);
        let opponentFound = false;

        for (let i = 0; i < unPairedPlayers.length; i++) {
            const p2 = unPairedPlayers[i];
            const p2Name = getPlayerName(p2);
            if (!stats[p1Name].opponents.includes(p2Name)) {
                pairings.push([p1, p2]);
                unPairedPlayers.splice(i, 1);
                opponentFound = true;
                break;
            }
        }
        if (!opponentFound && unPairedPlayers.length > 0) {
            const p2 = unPairedPlayers.shift();
            pairings.push([p1, p2]);
        }
    }
    return pairings;
}

// 최종 순위 및 타이브레이커 계산 (플레이어 객체 지원)
export function calculateStandings(players, history) {
    const standings = {};

    players.forEach(p => {
        const name = getPlayerName(p);
        standings[name] = { 
            points: 0, matches: 0, wins: 0, losses: 0, draws: 0, 
            gamePoints: 0, totalGames: 0, opponents: [] 
        };
    });

    history.forEach(round => {
        round.results.forEach(match => {
            const [p1, p2] = match.players;
            const p1Name = getPlayerName(p1);
            const p2Name = getPlayerName(p2);
            const report = match.report || {}; // GameView에서 저장한 report 객체

            if (!p1Name) return;

            // BYE가 아닌 실제 매치에 대해서만 통계 누적
            if (report.result_type !== 'BYE' && p2Name) {
                standings[p1Name].matches++;
                standings[p2Name].matches++;
                standings[p1Name].opponents.push(p2Name);
                standings[p2Name].opponents.push(p1Name);

                // 1. 매치 승/패/무 누적 (게임 스코어 기준)
                if (report.a_wins > report.b_wins) {
                    standings[p1Name].wins++;
                    standings[p2Name].losses++;
                } else if (report.b_wins > report.a_wins) {
                    standings[p2Name].wins++;
                    standings[p1Name].losses++;
                } else {
                    standings[p1Name].draws++;
                    standings[p2Name].draws++;
                }

                // 2. 게임 승점(Game Points) 및 총 게임 수 누적 (GWP 계산용)
                // report에 이미 정확한 게임 단위 승/무/패가 기록되어 있음
                standings[p1Name].gamePoints += report.a_wins;
                standings[p1Name].totalGames += report.a_wins + report.a_draws + report.a_losses;
                
                standings[p2Name].gamePoints += report.b_wins;
                standings[p2Name].totalGames += report.b_wins + report.b_draws + report.b_losses;
            } else if (report.result_type === 'BYE') {
                // BYE 처리
                standings[p1Name].matches++;
                standings[p1Name].wins++;
                standings[p1Name].opponents.push('BYE');
            }
        });
    });

    // 3. 최종 승점 계산 (승리 3점, 무승부 1점)
    players.forEach(p => {
        const pName = getPlayerName(p);
        standings[pName].points = (standings[pName].wins * 3) + (standings[pName].draws * 1);
    });

    // 4. OMW% (상대 매치 승률) 계산
    players.forEach(p => {
        const pName = getPlayerName(p);
        const opponents = standings[pName].opponents.filter(o => o !== 'BYE' && o !== null);
        if (opponents.length === 0) {
            standings[pName].omw = 0;
            return;
        }
        let omw_total = 0;
        opponents.forEach(oppName => {
            const oppStats = standings[oppName];
            const oppMatchPoints = (oppStats.wins * 3) + (oppStats.draws * 1);
            // 상대의 매치 승률 = (상대의 총 승점) / (상대가 치른 매치 수 * 3)
            const oppMWP = oppStats.matches > 0 ? oppMatchPoints / (oppStats.matches * 3) : 0;
            omw_total += Math.max(0.33, oppMWP); // 최소 승률 33% 보정
        });
        standings[pName].omw = omw_total / opponents.length;
    });

    // 5. GWP (게임 승률) 계산
    players.forEach(p => {
        const pName = getPlayerName(p);
        // ID(의도적 무승부) 등으로 총 게임이 0일 경우 0으로 처리
        standings[pName].gwp = standings[pName].totalGames > 0 
            ? standings[pName].gamePoints / standings[pName].totalGames 
            : 0;
    });
    
    // 6. 순위 정렬 (승점 > OMW% > GWP)
    return Object.entries(standings).sort(([, a], [, b]) => {
        if (b.points !== a.points) return b.points - a.points;
        if (b.omw !== a.omw) return b.omw - a.omw;
        if (b.gwp !== a.gwp) return b.gwp - a.gwp;
        return 0;
    });
}