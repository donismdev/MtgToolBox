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

function _norm(n){ return n==null ? null : String(n).trim(); }
function _hasPlayed(stats, a, b){
  a = _norm(a); b = _norm(b);
  if(!a || !b) return false;
  const opps = stats[a]?.opponents || [];
  // opponents에 공백/케이스 차이로 안 잡히는 경우 방지
  for(const o of opps){ if(_norm(o) === b) return true; }
  return false;
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

export function getPlayerStatsForPairing(players, history) {
  const stats = {};
  // 초기화
  players.forEach(p => {
    const name = getPlayerName(p);
    stats[name] = {
      points: 0,
      opponents: [],
      hadBye: false,
      byeCount: 0,
      lastByeRound: 0,
    };
  });

  (history || []).forEach((round, rIdx) => {
    const roundNo = rIdx + 1;
    (round?.results || []).forEach(match => {
      const [p1, p2] = match?.players || [];
      const p1Name = getPlayerName(p1);
      const p2Name = getPlayerName(p2);
      const report  = match?.report || {};

      if (!p1Name) return;

      // BYE
      if (report.result_type === 'BYE' || p2Name === 'BYE') {
        if (!stats[p1Name]) return;
        stats[p1Name].points += 3;
        stats[p1Name].hadBye = true;
        stats[p1Name].byeCount += 1;
        stats[p1Name].lastByeRound = Math.max(stats[p1Name].lastByeRound, roundNo);
        return;
      }

      // 실제 매치
      if (!p2Name) return;
      if (stats[p1Name]) stats[p1Name].opponents.push(p2Name);
      if (stats[p2Name]) stats[p2Name].opponents.push(p1Name);

      const a = Number(report.a_wins || 0);
      const b = Number(report.b_wins || 0);

      if (a > b) {
        if (stats[p1Name]) stats[p1Name].points += 3;
      } else if (b > a) {
        if (stats[p2Name]) stats[p2Name].points += 3;
      } else {
        if (stats[p1Name]) stats[p1Name].points += 1;
        if (stats[p2Name]) stats[p2Name].points += 1;
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
export function createPairings(players, history) {
  const stats = getPlayerStatsForPairing(players, history);
  const getName = (p) => (p && typeof p === 'object' ? p.name : p);

  const shuffle = (arr) => { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; };
  const hasPlayed = (a, b) => {
    const A = getName(a), B = getName(b);
    if (!A || !B) return false;
    const opps = stats[A]?.opponents || [];
    return opps.includes(B);
  };
  const pts = (p) => stats[getName(p)]?.points ?? 0;

  // 1) 점수 그룹화 + 그룹 내부 셔플 → 상위 점수부터 풀 생성
  const groups = new Map();
  players.forEach(p => {
    const key = pts(p);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(p);
  });
  const pool = [];
  Array.from(groups.keys()).sort((a, b) => b - a)
    .forEach(k => pool.push(...shuffle(groups.get(k))));

  const pairings = [];
  let active = [...pool];

  // 2) 홀수면 BYE 선정 (BYE 반복 최소화/연속 BYE 회피)
  if (active.length % 2 === 1) {
    const lastRoundNo = (history || []).length; // 직전 라운드 번호
    const avail = (p) => active.reduce((acc, q) => (q !== p && getName(q) !== 'BYE' && !hasPlayed(p, q) ? acc + 1 : acc), 0);

    const candidates = active.map(p => {
      const n = getName(p);
      const s = stats[n] || {};
      return {
        p,
        byeCount: s.byeCount ?? (s.hadBye ? 1 : 0),
        recentBye: (s.lastByeRound || 0) === lastRoundNo ? 1 : 0, // 직전 라운드 BYE였으면 불리
        score: pts(p),
        deg: avail(p), // 가용 상대 수
      };
    });

    // byeCount ↑ → recentBye ↑ → score ↑ → deg ↑
    candidates.sort((a, b) =>
      (a.byeCount - b.byeCount) ||
      (a.recentBye - b.recentBye) ||
      (a.score - b.score) ||
      (a.deg - b.deg)
    );

    const byeP = candidates[0].p;
    active = active.filter(x => x !== byeP);
    pairings.push([byeP, 'BYE']);
  }

  // 3) 1차 그리디: 가능한 '미대결' 상대 우선
  const pairs = [];
  const bag = [...active];
  while (bag.length) {
    const p1 = bag.shift();
    let pick = -1;
    for (let i = 0; i < bag.length; i++) {
      if (!hasPlayed(p1, bag[i])) { pick = i; break; }
    }
    const p2 = pick >= 0 ? bag.splice(pick, 1)[0] : bag.shift(); // 없으면 재매치 허용
    pairs.push([p1, p2]);
  }

  // 4) 얕은 수리(최대 3패스): 재매치인 테이블을 다른 테이블과 2-스왑 시도
  const isRematch = ([a, b]) => (getName(a) !== 'BYE' && getName(b) !== 'BYE' && hasPlayed(a, b));
  for (let pass = 0; pass < 3; pass++) {
    let fixed = false;
    for (let i = 0; i < pairs.length; i++) {
      if (!isRematch(pairs[i])) continue;
      const [a, b] = pairs[i];

      for (let j = 0; j < pairs.length; j++) {
        if (i === j) continue;
        const [c, d] = pairs[j];
        if (getName(c) === 'BYE' || getName(d) === 'BYE') continue;

        // 스왑안1: b ↔ d  → [a,d], [c,b]
        if (!hasPlayed(a, d) && !hasPlayed(c, b)) {
          pairs[i] = [a, d]; pairs[j] = [c, b]; fixed = true; break;
        }
        // 스왑안2: b ↔ c  → [a,c], [b,d]
        if (!hasPlayed(a, c) && !hasPlayed(b, d)) {
          pairs[i] = [a, c]; pairs[j] = [b, d]; fixed = true; break;
        }
      }
      if (fixed) break;
    }
    if (!fixed) break;
  }

  // BYE를 맨 뒤에 유지
  return [...pairs, ...pairings];
}

/**
 * 최종 순위 및 타이브레이커 계산 (플레이어 객체 지원)
 */
export function calculateStandings(players, history) {
  const getName = p => (p && typeof p === 'object') ? p.name : p;

  const S = {};
  players.forEach(p => {
    const n = getName(p);
    S[n] = {
      points: 0,
      matches: 0,
      wins: 0, losses: 0, draws: 0,
      // 게임 포인트/가능 포인트(=3*게임수)로 GWP 계산
      gamePoints: 0,
      gamePointsPossible: 0,
      opponents: [], // 'BYE'도 넣되, 나중 평균에서 제외
    };
  });

  // 라운드 누적
  history.forEach(round => {
    (round.results || []).forEach(res => {
      const [pa, pb] = res.players || [];
      const A = getName(pa), B = getName(pb);
      if (!A) return;
      const r = res.report || {};

      // BYE
      if (r.result_type === 'BYE' || B === 'BYE') {
        S[A].matches += 1;
        S[A].wins += 1;
        S[A].points += 3;
        // BYE는 2-0 승으로 간주: 게임포인트 6, 가능 포인트 3*2=6
        S[A].gamePoints += 6;
        S[A].gamePointsPossible += 6;
        S[A].opponents.push('BYE');
        return;
      }

      if (!B) return;

      // 상대 기록
      S[A].matches += 1;
      S[B].matches += 1;
      S[A].opponents.push(B);
      S[B].opponents.push(A);

      // 매치 승/무/패
      if (r.a_wins > r.b_wins) {
        S[A].wins += 1; S[B].losses += 1; S[A].points += 3;
      } else if (r.b_wins > r.a_wins) {
        S[B].wins += 1; S[A].losses += 1; S[B].points += 3;
      } else {
        S[A].draws += 1; S[B].draws += 1; S[A].points += 1; S[B].points += 1;
      }

      // 게임 포인트/가능 포인트 누적 (GWP용)
      const aGP = (r.a_wins * 3) + (r.a_draws * 1) + (r.a_losses * 0);
      const bGP = (r.b_wins * 3) + (r.b_draws * 1) + (r.b_losses * 0);
      const aGPP = 3 * (r.a_wins + r.a_draws + r.a_losses);
      const bGPP = 3 * (r.b_wins + r.b_draws + r.b_losses);

      S[A].gamePoints += aGP; S[A].gamePointsPossible += aGPP;
      S[B].gamePoints += bGP; S[B].gamePointsPossible += bGPP;
    });
  });

  // 개인 GWP (0.33 하한)
  Object.keys(S).forEach(n => {
    const gp = S[n].gamePoints;
    const gpp = S[n].gamePointsPossible;
    const raw = gpp > 0 ? gp / gpp : 0;  // 게임이 하나도 없으면 0으로
    S[n].gwp = Math.max(0.33, raw);      // MTR: 0.33 floor
  });

  // OMW%: 각 상대의 매치 승률 평균 (상대별 0.33 하한, BYE 제외)
  const MWP = name => {
    const st = S[name];
    const denom = st.matches * 3;
    const raw = denom > 0 ? st.points / denom : 0;
    return Math.max(0.33, raw);
  };
  Object.keys(S).forEach(n => {
    const opps = S[n].opponents.filter(x => x && x !== 'BYE');
    if (opps.length === 0) { S[n].omw = 0; return; }
    const avg = opps.reduce((sum, o) => sum + MWP(o), 0) / opps.length;
    S[n].omw = avg;
  });

  // OGW%: 각 상대의 GWP 평균 (상대별 0.33 하한, BYE 제외)
  Object.keys(S).forEach(n => {
    const opps = S[n].opponents.filter(x => x && x !== 'BYE');
    if (opps.length === 0) { S[n].ogw = 0; return; }
    const avg = opps.reduce((sum, o) => sum + Math.max(0.33, S[o].gwp || 0), 0) / opps.length;
    S[n].ogw = avg;
  });

  // 최종 정렬: 승점 > OMW > GWP > OGW
  return Object.entries(S).sort(([,a],[,b]) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.omw   !== a.omw  ) return b.omw   - a.omw;
    if (b.gwp   !== a.gwp  ) return b.gwp   - a.gwp;
    if (b.ogw   !== a.ogw  ) return b.ogw   - a.ogw;
    return 0;
  });
}

export { getPlayerStats };
