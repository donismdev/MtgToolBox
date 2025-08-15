// modules/utils.js
import { getState } from '../config.js';

/**
 * 플레이어 객체 또는 문자열에서 이름(식별자)을 반환
 * @param {object|string} player
 * @returns {string|null}
 */
function getPlayerName(player) {
	if (!player) return null;
	return typeof player === 'object' ? player.name : player;
}

/**
 * 히스토리 전체에서 플레이어별 점수/상대/부전승 여부 집계
 * (전체 플레이어 기준: standings 용 보조)
 */
function getPlayerStats(history) {
	const stats = {};
	const { players } = getState();

	// 초기화
	players.forEach((p) => {
		const name = getPlayerName(p);
		if (!name) return;
		stats[name] = { points: 0, opponents: [], hadBye: false };
	});

	(history || []).forEach((round) => {
		const results = Array.isArray(round?.results) ? round.results : [];
		results.forEach((match) => {
			const pair = Array.isArray(match?.players) ? match.players : [];
			const p1Name = getPlayerName(pair?.[0]);
			const p2Name = getPlayerName(pair?.[1]);
			if (!p1Name) return;

			// stats에 없으면 초기화(안전)
			if (!stats[p1Name]) stats[p1Name] = { points: 0, opponents: [], hadBye: false };
			if (p2Name && !stats[p2Name]) stats[p2Name] = { points: 0, opponents: [], hadBye: false };

			if (p2Name === 'BYE') {
				stats[p1Name].points += 3;
				stats[p1Name].hadBye = true;
				return;
			}
			if (!p2Name) return;

			// 상대 리스트(존재하는 쪽만)
			stats[p1Name]?.opponents.push(p2Name);
			stats[p2Name]?.opponents.push(p1Name);

			// 승점 계산 (winner 필드 기반)
			const w = match?.winner;
			if (w === p1Name) stats[p1Name].points += 3;
			else if (w === p2Name) stats[p2Name].points += 3;
			else {
				stats[p1Name].points += 1;
				stats[p2Name].points += 1;
			}
		});
	});
	return stats;
}

/**
 * 페어링용 집계: 활성 players만 대상으로 안전 집계
 * - opponents: 과거에 붙었던 상대 이름 목록(재매칭 회피용)
 * - points: 점수 정렬 기준
 */
function getPlayerStatsForPairing(players, history) {
	const stats = {};
	const activeNames = new Set(players.map(getPlayerName).filter(Boolean));

	// 활성 기준 초기화
	players.forEach((p) => {
		const name = getPlayerName(p);
		if (!name) return;
		stats[name] = { points: 0, opponents: [], hadBye: false };
	});

	// 과거 라운드 누적
	(history || []).forEach((round) => {
		const results = Array.isArray(round?.results) ? round.results : [];
		results.forEach((match) => {
			const pair = Array.isArray(match?.players) ? match.players : [];
			const p1Name = getPlayerName(pair?.[0]);
			const p2Name = getPlayerName(pair?.[1]);
			const report = match?.report || {};

			if (!p1Name) return;

			// 필요 시 안전 초기화 (활성만)
			if (activeNames.has(p1Name) && !stats[p1Name]) {
				stats[p1Name] = { points: 0, opponents: [], hadBye: false };
			}
			if (activeNames.has(p2Name) && !stats[p2Name]) {
				stats[p2Name] = { points: 0, opponents: [], hadBye: false };
			}

			// BYE 처리 (활성만 점수 반영)
			if (report.result_type === 'BYE' || p2Name === 'BYE') {
				if (activeNames.has(p1Name)) {
					stats[p1Name].points += 3;
					stats[p1Name].hadBye = true;
				}
				return;
			}

			// 실매치
			if (!p2Name) return;

			// 재매칭 회피용 opponents: 존재하는 쪽만 푸시
			if (activeNames.has(p1Name)) stats[p1Name].opponents.push(p2Name);
			if (activeNames.has(p2Name)) stats[p2Name].opponents.push(p1Name);

			// 점수 반영 (활성만)
			const aw = Number(report.a_wins) || 0;
			const bw = Number(report.b_wins) || 0;

			if (aw > bw) {
				if (activeNames.has(p1Name)) stats[p1Name].points += 3;
			} else if (bw > aw) {
				if (activeNames.has(p2Name)) stats[p2Name].points += 3;
			} else {
				if (activeNames.has(p1Name)) stats[p1Name].points += 1;
				if (activeNames.has(p2Name)) stats[p2Name].points += 1;
			}
		});
	});

	return stats;
}

/**
 * 새로운 스위스 페어링 알고리즘 (플레이어 객체 지원)
 * - players: 활성 플레이어 배열(드랍자 제외)
 * - history: [{ round, pairings, results }, ...] (지난 라운드)
 */
