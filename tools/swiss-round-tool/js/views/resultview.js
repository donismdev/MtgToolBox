// views/ResultView.js
import { getState, setState } from '../config.js';
import { calculateStandings } from '../modules/utils.js';
import * as GoogleApi from '../api/google.js';

// ===== 헬퍼 (ResultView 전용) =====
const rvGetName = (p) => (p ? (p.name || p) : null);
const rvGetId   = (p) => (p ? p.player_id || null : null);
const rvPct     = (v) => {
	const x = Number(v);
	return Number.isFinite(x) ? (x * 100).toFixed(2) + '%' : '0.00%';
};

export default function ResultView() {
	const element = document.createElement('div');
	const { currentEvent } = getState();

	if (!currentEvent) {
		element.innerHTML = `<h2>오류: 표시할 토너먼트 결과가 없습니다.</h2><a href="#/">처음으로 돌아가기</a>`;
		return element;
	}

	// BYE 제거된 실제 참가자
	const rvPlayers = (currentEvent.players || []).filter((p) => {
		const n = rvGetName(p);
		return n && n !== 'BYE';
	});

	// 최초 드랍 라운드 맵
	const rvDropRoundByName = {};
	Object.entries(currentEvent.drops || {}).forEach(([rStr, arr]) => {
		const r = Number(rStr);
		(arr || []).forEach((name) => {
			if (!rvDropRoundByName[name]) rvDropRoundByName[name] = r;
		});
	});

	// 순위 계산 (BYE 제외된 플레이어 대상으로)
	const rvStandings = calculateStandings(rvPlayers, currentEvent.history || []);
	let rvIsSaved = false;

	// ===== TSV 생성기 (스프레드시트 붙여넣기 최적화) =====
	const rvBuildTSV = () => {
		const lines = [];

		// ── Event meta (요청: date / best_of / event_format) ──
		const { date, settings } = currentEvent;
		const bestOf = settings?.bestOf ?? '';
		const eventFormat = settings?.format ?? '';

		lines.push(`== Event ==`);
		lines.push(`date\t${date || ''}`);
		lines.push(`best_of\t${bestOf}`);
		lines.push(`event_format\t${eventFormat}`);
		lines.push(''); // 구분용 빈 줄

		// Standings 섹션
		lines.push(`== Standings ==`);
		lines.push(`Rank\tPlayer\tPoints\tW-L-D\tGWP\tOMW%\tDropped`);
		rvStandings
			.filter(([player]) => player !== 'BYE')
			.forEach(([player, data], idx) => {
				const dropMark = rvDropRoundByName[player] ? `R${rvDropRoundByName[player]}` : '';
				lines.push(
					[
						idx + 1,
						player,
						data.points ?? 0,
						`${data.wins ?? 0}-${data.losses ?? 0}-${data.draws ?? 0}`,
						rvPct(data.gwp ?? 0),
						rvPct(data.omw ?? 0),
						dropMark
					].join('\t')
				);
			});

		lines.push(''); // 구분용 빈 줄

		// Round Results 섹션
		lines.push(`== Round Results ==`);
		lines.push(`Round\tTable\tPlayerA\tPlayerB\tA_Wins\tB_Wins\tA_Draws\tB_Draws\tA_Losses\tB_Losses\tResult\tWinner`);
		(currentEvent.history || []).forEach((roundData, roundIdx) => {
			const roundNo = roundIdx + 1;
			const results = roundData?.results || [];
			results.forEach((res, tableIdx) => {
				const [p1, p2] = res.players || [];
				const aName = rvGetName(p1) || '';
				const bName = rvGetName(p2) || '';
				const rep = res.report || {};
				lines.push(
					[
						roundNo,
						tableIdx + 1,
						aName,
						bName,
						rep.a_wins ?? 0,
						rep.b_wins ?? 0,
						rep.a_draws ?? 0,
						rep.b_draws ?? 0,
						rep.a_losses ?? 0,
						rep.b_losses ?? 0,
						rep.result_type || '',
						res.winner || ''
					].join('\t')
				);
			});
		});

		return lines.join('\n');
	};

	// ===== 액션 핸들러 =====
	const rvHandleCopy = () => {
		const status = element.querySelector('#save-status');
		const text = rvBuildTSV();

		const fallback = () => {
			const ta = document.createElement('textarea');
			ta.value = text;
			document.body.appendChild(ta);
			ta.select();
			const ok = document.execCommand('copy');
			document.body.removeChild(ta);
			if (ok) {
				status.className = 'status-bar success';
				status.textContent = '✅ 클립보드에 복사되었습니다!';
			} else {
				status.className = 'status-bar error';
				status.textContent = '복사에 실패했습니다.';
			}
		};

		if (navigator.clipboard?.writeText) {
			navigator.clipboard.writeText(text)
				.then(() => {
					status.className = 'status-bar success';
					status.textContent = '✅ 클립보드에 복사되었습니다!';
				})
				.catch(fallback);
		} else {
			fallback();
		}
	};

	const rvHandleEmail = async () => {
		const status = element.querySelector('#save-status');
		const input = element.querySelector('#email-to');
		const to = (input?.value || '').trim();
		if (!to) {
			status.className = 'status-bar error';
			status.textContent = '받는 사람 이메일을 입력하세요.';
			return;
		}
		const subject = `Tournament Results - ${currentEvent.date || ''}`;
		const body = rvBuildTSV();

		if (typeof GoogleApi?.sendEmail === 'function') {
			try {
				await GoogleApi.sendEmail({ to, subject, body });
				status.className = 'status-bar success';
				status.textContent = '✅ 이메일을 전송했습니다.';
				return;
			} catch (_) {
				// 실패 시 mailto 폴백
			}
		}

		const mailto = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
		window.location.href = mailto;
		status.className = 'status-bar info';
		status.textContent = '메일 앱이 열리지 않으면 복사한 내용을 수동 전송하세요.';
	};

	const rvHandleSave = async () => {
		if (rvIsSaved) return;
		const saveBtn = element.querySelector('#save-btn');
		const status  = element.querySelector('#save-status');
		if (!saveBtn || !status) return;

		saveBtn.disabled = true;
		saveBtn.textContent = '저장 중...';
		status.className = 'status-bar info';
		status.textContent = '스프레드시트에 모든 결과를 기록하고 있습니다...';

		try {
			await GoogleApi.getConfigMap();
			const newEventId = await GoogleApi.addEvent({
				date: currentEvent.date,
				best_of: currentEvent.settings.bestOf,
				event_format: currentEvent.settings.format,
			});

			const logs = [];
			(currentEvent.history || []).forEach((roundData, roundIdx) => {
				const round_no = roundIdx + 1;
				(roundData.results || []).forEach((res, tableIdx) => {
					const [p1, p2] = res.players || [];
					logs.push({
						event_id: newEventId,
						round_no,
						table_no: tableIdx + 1,
						playerA_id: rvGetId(p1),
						playerB_id: rvGetId(p2),
						...(res.report || {})
					});
				});
			});
			await GoogleApi.addRounds(logs);

			const participantIds = rvPlayers.map(rvGetId).filter(Boolean);
			if (participantIds.length) {
				await GoogleApi.updatePlayerTimestamps(participantIds);
			}

			rvIsSaved = true;
			saveBtn.textContent = '저장 완료';
			status.className = 'status-bar success';
			status.textContent = '✅ 모든 결과가 성공적으로 저장되었습니다!';
		} catch (err) {
			status.className = 'status-bar error';
			status.textContent = `저장 실패: ${err?.message || '알 수 없는 오류'}`;
			saveBtn.disabled = false;
			saveBtn.textContent = '토너먼트 결과 저장';
		}
	};

	// ===== 렌더 =====
	const rvRender = () => {
		const isTemp =
			String(currentEvent.id).startsWith('temp_') ||
			(currentEvent.players || []).some((p) => String(rvGetId(p) || '').startsWith('temp_'));

		element.innerHTML = `
			<h2>최종 순위</h2>
			<div class="table-container">
				<table class="results-table">
					<thead>
						<tr>
							<th>순위</th><th>플레이어</th><th>승점</th>
							<th>승-패-무</th><th>GWP</th><th>OMW%</th>
						</tr>
					</thead>
					<tbody>
						${
							rvStandings
								.filter(([player]) => player !== 'BYE')
								.map(([player, data], index) => {
									const r = rvDropRoundByName[player];
									const chip = r ? `<span class="drop-chip" title="R${r} 드랍">드랍 R${r}</span>` : '';
									return `
										<tr>
											<td>${index + 1}</td>
											<td>${player} ${chip}</td>
											<td>${data.points ?? 0}</td>
											<td>${(data.wins ?? 0)}-${(data.losses ?? 0)}-${(data.draws ?? 0)}</td>
											<td>${rvPct(data.gwp ?? 0)}</td>
											<td>${rvPct(data.omw ?? 0)}</td>
										</tr>
									`;
								})
								.join('')
						}
					</tbody>
				</table>
			</div>

			<div class="section">
				<h3>결과 내보내기</h3>
				<div class="export-row" style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
					<input id="email-to" type="email" placeholder="받는 사람 이메일" style="padding:10px; border:1px solid #dddfe2; border-radius:6px; min-width:240px;">
					<button id="copy-btn" class="primary-btn">클립보드에 복사</button>
					<button id="email-btn" class="secondary-btn">이메일로 보내기</button>
				</div>
				<div id="save-status" class="status-bar" style="margin-top:10px;"></div>
			</div>

			<div class="section">
				<h3>토너먼트 관리</h3>
				${
					isTemp
						? `<p>임시 경기입니다. 필요 시 복사 또는 이메일 전송을 사용하세요.</p>`
						: `<p>결과를 확인하고, 이상이 없다면 스프레드시트에 영구적으로 저장하세요.</p>
						   <button id="save-btn" class="primary-btn">토너먼트 결과 저장</button>`
				}
				<button id="edit-btn" class="secondary">마지막 라운드 수정</button>
			</div>

			<hr>
			<button id="restart-btn" class="secondary">새 토너먼트 시작</button>
		`;
	};

	// ===== 이벤트 바인딩 =====
	element.addEventListener('click', (e) => {
		const id = e.target?.id;
		if (id === 'copy-btn') rvHandleCopy();
		if (id === 'email-btn') rvHandleEmail();
		if (id === 'save-btn') rvHandleSave();
		if (id === 'edit-btn') window.location.hash = '/game';
		if (id === 'restart-btn') {
			setState({ currentEvent: null, players: [], currentRound: 1 });
			window.location.hash = '/';
		}
	});

	rvRender();
	return element;
}
