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

	// --- 드랍 유틸 ---
	const getDroppedSetUpTo = (roundIncl) => {
		const drops = currentEvent.drops || {};
		const s = new Set();
		for (let r = 1; r <= roundIncl; r += 1) {
			(drops[r] || []).forEach((name) => s.add(name));
		}
		return s;
	};

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
				<h2>Round ${currentRound} / ${rounds}</h2>
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
			const resultType = result.report?.result_type;
			const dropA = resultType === 'DROP_A';
			const dropB = resultType === 'DROP_B';

			const matchCard = document.createElement('div');
			matchCard.className = `match-card ${isFinished ? 'finished' : ''}`;
			matchCard.dataset.matchIndex = index;

			if (p2Name !== 'BYE') {
				matchCard.innerHTML = `
					<div class="match-title">
						<span class="table-badge">Table ${index + 1}</span>
					</div>

					<div class="match-row">
						<div class="name name-left">
							${p1Name}
							${dropA ? '<span class="drop-chip">드랍</span>' : ''}
						</div>

						<div class="win-controls">
							<button class="player-button big" data-action="decrement-win" data-player="A" ${isFinished ? 'disabled' : ''}>−</button>
							<button class="player-button big" data-action="increment-win" data-player="A" ${isFinished ? 'disabled' : ''}>＋</button>
						</div>

						<div class="score center">
							<span class="score-digit">${a_wins}</span>
							<span>-</span>
							<span class="score-digit">${b_wins}</span>
						</div>

						<div class="win-controls">
							<button class="player-button big" data-action="decrement-win" data-player="B" ${isFinished ? 'disabled' : ''}>−</button>
							<button class="player-button big" data-action="increment-win" data-player="B" ${isFinished ? 'disabled' : ''}>＋</button>
						</div>

						<div class="name name-right">
							${p2Name}
							${dropB ? '<span class="drop-chip">드랍</span>' : ''}
						</div>
					</div>

					<div class="actions-bar">
						<select class="result-type-select" aria-label="결과 유형 선택" ${isFinished ? 'disabled' : ''}>
							<option value="OK" ${resultType === 'OK' ? 'selected' : ''}>정상 종료</option>
							<option value="TIME_OUT" ${resultType === 'TIME_OUT' ? 'selected' : ''}>시간 종료</option>
							<option value="ID" ${resultType === 'ID' ? 'selected' : ''}>의도적 무승부</option>
							<option value="DROP_A" ${resultType === 'DROP_A' ? 'selected' : ''}>${p1Name} 드랍</option>
							<option value="DROP_B" ${resultType === 'DROP_B' ? 'selected' : ''}>${p2Name} 드랍</option>
						</select>
						${!isFinished
							? `<button class="confirm-btn" title="결과 확정" data-action="confirm-result">✓</button>`
							: `<button class="edit-btn" title="결과 수정" data-action="edit-result">✎</button>`
						}
					</div>
				`;
			} else {
				matchCard.innerHTML = `
					<div class="match-title">
						<span class="table-badge">Table ${index + 1}</span>
					</div>
					<div class="bye-notice">${p1Name} 님의 부전승</div>
				`;
			}

			matchupsContainer.appendChild(matchCard);
		});

		startTimer(timerMinutes * 60, element.querySelector('#timer'));
	};

	// --- 이벤트 핸들러 ---

	const handleConfirmResult = (matchIndex) => {
		const result = matchResults[matchIndex] || {};
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
			result_type: resultType
		};

		if (resultType === 'TIME_OUT') {
			finalReport.a_draws = 1; finalReport.b_draws = 1;
		} else if (resultType === 'ID') {
			Object.assign(finalReport, { a_wins: 0, a_draws: 0, a_losses: 0, b_wins: 0, b_draws: 0, b_losses: 0 });
		}
		// DROP_A / DROP_B 는 점수 그대로 유지

		let winner = null;
		if (finalReport.a_wins > finalReport.b_wins) winner = getPlayerName(pairings[matchIndex][0]);
		else if (finalReport.b_wins > finalReport.a_wins) winner = getPlayerName(pairings[matchIndex][1]);
		else winner = 'DRAW';

		matchResults[matchIndex] = {
			...result,
			winner,
			report: finalReport,
			scores: {
				[getPlayerName(pairings[matchIndex][0])]: finalReport.a_wins,
				[getPlayerName(pairings[matchIndex][1])]: finalReport.b_wins
			}
		};
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

		saveRoundResult({
			round: currentRound,           // ← 라운드 태그
			pairings,
			results: Object.values(matchResults)
		});

		// 이번 라운드 드랍 수집
		const roundDrops = [];
		Object.entries(matchResults).forEach(([i, res]) => {
			const rt = res?.report?.result_type;
			if (rt === 'DROP_A') roundDrops.push(getPlayerName(pairings[i][0]));
			if (rt === 'DROP_B' && getPlayerName(pairings[i][1]) !== 'BYE') {
				roundDrops.push(getPlayerName(pairings[i][1]));
			}
		});

		const nextEvent = {
			...currentEvent,
			drops: { ...(currentEvent.drops || {}), [currentRound]: roundDrops }
		};

		if (currentRound < settings.rounds) {
			setState({ currentEvent: nextEvent, currentRound: currentRound + 1 });
			element.parentElement.replaceChild(GameView(), element);
		} else {
			setState({ currentEvent: nextEvent });
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

		// 상단 네비 버튼
		if (!card && target.id) {
			if (target.id === 'next-round') handleNextRound();
			if (target.id === 'prev-round') handlePrevRound();
			return;
		}
		if (!card) return;

		const matchIndex = Number(card.dataset.matchIndex);
		if (Number.isNaN(matchIndex)) return;

		const result = (matchResults[matchIndex] = matchResults[matchIndex] || { report: { a_wins: 0, b_wins: 0 }, drop: {} });
		result.report = result.report || { a_wins: 0, b_wins: 0 };
		result.drop = result.drop || {};
		const side = target.dataset.player;
		const scoreKey = side === 'A' ? 'a_wins' : 'b_wins';
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
			case 'toggle-drop': {
				if (!side) return;
				result.drop[side] = !result.drop[side];
				render();
				break;
			}
			case 'confirm-result':
				handleConfirmResult(matchIndex);
				break;
			case 'edit-result':
				handleEditResult(matchIndex);
				break;
		}
	});

	element.addEventListener('change', (e) => {
		const target = e.target;
		if (!target.classList.contains('result-type-select')) return;

		const card = target.closest('.match-card');
		if (!card) return;

		const matchIndex = Number(card.dataset.matchIndex);
		if (Number.isNaN(matchIndex)) return;

		// 드랍 선택 시 즉시 확정
		const val = target.value;
		if (val === 'DROP_A' || val === 'DROP_B') {
			// 점수는 그대로 두고, handleConfirmResult가 winner/보고서 작성
			handleConfirmResult(matchIndex);
		} else {
			// 드랍 이외로 바뀌면 자동 확정하지 않음(기존 UX 유지)
			// 필요하면 여기서도 자동 확정하도록 handleConfirmResult(matchIndex) 호출 가능
		}
	});

	// --- 초기 데이터 로드 ---
	const roundData = getRoundData(currentRound);
	// round 필드가 있고 현재 라운드와 일치할 때만 복원
	if (roundData && roundData.round === currentRound) {
		pairings = roundData.pairings;
		roundData.results.forEach((res, i) => { matchResults[i] = res; });
	} else {
		// 이전 라운드까지 드랍한 플레이어는 제외하고 페어링
		const droppedUpToPrev = getDroppedSetUpTo(currentRound - 1);
		const activePlayers = players.filter((p) => !droppedUpToPrev.has(getPlayerName(p)));
		pairings = createPairings(activePlayers, history.slice(0, currentRound - 1));
		pairings.forEach((match, index) => {
			const [p1, p2] = match;
			matchResults[index] = { scores: {}, winner: null, report: { a_wins: 0, b_wins: 0 }, players: match, drop: {} };
			if (getPlayerName(p2) === 'BYE') {
				matchResults[index] = {
					players: match,
					winner: getPlayerName(p1),
					scores: { [getPlayerName(p1)]: winsNeeded },
					report: { result_type: 'BYE', a_wins: winsNeeded, a_draws: 0, a_losses: 0, b_wins: 0, b_draws: 0, b_losses: 0 },
					drop: {}
				};
			}
		});
	}

	render();
	return element;
}