export function createPairings(players, history) {
	const stats = getPlayerStatsForPairing(players, history);

	// 점수 기준 정렬 (내림차순)
	let unPairedPlayers = [...players].sort((a, b) => {
		const an = getPlayerName(a);
		const bn = getPlayerName(b);
		const ap = stats[an]?.points ?? 0;
		const bp = stats[bn]?.points ?? 0;
		return bp - ap;
	});

	const pairings = [];

	// 홀수면 BYE 배정: 아직 BYE 없는 플레이어 우선
	if (unPairedPlayers.length % 2 !== 0) {
		let byeAssigned = false;
		for (let i = unPairedPlayers.length - 1; i >= 0; i--) {
			const p = unPairedPlayers[i];
			const name = getPlayerName(p);
			// stats[name]가 없을 수 있으니 방어
			if (!stats[name]) stats[name] = { points: 0, opponents: [], hadBye: false };
			if (stats[name].hadBye === false) {
				pairings.push([p, 'BYE']);
				unPairedPlayers.splice(i, 1);
				byeAssigned = true;
				break;
			}
		}
		if (!byeAssigned) {
			const last = unPairedPlayers.pop();
			pairings.push([last, 'BYE']);
		}
	}

	// 재매칭 회피 우선 매칭
	while (unPairedPlayers.length > 0) {
		const p1 = unPairedPlayers.shift();
		const p1Name = getPlayerName(p1);
		if (!stats[p1Name]) stats[p1Name] = { points: 0, opponents: [], hadBye: false };

		let opponentIndex = -1;
		for (let i = 0; i < unPairedPlayers.length; i++) {
			const p2 = unPairedPlayers[i];
			const p2Name = getPlayerName(p2);
			// p2도 필요 시 방어 초기화
			if (!stats[p2Name]) stats[p2Name] = { points: 0, opponents: [], hadBye: false };

			if (!stats[p1Name].opponents.includes(p2Name)) {
				opponentIndex = i;
				break;
			}
		}

		if (opponentIndex === -1) {
			// 재매칭 회피 불가 → 첫 상대와 매칭
			const p2 = unPairedPlayers.shift();
			pairings.push([p1, p2]);
		} else {
			const p2 = unPairedPlayers.splice(opponentIndex, 1)[0];
			pairings.push([p1, p2]);
		}
	}

	return pairings;
}

/**
 * 최종 순위 및 타이브레이커 계산 (플레이어 객체 지원)
 */
export function calculateStandings(players, history) {
	const standings = {};

	// 초기화
	players.forEach((p) => {
		const name = getPlayerName(p);
		if (!name) return;
		standings[name] = {
			points: 0, matches: 0, wins: 0, losses: 0, draws: 0,
			gamePoints: 0, totalGames: 0, opponents: []
		};
	});

	(history || []).forEach((round) => {
		const results = Array.isArray(round?.results) ? round.results : [];
		results.forEach((match) => {
			const pair = Array.isArray(match?.players) ? match.players : [];
			const p1Name = getPlayerName(pair?.[0]);
			const p2Name = getPlayerName(pair?.[1]);
			const report = match?.report || {};

			if (!p1Name) return;

			// 안전 초기화
			if (!standings[p1Name]) standings[p1Name] = { points: 0, matches: 0, wins: 0, losses: 0, draws: 0, gamePoints: 0, totalGames: 0, opponents: [] };
			if (p2Name && !standings[p2Name]) standings[p2Name] = { points: 0, matches: 0, wins: 0, losses: 0, draws: 0, gamePoints: 0, totalGames: 0, opponents: [] };

			// 실매치
			if (report.result_type !== 'BYE' && p2Name) {
				standings[p1Name].matches++;
				standings[p2Name].matches++;
				standings[p1Name].opponents.push(p2Name);
				standings[p2Name].opponents.push(p1Name);

				// 매치 승패/무 (게임 스코어 기준)
				const aw = Number(report.a_wins) || 0;
				const bw = Number(report.b_wins) || 0;
				const ad = Number(report.a_draws) || 0;
				const bd = Number(report.b_draws) || 0;
				const al = Number(report.a_losses) || 0;
				const bl = Number(report.b_losses) || 0;

				if (aw > bw) {
					standings[p1Name].wins++;
					standings[p2Name].losses++;
				} else if (bw > aw) {
					standings[p2Name].wins++;
					standings[p1Name].losses++;
				} else {
					standings[p1Name].draws++;
					standings[p2Name].draws++;
				}

				// 게임 포인트 / 총 게임 수
				standings[p1Name].gamePoints += aw;
				standings[p1Name].totalGames += (aw + ad + al);

				standings[p2Name].gamePoints += bw;
				standings[p2Name].totalGames += (bw + bd + bl);
			} else if (report.result_type === 'BYE') {
				// BYE 처리
				standings[p1Name].matches++;
				standings[p1Name].wins++;
				standings[p1Name].opponents.push('BYE');
			}
		});
	});

	// 승점 = 3*승 + 1*무
	players.forEach((p) => {
		const n = getPlayerName(p);
		if (!n || !standings[n]) return;
		standings[n].points = (standings[n].wins * 3) + (standings[n].draws * 1);
	});

	// OMW% (상대 매치 승률)
	players.forEach((p) => {
		const n = getPlayerName(p);
		if (!n || !standings[n]) return;
		const opps = standings[n].opponents.filter((o) => o && o !== 'BYE');
		if (opps.length === 0) {
			standings[n].omw = 0;
			return;
		}
		let sum = 0;
		opps.forEach((opp) => {
			const os = standings[opp];
			if (!os || os.matches === 0) {
				sum += 0.33; // 최소 33% 보정
				return;
			}
			const oppPoints = (os.wins * 3) + (os.draws * 1);
			const mwp = oppPoints / (os.matches * 3);
			sum += Math.max(0.33, mwp);
		});
		standings[n].omw = sum / opps.length;
	});

	// GWP (게임 승률)
	players.forEach((p) => {
		const n = getPlayerName(p);
		if (!n || !standings[n]) return;
		const s = standings[n];
		s.gwp = s.totalGames > 0 ? (s.gamePoints / s.totalGames) : 0;
	});

	// 정렬: 승점 > OMW > GWP
	return Object.entries(standings).sort(([, a], [, b]) => {
		if (b.points !== a.points) return b.points - a.points;
		if (b.omw !== a.omw) return b.omw - a.omw;
		if (b.gwp !== a.gwp) return b.gwp - a.gwp;
		return 0;
	});
}

export { getPlayerStats };
