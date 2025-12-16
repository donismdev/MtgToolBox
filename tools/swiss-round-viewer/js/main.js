window.i18n.initPromise.then(() => {
    import {
      initGoogleClient, signIn, signOut,
      openSpreadsheetPicker, ensureSignedIn,
      getConfigMap, getPlayers, getEvents, getRounds, getCurrentSpreadsheetId, getAllData,
	  isGoogleInited
    } from './js/google.js';

    // ========== Utilities ==========
    const $ = (s)=>document.querySelector(s);
    const els = {
      btnSignIn:$('#btnSignIn'), btnSignOut:$('#btnSignOut'), btnPick:$('#btnPick'),
      sheetBadge:$('#sheetBadge'), kvMeta:$('#kvMeta'),
      rowsPlayers:$('#rowsPlayers'), rowsEvents:$('#rowsEvents'), rowsRounds:$('#rowsRounds'),
      rowsStandings:$('#rowsStandings'), formatFilter:$('#formatFilter'), badgeScope:$('#badgeScope'),
      tabs:[...document.querySelectorAll('.tab')], panes:{
        standings:$('#pane-standings'), rounds:$('#pane-rounds'), players:$('#pane-players'), events:$('#pane-events'), h2h:$('#pane-h2h')
      }, selA:$('#selA'), selB:$('#selB'), rowsH2H:$('#rowsH2H'), h2hSummary:$('#h2hSummary'), selFmtH2H:$('#selFmtH2H'),
      loading:$('#loading'), eventModal:$('#eventModal'), eventModalTitle:$('#eventModalTitle'), eventDetailBody:$('#eventDetailBody'), btnCloseEvent:$('#btnCloseEvent')
    };

	els.btnSignIn.disabled = true; // 초기화 전 클릭 방지


		function waitForGoogleScripts(timeout = 10000) {
		return new Promise((resolve, reject) => {
			const t0 = Date.now();
			(function tick(){
			if (window.gapi && window.google && window.google.accounts && window.google.picker) return resolve();
			if (Date.now() - t0 > timeout) return reject(new Error(window.i18n.t("googleApiLoadDelay")));
			setTimeout(tick, 50);
			})();
		});
		}

		initGoogleClient(
		(signed)=>{ setAuthedUI(signed); setSheetBadge(); },
		{ readOnly: true, lazyPicker: true }
		).then(async ()=>{
		// 제로클릭: 기존 토큰 있으면 자동 로딩
		const ok = await ensureSignedIn({ interactive: false });
		if (ok && getCurrentSpreadsheetId()) {
			await refreshAll();
		}
		}).catch(e=>{
		console.warn('[viewer boot]', e);
		});

		// 페이지 로드 시 1회: 스크립트 로드 대기 → initGoogleClient → 사일런트 로그인 → 자동 새로고침
		(async () => {
		try {
			await waitForGoogleScripts();
			els.btnSignIn.disabled = false; // 이제 클릭 가능

			// 조용히 토큰 시도(같은 브라우저/세션이면 바로 붙음)
			const ok = await ensureSignedIn({ interactive: false });
			if (ok && getCurrentSpreadsheetId()) await refreshAll();
		} catch (e) {
			console.warn('[viewer boot]', e);
			els.btnSignIn.disabled = false; // 실패해도 수동 로그인은 가능해야 함
		}
		})();


    const DEFAULT_ELO=1500, K=24;
    let players=[], events=[], rounds=[];

    const KNOWN_FORMATS = ['all','cube draft','standard','modern','pioneer','legacy','vintage','pauper','commander','custom'];

    function setLoading(on,msg=window.i18n.t("loadingText")){
      els.loading.querySelector('.loading-text').textContent = msg;
      els.loading.style.display = on ? 'flex' : 'none';
    }
    function setAuthedUI(authed){
		els.btnSignOut.disabled = !authed;
		els.btnSignIn.disabled  = authed;
		// 뷰어는 선택 버튼은 항상 눌러서 로그인 유도 → 피커 띄우게 함
		els.btnPick.disabled    = false;
    }
    function setSheetBadge(){
      const signedIn = !els.btnSignIn.disabled;
      const id=getCurrentSpreadsheetId();
      if(!signedIn){
        els.sheetBadge.textContent=window.i18n.t("loginRequired");
        els.sheetBadge.style.color='#f88';
      } else if(!id){
        els.sheetBadge.textContent=window.i18n.t("sheetNotSelected");
        els.sheetBadge.style.color='#f0c674';
      } else {
        els.sheetBadge.textContent=window.i18n.t("connected");
        els.sheetBadge.style.color='#9fe7a4';
      }
    }
    function escapeHtml(s){ return String(s??'').replace(/[&<>"]/g, m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;"}[m])); }
    function RESULT_BADGE(t){
      const up=String(t||"").toUpperCase();
      if(up==='OK') return "<span class=\"badge-pill status-ok\">"+window.i18n.t("badgeOK")+"</span>";
      if(up==='TIME_OUT') return "<span class=\"badge-pill status-warn\">"+window.i18n.t("badgeTimeOut")+"</span>";
      if(up==='DROP' || up==='DROPPED') return "<span class=\"badge-pill status-bad\">"+window.i18n.t("badgeDrop")+"</span>";
      if(up==='ID' || up==='INTENTIONAL_DRAW') return "<span class=\"badge-pill status-id\">"+window.i18n.t("badgeID")+"</span>";
      if(up==='BYE') return "<span class=\"badge-pill\">"+window.i18n.t("badgeBye")+"</span>";
      return "<span class=\"badge-pill\">"+up+"</span>";
    }

    // Tabs
    els.tabs.forEach(t=>t.addEventListener('click',()=>{
      els.tabs.forEach(x=>x.classList.remove('active'));
      Object.values(els.panes).forEach(p=>p.classList.remove('active'));
      t.classList.add('active');
      els.panes[t.dataset.tab].classList.add('active');
    }));

    // ========== Renderers ========== 
    function renderMeta(meta){
      els.kvMeta.innerHTML='';
      const map = { first_game_date:window.i18n.t("firstGathering"), last_game_date:window.i18n.t("recentGathering"), event_count:window.i18n.t("eventCount") };
      for(const k of Object.keys(map)){
        const v=meta?.[k]??'';
        const div=document.createElement('div');
        div.textContent=`${map[k]}: ${v}`;
        els.kvMeta.appendChild(div);
      }
    }

    function fillFormatFilter(){
      const formats = new Set(KNOWN_FORMATS);
      events.forEach(e=>{ if(e.event_format) formats.add(String(e.event_format)); });
      const arr=[...formats];
      els.formatFilter.innerHTML = arr.map(f=>`<option value="${escapeHtml(f)}">${f}</option>`).join('');
      els.formatFilter.value='all';
      // H2H format select (same options, default all)
      const arr2=[...formats];
      els.selFmtH2H.innerHTML = arr2.map(f=>`<option value="${escapeHtml(f)}">${f}</option>`).join('');
      els.selFmtH2H.value='all';
    }

    function renderEvents(){
      const eventIdToParticipants = buildEventParticipants();
      els.rowsEvents.innerHTML = events.map(e=>{
        const n = (eventIdToParticipants.get(String(e.event_id))||new Set()).size;
        return `<tr>
          <td>${e.event_id}</td><td>${e.date||''}</td><td>${n}${window.i18n.t("personUnit")}</td><td>${e.best_of||''}</td><td>${escapeHtml(e.event_format||'')}</td>
          <td><button class="btn btnDetail" data-eid="${e.event_id}">${window.i18n.t("tableHeaderDetail")}</button></td>
        </tr>`;
      }).join('');
      // wire detail buttons
      document.querySelectorAll('.btnDetail').forEach(btn=>{
        btn.addEventListener('click',()=> openEventDetail(String(btn.dataset.eid)) );
      });
    }

    function renderPlayers(){
      const {participation, firstDate, lastDate} = buildParticipationIndex();
      const rows = players.map(p=>{
        const pid=String(p.player_id);
        const count = participation.get(pid)?.size || 0;
        const first = firstDate.get(pid) || '';
        const last = lastDate.get(pid) || '';
        return `<tr><td>${p.player_id}</td><td>${escapeHtml(p.name)}</td><td>${count}</td><td>${first}</td><td>${last}</td></tr>`;
      }).join('');
      els.rowsPlayers.innerHTML = rows;
      fillPlayerSelects();
    }

    function renderRounds(){
      const nameById=new Map(players.map(p=>[String(p.player_id), p.name]));
      els.rowsRounds.innerHTML = rounds.map(r=>`<tr>
        <td>${r.event_id}</td><td>${r.round_no}</td><td>${r.table_no}
        <td>${escapeHtml(nameById.get(String(r.playerA_id))||r.playerA_id)}</td>
        <td>${r.a_wins}</td><td>${r.a_draws}</td><td>${r.a_losses}</td>
        <td>${escapeHtml(nameById.get(String(r.playerB_id))||r.playerB_id||'')}</td>
        <td>${r.b_wins}</td><td>${r.b_draws}</td><td>${r.b_losses}</td>
        <td>${RESULT_BADGE(r.result_type)}</td>
      </tr>`).join('');
    }

    function fillPlayerSelects(){
      const opts = players.map(p=>`<option value="${p.player_id}">${escapeHtml(p.name)} (#${p.player_id})</option>`).join('');
      els.selA.innerHTML = `<option value="">${window.i18n.t("playerA")}</option>`+opts;
      els.selB.innerHTML = `<option value="">${window.i18n.t("playerB")}</option>`+opts;
    }

    function calcStandings({format='all'}={}){
      const eventById = new Map(events.map(e=>[String(e.event_id), e]));
      const filtered = rounds.filter(r=>{
        const ev=eventById.get(String(r.event_id)); if(!ev) return false;
        return format==='all' ? true : String(ev.event_format)===format;
      });
      const P=new Map(); const opponents=new Map(); const elo=new Map(players.map(p=>[String(p.player_id), DEFAULT_ELO]));
      const nameById=new Map(players.map(p=>[String(p.player_id), p.name]));
      function ensure(id){ if(!P.has(id)) P.set(id,{id, name:nameById.get(id)||id, pts:0,mw:0,ml:0,md:0,gw:0,gl:0,gd:0,matches:0,games:0}); if(!opponents.has(id)) opponents.set(id,new Set()); }
      function addMatch(aId,bId,a_w,a_d,a_l,b_w,b_d,b_l){
        ensure(aId); if(bId) ensure(bId);
        const A=P.get(aId),B=bId?P.get(bId):null;
        const aW=+a_w||0,aD=+a_d||0,aL=+a_l||0; const bW=+b_w||0,bD=+b_d||0,bL=+b_l||0;
        if(aW>bW){A.pts+=3;A.mw++;B&&B.ml++;} else if(aW<bW){B&& (B.pts+=3); A.ml++; B&&B.mw++;} else {A.pts+=1; B&& (B.pts+=1); A.md++; B&&B.md++;}
        A.matches++;A.gw+=aW;A.gd+=aD;A.gl+=aL;A.games+=aW+aD+aL;
        if(B){B.matches++;B.gw+=bW;B.gd+=bD;B.gl+=bL;B.games+=bW+bD+bL; opponents.get(aId).add(bId); opponents.get(bId).add(aId);
          const Ra=elo.get(aId)||DEFAULT_ELO, Rb=elo.get(bId)||DEFAULT_ELO; const Ea=1/(1+Math.pow(10,(Rb-Ra)/400)), Eb=1-Ea; const aRes = aW>bW?1:(aW<bW?0:0.5); const bRes = 1-aRes; elo.set(aId, Ra + K*(aRes - Ea)); elo.set(bId, Rb + K*(bRes - Eb));
        }
      }
      [...filtered].sort((x,y)=> (Number(x.event_id)-Number(y.event_id))||(Number(x.round_no)-Number(y.round_no))||(Number(x.table_no)-Number(y.table_no))).forEach(r=>{
        const a=String(r.playerA_id||''); const b= r.playerB_id? String(r.playerB_id): null; addMatch(a,b, r.a_wins,r.a_draws,r.a_losses, r.b_wins,r.b_draws,r.b_losses);
      });
      for(const s of P.values()){
        s.mwp = s.matches>0 ? (s.pts / (s.matches*3)) : 0;
        s.gwp = s.games>0 ? ((s.gw + 0.5*s.gd) / s.games) : 0;
        s.elo = Math.round(elo.get(String(s.id))||DEFAULT_ELO);
      }
      for(const s of P.values()){
        const opp=[...(opponents.get(s.id)||[])]; if(opp.length===0){ s.omw=0; continue; }
        let sum=0; let cnt=0; for(const oid of opp){ const o=P.get(oid); if(!o) continue; const mwp=o.matches>0 ? Math.max(1/3, o.pts/(o.matches*3)) : 1/3; sum+=mwp; cnt++; }
        s.omw = cnt>0 ? (sum/cnt) : 0;
      }
      const arr=[...P.values()].sort((a,b)=> b.pts-a.pts || b.omw-a.omw || b.gwp-a.gwp || (b.elo-a.elo));
      arr.forEach((s,i)=> s.rank=i+1); return arr;
    }

    function renderStandings(){
      const fmt=els.formatFilter.value||'all';
      const list=calcStandings({format:fmt});
      els.badgeScope.textContent = fmt==='all' ? window.i18n.t("allDataStandard") : `${fmt} ${window.i18n.t("standard")}`;
      els.rowsStandings.innerHTML = list.map(s=>`<tr class="rank-${s.rank}">
        <td>${s.rank}</td><td>${escapeHtml(s.name)}</td><td>${s.pts}
        <td>${s.mw}-${s.ml}-${s.md}</td>
        <td>${(s.mwp*100).toFixed(2)}%</td>
        <td>${(s.omw*100).toFixed(2)}%</td>
        <td>${(s.gwp*100).toFixed(2)}%</td>
        <td>${s.elo}</td>
      </tr>`).join('');
    }

    function renderH2H(){
      const a=els.selA.value, b=els.selB.value; const fmt=els.selFmtH2H.value||'all';
      if(!a||!b||a===b){ els.rowsH2H.innerHTML=''; els.h2hSummary.textContent=''; return; }
      const eventById=new Map(events.map(e=>[String(e.event_id),e])); const nameById=new Map(players.map(p=>[String(p.player_id), p.name]));
      let vs = rounds.filter(r=>{
        const A=String(r.playerA_id||''); const B=String(r.playerB_id||'');
        const ev=eventById.get(String(r.event_id)); if(!ev) return false;
        const okFmt = (fmt==='all') || (String(ev.event_format)===fmt);
        return okFmt && ((A===a && B===b) || (A===b && B===a));
      });
      vs = vs.slice(-10);
      let aW=0,aD=0,aL=0,bW=0,bD=0,bL=0;
      els.rowsH2H.innerHTML = vs.map(r=>{
        const ev=eventById.get(String(r.event_id)); const A=String(r.playerA_id||'');
        const row = (A===a) ? r : { event_id:r.event_id, round_no:r.round_no, table_no:r.table_no, playerA_id:r.playerB_id, playerB_id:r.playerA_id, a_wins:r.b_wins, a_draws:r.b_draws, a_losses:r.b_losses, b_wins:r.a_wins, b_draws:r.a_draws, b_losses:r.a_losses, result_type:r.result_type };
        aW+=+row.a_wins||0; aD+=+row.a_draws||0; aL+=+row.a_losses||0; bW+=+row.b_wins||0; bD+=+row.b_draws||0; bL+=+row.b_losses||0;
        return `<tr><td>${row.event_id}</td><td>${row.round_no}</td><td>${ev?.event_format||''}</td><td>${escapeHtml(nameById.get(a)||a)}</td><td>${row.a_wins}-${row.a_draws}-${row.a_losses}</td><td>${escapeHtml(nameById.get(b)||b)}</td><td>${row.b_wins}-${row.b_draws}-${row.b_losses}</td><td>${RESULT_BADGE(row.result_type)}</td></tr>`;
      }).join('');
      const total=aW+aD+aL; const winRate = total ? (((aW + 0.5*aD) / total) * 100).toFixed(1) : '0.0';
      els.h2hSummary.textContent = `${window.i18n.t("last10GamesTotal")} ${escapeHtml(nameById.get(a)||a)} ${aW}-${aD}-${aL} (${winRate}%)`;
    }

    // ========== Index builders ========== 
    function buildEventParticipants(){
      const map = new Map(); // eventId -> Set(playerId)
      rounds.forEach(r=>{
        const eid=String(r.event_id);
        if(!map.has(eid)) map.set(eid,new Set());
        const S=map.get(eid);
        if(r.playerA_id) S.add(String(r.playerA_id));
        if(r.playerB_id) S.add(String(r.playerB_id));
      });
      return map;
    }

    function buildParticipationIndex(){
      const eventById=new Map(events.map(e=>[String(e.event_id), e]));
      const participation=new Map(); // pid -> Set(eventId)
      const firstDate=new Map();
      const lastDate=new Map();
      rounds.forEach(r=>{
        const eid=String(r.event_id); const ev=eventById.get(eid); const d=ev?.date||'';
        const touch=(pid)=>{
          if(!pid) return;
          const k=String(pid);
          if(!participation.has(k)) participation.set(k,new Set());
          participation.get(k).add(eid);
          if(d){
            if(!firstDate.has(k) || firstDate.get(k)>d) firstDate.set(k,d);
            if(!lastDate.has(k) || lastDate.get(k)<d) lastDate.set(k,d);
          }
        };
        touch(r.playerA_id); touch(r.playerB_id);
      });
      return { participation, firstDate, lastDate };
    }

    // ========== Event detail modal ========== 
    function openEventDetail(eid){
      const e = events.find(x=> String(x.event_id)===String(eid));
      if(!e) return;
      const nameById=new Map(players.map(p=>[String(p.player_id), p.name]));
      const vs = rounds.filter(r=> String(r.event_id)===String(eid));
      const pls = new Set(); vs.forEach(r=>{ if(r.playerA_id) pls.add(String(r.playerA_id)); if(r.playerB_id) pls.add(String(r.playerB_id)); });
      const plist = [...pls].map(pid=> escapeHtml(nameById.get(pid)||pid)).sort((a,b)=> a.localeCompare(b));
      els.eventModalTitle.textContent = `${window.i18n.t("eventHash")}${e.event_id} • ${e.date} • ${e.event_format}`;
      const participantsHtml = `<div class="chips">${plist.map(n=>`<span class="chip">${n}</span>`).join('')||`<span class="chip">${window.i18n.t("noParticipants")}</span>`}</div>`;
      const roundsHtml = `<div class="table-wrap" style="margin-top:10px"><table>
        <thead><tr><th>${window.i18n.t("tableHeaderRound")}</th><th>${window.i18n.t("tableHeaderTable")}</th><th>${window.i18n.t("tableHeaderA")}</th><th>${window.i18n.t("tableHeaderAWLD")}</th><th>${window.i18n.t("tableHeaderB")}</th><th>${window.i18n.t("tableHeaderBWLD")}</th><th>${window.i18n.t("tableHeaderType")}</th></tr></thead>
        <tbody>
          ${vs.map(r=>{
            const A=nameById.get(String(r.playerA_id))||r.playerA_id; const B=nameById.get(String(r.playerB_id))||r.playerB_id||'';
            return `<tr><td>${r.round_no}</td><td>${r.table_no}</td><td>${escapeHtml(A)}</td><td>${r.a_wins}-${r.a_draws}-${r.a_losses}</td><td>${escapeHtml(B)}</td><td>${r.b_wins}-${r.b_draws}-${r.b_losses}</td><td>${RESULT_BADGE(r.result_type)}</td></tr>`;
          }).join('')}
        </tbody></table></div>`;
      els.eventDetailBody.innerHTML = `<div class="kv"><div>${window.i18n.t("participantsCount")} ${plist.length}${window.i18n.t("personUnit")}</div><div>Best of: ${e.best_of||''}</div><div>Format: ${escapeHtml(e.event_format||'')}</div></div>${participantsHtml}${roundsHtml}`;
      els.eventModal.style.display='flex';
      els.eventModal.setAttribute('aria-hidden','false');
    }
    els.btnCloseEvent.addEventListener('click',()=>{ els.eventModal.style.display='none'; els.eventModal.setAttribute('aria-hidden','true'); });
    els.eventModal.addEventListener('click',(ev)=>{ if(ev.target===els.eventModal){ els.btnCloseEvent.click(); } });

    // ========== Load/Init ========== 
    async function refreshAll(){
		setSheetBadge(); setLoading(true,window.i18n.t("loadingDataFromSheet"));
		try{
			const { meta, players: p, events: e, rounds: r } = await getAllData();
			players=p; events=e; rounds=r;
			renderMeta(meta); renderPlayers(); renderEvents(); renderRounds(); fillFormatFilter(); renderStandings();
		}catch(err){ console.error(err); alert(window.i18n.t("dataLoadingFailed") + (err?.message||err)); }
		finally{ setLoading(false); }
    }

    // Wire up
    els.btnSignIn.addEventListener('click', async () => {
		try{
			const ok = await ensureSignedIn({ interactive: true });
			if (!ok) return;

			// 시트가 이미 있으면 바로 로딩, 없으면 피커 자동 오픈
			const has = getCurrentSpreadsheetId();
			if (!has) {
			await openSpreadsheetPicker({ title: window.i18n.t("selectSpreadsheet") });
			}
			await refreshAll();
		}catch(err){
			console.error(err);
			alert(window.i18n.t("loginSelectionFailed") + (err?.message || err));
		}
	});

    els.btnSignOut.addEventListener('click', ()=>{ signOut(); setAuthedUI(false); setSheetBadge(); });
    els.btnPick.addEventListener('click', async () => {
	try{
		// 항상 시도: 비로그인 상태에서도 이 버튼으로 즉시 로그인 유도
		const ok = await ensureSignedIn({ interactive: true });
		if (!ok) return;

		await openSpreadsheetPicker({ title: window.i18n.t("selectSpreadsheet") });
		setLoading(true, window.i18n.t("loadingDataFromSheet"));
		setSheetBadge();
		await refreshAll();
	}catch(e){
		console.error(e);
		alert(window.i18n.t("selectionCancelledFailed") + (e?.message || e));
	}finally{
		setLoading(false);
	}
	});

    // interactions
    document.getElementById('formatFilter').addEventListener('change', renderStandings);
    document.getElementById('btnH2H').addEventListener('click', renderH2H);
});
