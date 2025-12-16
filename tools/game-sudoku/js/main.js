
/* ================= Version & Utils ================= */
function version(){ return "5.2.1"; }
console.log("버전:", version());
const $=(q,el=document)=>el.querySelector(q);
const $$=(q,el=document)=>Array.from(el.querySelectorAll(q));
const idx=(r,c)=>r*9+c;
const rcFrom=i=>[Math.floor(i/9), i%9];

/* ================= Timer ================= */
const Timer=(()=>{ let t0=0, running=false, it=null;
  function start(){ t0=performance.now(); running=true; tick(); }
  function reset(){ t0=performance.now(); running=false; updateBadge(0); stopTick(); }
  function stop(){ running=false; stopTick(); }
  function elapsedMs(){ if(!t0) return 0; return performance.now()-t0; }
  function format(ms){ const total=Math.max(0,Math.floor(ms/1000)); const h=Math.floor(total/3600); const m=Math.floor((total%3600)/60); const s=total%60; const pad=v=>String(v).padStart(2,'0'); return h>0?`${h}:${pad(m)}:${pad(s)}`:`${m}:${pad(s)}`; }
  function updateBadge(v){ const b=$("#timerBadge"); if(b) b.textContent=`⏱ ${format(v)}`; }
  function tick(){ stopTick(); it=setInterval(()=>{ if(!running) return; updateBadge(elapsedMs()); }, 1000); }
  function stopTick(){ if(it) clearInterval(it), it=null; }
  return { start, reset, stop, elapsedMs, format };
})();

/* ================= EventBus ================= */
const Bus=(()=>{const m=new Map();return{on(t,f){if(!m.has(t))m.set(t,new Set());m.get(t).add(f);},off(t,f){m.get(t)?.delete(f);},emit(t,p){m.get(t)?.forEach(fn=>fn(p));}}})();

/* ================= Game ================= */
const Game=(()=>{ const st={ mode:'sudoku', board:Array(81).fill(0), given:Array(81).fill(false), notes1:Array.from({length:81},()=>new Set()), notes2:Array.from({length:81},()=>new Set()), cages:[], selected:-1, undo:[], redo:[], inputMode:'digit', solution:null };
  function snapshot(){return{board:[...st.board],given:[...st.given],notes1:st.notes1.map(s=>new Set([...s])),notes2:st.notes2.map(s=>new Set([...s]))};}
  function restore(s){ st.board=[...s.board]; st.given=[...s.given]; st.notes1=s.notes1.map(x=>new Set([...x])); st.notes2=s.notes2.map(x=>new Set([...x])); }
  function push(){ st.undo.push(snapshot()); if(st.undo.length>200) st.undo.shift(); st.redo.length=0; }
  function _countPlaced(){ let p=0; for(let i=0;i<81;i++){ if(!st.given[i]&&st.board[i]>0) p++; } return p; }
  function progress(){ let play=0; for(let i=0;i<81;i++){ if(!st.given[i]) play++; } return play?(_countPlaced()/play):1; }

  return {
    st, push, restore,
    undo(){ if(!st.undo.length)return; const s=st.undo.pop(); st.redo.push(snapshot()); restore(s); UI.renderAll(); },
    redo(){ if(!st.redo.length)return; const s=st.redo.pop(); st.undo.push(snapshot()); restore(s); UI.renderAll(); },
    select(i){ st.selected=i; UI.renderSelection(); UI.applyRowColHighlight(i);
      if(st.inputMode==='delete' && i>=0 && !st.given[i] && st.board[i]!==0){ push(); st.board[i]=0; st.notes1[i].clear(); st.notes2[i].clear(); UI.renderAll(); }
    },
    setDigit(n){
      if(st.selected<0||st.given[st.selected])return;
      if(st.inputMode==='delete'){ this.clear(); return; }
      push(); st.board[st.selected]=n; st.notes1[st.selected].clear(); st.notes2[st.selected].clear();
      UI.renderAll(); UI.animateMatchingNumbers(n);
      Bus.emit('progress:changed',{mode:st.mode,ratio:progress()});
      if(isSolvedNow()){ Timer.stop(); alert(`축하합니다! 퍼즐을 완료했습니다.\n경과 시간: ${Timer.format(Timer.elapsedMs())}`); }
    },
    clear(){
      if(st.selected<0||st.given[st.selected])return;
      push(); st.board[st.selected]=0; st.notes1[st.selected].clear(); st.notes2[st.selected].clear();
      UI.renderAll();
      Bus.emit('progress:changed',{mode:st.mode,ratio:progress()});
    },
    toggleNote(n){
      if(st.selected<0||st.given[st.selected])return;
      if(st.inputMode==='delete'){ this.clear(); return; }
      push(); const set=(st.inputMode==='note2')?st.notes2[st.selected]:st.notes1[st.selected];
      if(set.has(n)) set.delete(n); else set.add(n);
      UI.renderAll();
    },
    setMode(m){ st.mode=m; },
    setInputMode(m){ st.inputMode=m; UI.updateInputModeButtons(); },
    load(grid,cages,solution){
      st.board=[...grid]; st.given=grid.map(v=>v>0); st.cages=cages||[];
      st.notes1=Array.from({length:81},()=>new Set()); st.notes2=Array.from({length:81},()=>new Set());
      st.selected=-1; st.undo.length=0; st.redo.length=0; st.solution=solution||null;
      UI.renderAll(); Timer.start();
      this.setInputMode('digit');
      // 퍼즐 로딩 시 힌트 개수 리셋
      Hint.initByDifficulty($("#difficulty").value);
    },
    get(){ return st; }
  };
})();

/* ================= UI ================= */
const UI=(()=>{ const boardEl=$("#board");
  for(let r=0;r<9;r++) for(let c=0;c<9;c++){ const cell=document.createElement('div'); cell.className='cell'; cell.dataset.r=r; cell.dataset.c=c; cell.role='gridcell'; cell.addEventListener('click',()=>Input.onCellClick(idx(r,c))); boardEl.appendChild(cell); } 
  const numpadEl=$("#numpad"); for(let n=1;n<=9;n++){ const b=document.createElement('button'); b.textContent=n; b.title=`${n}`; b.addEventListener('click',()=>Input.onDigit(n)); numpadEl.appendChild(b); }

  // 새게임/리셋(확인창)
  $("#newGame").addEventListener('click',()=>{ if(confirm("새로운 게임을 시작합니다.\n현재 진행중인 내용은 사라집니다.\n진행할까요?")) Input.newGame(); });
  $("#resetPuzzle").addEventListener('click',()=>{ if(confirm("현재 퍼즐의 입력과 노트를 모두 지우고\n처음 상태로 다시 시작합니다.\n진행할까요?")){ resetToGivens(); Timer.start(); Hint.resetSame(); }});

  // 모드 버튼들
  $("#modeNote1").addEventListener('click',()=>Game.setInputMode('note1'));
  $("#modeNote2").addEventListener('click',()=>Game.setInputMode('note2'));
  $("#modeDigit").addEventListener('click',()=>Game.setInputMode('digit'));
  $("#btnDelete").addEventListener('click',()=>{
    Game.setInputMode('delete');
    const st=Game.get();
    if(st.selected>=0 && !st.given[st.selected] && st.board[st.selected]!==0) Game.clear();
  });

  $("#mode").onchange=()=>{ Input.newGame(); };
  $("#difficulty").onchange=()=> Input.newGame();
  $("#undo").onclick=()=>Game.undo();
  $("#redo").onclick=()=>Game.redo();

  // 힌트 버튼
  $("#btnHint").onclick=()=> Hint.useOne();

  function animateMatchingNumbers(value){ if(!value)return; $$('.cell',boardEl).forEach((cell)=>{ const numEl=$('.num',cell); if(numEl && parseInt(numEl.textContent)===value){ numEl.classList.add('animate'); numEl.addEventListener('animationend',()=>numEl.classList.remove('animate'),{once:true}); } }); } 
  function renderSelection(){}
  function applyRowColHighlight(i){ $$('.cell').forEach(el=>el.classList.remove('rc-row','rc-col','rc-center')); if(i<0)return; const [r,c]=rcFrom(i); for(let k=0;k<9;k++){ $$('.cell')[idx(r,k)].classList.add('rc-row'); $$('.cell')[idx(k,c)].classList.add('rc-col'); } $$('.cell')[i].classList.add('rc-center'); }

  function conflicts(){
    const st=Game.get(); const bad=new Set();
    function scan(list){ const seen={}; for(const i of list){ const v=st.board[i]; if(!v) continue; if(seen[v]){ bad.add(i); bad.add(seen[v]); } else seen[v]=i; } }
    for(let r=0;r<9;r++) scan([...Array(9)].map((_,k)=>idx(r,k)));
    for(let c=0;c<9;c++) scan([...Array(9)].map((_,k)=>idx(k,c)));
    for(let br=0;br<3;br++) for(let bc=0;bc<3;bc++){ const list=[]; for(let k=0;k<9;k++){ list.push(idx(br*3+Math.floor(k/3), bc*3+k%3)); } scan(list); }
    let badCage=new Set();
    if(st.mode==='killer'&&st.cages?.length){
      for(const cg of st.cages){
        const list=cg.cells.map(([r,c])=>idx(r,c)); let sum=0; const seen={}; let over=false;
        for(const i of list){ const v=st.board[i]; if(v){ sum+=v; if(seen[v]){ badCage.add(i); badCage.add(seen[v]); } else seen[v]=i; } } 
        if(sum>cg.sum) over=true; if(over || (list.every(i=>st.board[i]>0) && sum!==cg.sum)) list.forEach(i=>badCage.add(i));
      }
    }
    return {bad,badCage};
  }

  function renderAll(){
    const st=Game.get();
    $$('.cell',boardEl).forEach((el,i)=>{
      el.innerHTML=''; el.classList.toggle('given', st.given[i]);
      const v=st.board[i];
      if(v){ const s=document.createElement('div'); s.className='num'; s.textContent=v; el.appendChild(s); }
      else { 
        const g=document.createElement('div'); g.className='notes';
        for(let d=1;d<=9;d++){ const n=document.createElement('div'); n.className='note'; if(st.notes1[i].has(d)){ n.classList.add('b'); n.textContent=d; } if(st.notes2[i].has(d)){ n.classList.add('r'); n.textContent=d; } g.appendChild(n); } 
        el.appendChild(g); 
      }
      el.classList.remove('conflict','same','rc-row','rc-col','rc-center');
    });

    if(st.selected>=0 && st.board[st.selected]){ const val=st.board[st.selected]; $$('.cell',boardEl).forEach((el,i)=>{ if(st.board[i]===val) el.classList.add('same'); }); }

    const {bad,badCage}=conflicts();
    bad.forEach(i=>$$('.cell')[i].classList.add('conflict'));
    badCage.forEach(i=>$$('.cell')[i].classList.add('conflict'));

    drawCages();
    applyRowColHighlight(st.selected);
  }

  function drawCages(){
    const st=Game.get();
    $$('.cage-seg',boardEl).forEach(e=>e.remove());
    $$('.cage-sum',boardEl).forEach(e=>e.remove());
    if(st.mode!=='killer'||!st.cages.length)return;
    for(const cg of st.cages){
      const set=new Set(cg.cells.map(([r,c])=>idx(r,c)));
      let min=Infinity,minCell=[0,0];
      for(const [r,c] of cg.cells){ const i=idx(r,c); if(i<min){ min=i; minCell=[r,c]; } }
      const host=$(`.cell[data-r="${minCell[0]}"][data-c="${minCell[1]}"]`);
      const sumEl=document.createElement('div'); sumEl.className='cage-sum'; sumEl.textContent=cg.sum; host.appendChild(sumEl);
      for(const [r,c] of cg.cells){
        const cell=$(`.cell[data-r="${r}"][data-c="${c}"]`);
        const neighbors={top:[r-1,c,'top'],right:[r,c+1,'right'],bottom:[r+1,c,'bottom'],left:[r,c-1,'left']};
        for(const k of Object.keys(neighbors)){
          const [nr,nc,dir]=neighbors[k];
          const inside=nr>=0&&nr<9&&nc>=0&&nc<9&&set.has(idx(nr,nc));
          if(!inside){ const seg=document.createElement('div'); seg.className=`cage-seg seg ${dir}`; cell.appendChild(seg); }
        }
      }
    }
  }

  function updateInputModeButtons(){
    ['modeNote1','modeNote2','modeDigit','btnDelete'].forEach(id=> $("#"+id)?.classList.remove('active'));
    const m=Game.get().inputMode;
    if(m==='note1') $("#modeNote1")?.classList.add('active');
    else if(m==='note2') $("#modeNote2")?.classList.add('active');
    else if(m==='digit') $("#modeDigit")?.classList.add('active');
    else if(m==='delete') $("#btnDelete")?.classList.add('active');
  }

  return { renderAll, renderSelection, applyRowColHighlight, updateInputModeButtons, animateMatchingNumbers };
})();

/* ================= Hint (정답 1칸 공개) ================= */
const Hint=(()=> { 
  const INIT_BY_DIFF = { easy:8, medium:7, hard:6, expert:5 };
  let remain = 0;
  function initByDifficulty(diff){ remain = INIT_BY_DIFF[diff] ?? 6; updateBtn(); }
  function resetSame(){ initByDifficulty($('#difficulty').value); }
  function updateBtn(){ const b=$('#btnHint'); if(!b) return; b.textContent=`힌트 (${remain})`; b.disabled = remain<=0; }
  function useOne(){
    if(remain<=0) return;
    const st=Game.get();
    if(!st.solution){ alert('해답이 없어 힌트를 줄 수 없어요.'); return; }
    const empties=[];
    for(let i=0;i<81;i++){ if(st.board[i]===0 && !st.given[i]) empties.push(i); }
    if(!empties.length){ updateBtn(); return; }
    const i = empties[(Math.random()*empties.length)|0];
    Game.push();
    st.board[i]=st.solution[i];
    st.given[i]=true;
    UI.renderAll();
    remain--;
    updateBtn();
  }
  return { initByDifficulty, resetSame, useOne, updateBtn };
})();

/* ================= Export cages ================= */
function formatCagesForText(){
  const st=Game.get();
  if(st.mode!=='killer'||!st.cages?.length) return `모드: ${st.mode}\n케이지가 없습니다. (킬러 모드에서 생성 후 다시)`;
  const lines=[];
  lines.push(`모드: killer`);
  lines.push(`케이지 개수: ${st.cages.length}`);
  lines.push('');
  st.cages.forEach((cg,i)=>{ const coords=cg.cells.map(([r,c])=>`(${r+1},${c+1})`).join(' '); lines.push(`[${i+1}] sum=${cg.sum} | cells: ${coords}`); });
  const json={mode:'killer', cages: st.cages.map(cg=>({sum:cg.sum,cells:cg.cells.map(([r,c])=>({r:r+1,c:c+1}))}))};
  lines.push('\n--- JSON ---'); lines.push(JSON.stringify(json));
  return lines.join('\n');
}
(function bindExport(){
  const out=$("#cageText");
  $("#exportCages").addEventListener('click',()=>{ out.value=formatCagesForText(); out.scrollTop=0; });
  $("#copyCages").addEventListener('click',async()=>{ const txt=out.value||formatCagesForText(); try{ await navigator.clipboard.writeText(txt); $("#copyCages").textContent='복사됨!'; setTimeout(()=>$("#copyCages").textContent='복사',900);}catch{ out.select(); document.execCommand('copy'); } });
})();

/* ================= Helpers: 리셋/완성 체크 ================= */
function resetToGivens(){
  const st=Game.get(); Game.push();
  for(let i=0;i<81;i++){ if(st.given[i]) continue; st.board[i]=0; st.notes1[i].clear(); st.notes2[i].clear(); }
  UI.renderAll();
}
function isSolvedNow(){
  const st=Game.get();
  if(st.board.some(v=>v===0)) return false;
  if(st.solution && st.solution.length===81){
    for(let i=0;i<81;i++){ if(st.board[i]!==st.solution[i]) return false; }
    return true;
  }
  const row=r=>Array.from({length:9},(_,c)=>r*9+c);
  const col=c=>Array.from({length:9},(_,r)=>r*9+c);
  const box=b=>{const br=Math.floor(b/3)*3,bc=(b%3)*3; return Array.from({length:9},(_,k)=>(br+Math.floor(k/3))*9+(bc+(k%3)));};
  const uniq=a=>{ const s=new Set(a); return s.size===9; };
  for(let r=0;r<9;r++){ const a=row(r).map(i=>Game.get().board[i]); if(!uniq(a)) return false; }
  for(let c=0;c<9;c++){ const a=col(c).map(i=>Game.get().board[i]); if(!uniq(a)) return false; }
  for(let b=0;b<9;b++){ const a=box(b).map(i=>Game.get().board[i]); if(!uniq(a)) return false; }
  if(Game.get().mode==='killer' && Game.get().cages?.length){
    for(const cg of st.cages){
      const vals=cg.cells.map(([r,c])=>st.board[r*9+c]);
      const sum=vals.reduce((s,v)=>s+v,0);
      const set=new Set(vals);
      if(sum!==cg.sum) return false;
      if(set.size!==vals.length) return false;
    }
  }
  return true;
}

/* ================= Killer generation core ================= */
/* LocalSolution */
const LocalSolution=(()=>{ function shuffle(a){for(let i=a.length-1;i>0;i--){const j=(Math.random()*(i+1))|0; [a[i],a[j]]=[a[j],a[i]];} return a;} const pattern=(r,c)=>(r*3+Math.floor(r/3)+c)%9; function build(){ let grid=Array.from({length:9},(_,r)=>Array.from({length:9},(_,c)=>pattern(r,c)+1)); const bands=shuffle([0,1,2]); const rows=bands.flatMap(b=>shuffle([0,1,2]).map(x=>b*3+x)); const stacks=shuffle([0,1,2]); const cols=stacks.flatMap(s=>shuffle([0,1,2]).map(x=>s*3+x)); grid=rows.map(r=>cols.map(c=>grid[r][c])); const perm=shuffle([1,2,3,4,5,6,7,8,9]); grid=grid.map(row=>row.map(v=>perm[v-1])); return grid.flat(); } return {genSolutionArray: build };})();
/* CageGen */
const CageGen=(()=>{ const dirs=[[1,0],[-1,0],[0,1],[0,-1]]; const toI=(r,c)=>r*9+c; const inB=(r,c)=>r>=0&&r<9&&c>=0&&c<9; const rand=a=>a[(Math.random()*a.length)|0]; function crossBias([r,c],nr,nc){return (Math.floor(r/3)!==Math.floor(nr/3)||Math.floor(c/3)!==Math.floor(nc/3))?1.5:1.0;} function makeCagesFromSolution(solution,opt={}){ const {minSize=2,maxSize=4,preferCrossBox=true,allowSingleton=false}=opt; const unused=Array(81).fill(true); const cages=[]; while(true){ let start=-1; for(let i=0;i<81;i++){ if(unused[i]){start=i;break;} } if(start<0) break; let r=(start/9)|0,c=start%9; let target=rand([minSize,minSize+1,maxSize]); const cells=[[r,c]]; let mask=(1<<solution[start]); unused[start]=false; let frontier=[]; for(const [dr,dc] of dirs){ const nr=r+dr,nc=c+dc,k=toI(nr,nc); if(!inB(nr,nc)||!unused[k])continue; const bit=1<<solution[k]; if(mask&bit)continue; frontier.push([nr,nc]); } while(cells.length<target && frontier.length){ let weighted=[]; for(const cand of frontier){ const [nr,nc]=cand; const k=toI(nr,nc); const bit=1<<solution[k]; if(mask&bit)continue; const w=preferCrossBox?crossBias(cells[cells.length-1],nr,nc):1.0; const rep=(w*3)|0||1; for(let t=0;t<rep;t++) weighted.push(cand); } if(!weighted.length) break; const pick=rand(weighted); const pk=toI(pick[0],pick[1]); cells.push(pick); mask|=(1<<solution[pk]); unused[pk]=false; frontier=frontier.filter(([fr,fc])=>!(fr===pick[0]&&fc===pick[1])); for(const [dr,dc] of dirs){ const nr=pick[0]+dr,nc=pick[1]+dc,k=toI(nr,nc); if(!inB(nr,nc)||!unused[k])continue; const bit=1<<solution[k]; if(mask&bit)continue; if(!frontier.some(([rr,cc])=>rr===nr&&cc===nc)) frontier.push([nr,nc]); } } if(cells.length===1 && !allowSingleton){ for(const [dr,dc] of dirs){ const nr=r+dr,nc=c+dc,k=toI(nr,nc); if(!inB(nr,nc)||!unused[k])continue; const bit=1<<solution[k]; if(mask&bit)continue; cells.push([nr,nc]); unused[k]=false; mask|=bit; break; } } let sum=0; for(const [rr,cc] of cells) sum+=solution[toI(rr,cc)]; cages.push({sum,cells}); } return cages; } return {makeCagesFromSolution};})();
/* Smoke/Profiles/UniqueFast 그대로(생성/유일성 보장용) */
const Smoke=(()=>{ function countCombos(k,target){ const nums=[1,2,3,4,5,6,7,8,9]; let cnt=0; function dfs(s,d,sum){ if(d===k){ if(sum===target) cnt++; return; } for(let i=s;i<nums.length;i++){ const v=nums[i]; if(sum+v>target) break; dfs(i+1,d+1,sum+v); } } dfs(0,0,0); return cnt; } function pickSmall(cages,want=4){ const small=cages.filter(c=>c.cells.length<=3); const pool=small.length?small:cages.filter(c=>c.cells.length<=4); const res=[],used=new Set(); while(res.length<want && pool.length){ const i=(Math.random()*pool.length)|0; const cg=pool.splice(i,1)[0]; const key=cg.cells.map(([r,c])=>`${r}-${c}`).join(','); if(!used.has(key)){res.push(cg);used.add(key);} } return res; } function pass(cages,need=2){ const take=3+((Math.random()*3)|0); const sample=pickSmall(cages,take); let tight=0; for(const cg of sample){ const k=cg.cells.length; if(k<2||k>4) continue; const combos=countCombos(k,cg.sum); if(combos===1) tight++; } return tight>=need; } return { pass, _countCombos: countCombos };})();
const KILLER_PROFILES={ easy:{minSize:2,maxSize:3,needTight:4,minCross:6,givens:8}, medium:{minSize:2,maxSize:4,needTight:3,minCross:5,givens:5}, hard:{minSize:2,maxSize:4,needTight:2,minCross:4,givens:2}, expert:{minSize:2,maxSize:4,needTight:2,minCross:3,givens:0} };
function cageStats(cages){ const boxId=(r,c)=>Math.floor(r/3)*3+Math.floor(c/3); let tightCount=0,crossCount=0; for(const cg of cages){ const boxes=new Set(cg.cells.map(([r,c])=>boxId(r,c))); if(boxes.size>=2) crossCount++; const k=cg.cells.length; if(k>=2&&k<=4){ const combos=Smoke._countCombos(k,cg.sum); if(combos<=2) tightCount++; } } return {tightCount,crossCount}; }
function chooseGivens(solArr,k){
  if(k<=0) return Array(81).fill(0);
  const picks=new Set();
  const byBox=Array.from({length:9},()=>[]);
  for(let r=0;r<9;r++) for(let c=0;c<9;c++) byBox[Math.floor(r/3)*3+Math.floor(c/3)].push(r*9+c);
  function shuffle(a){for(let i=a.length-1;i>0;i--){const j=(Math.random()*(i+1))|0; [a[i],a[j]]=[a[j],a[i]];}return a;}
  byBox.forEach(shuffle);
  let iBox=0; while(picks.size<k && iBox<9){ picks.add(byBox[iBox][0]); iBox++; }
  const rest=shuffle([...Array(81).keys()]);
  for(const i of rest){ if(picks.size>=k) break; picks.add(i); }
  const grid=Array(81).fill(0); for(const i of picks) grid[i]=solArr[i]; return grid;
}
const UniqueFast=(()=>{ const toI=(r,c)=>r*9+c;
  function build(grid,cages){ 
    const row=Array.from({length:9},()=>Array(10).fill(false)), 
          col=Array.from({length:9},()=>Array(10).fill(false)), 
          box=Array.from({length:9},()=>Array(10).fill(false));
    const cageOf=Array(81).fill(-1), cageCells=[], tgt=[], used=[], sum=[], empt=[];
    cages?.forEach((cg,id)=>{ cageCells[id]=cg.cells.map(([r,c])=>toI(r,c)); tgt[id]=cg.sum; used[id]=Array(10).fill(false); sum[id]=0; let e=0;
      for(const i of cageCells[id]){ const v=grid[i]||0; if(v>0){used[id][v]=true; sum[id]+=v;} else e++; cageOf[i]=id; } empt[id]=e; });
    for(let r=0;r<9;r++) for(let c=0;c<9;c++){ const i=toI(r,c),v=grid[i]||0; if(!v) continue; row[r][v]=col[c][v]=box[Math.floor(r/3)*3+Math.floor(c/3)][v]=true; }
    return {row,col,box,cageOf,cageCells,tgt,used,sum,empt};
  }
  function feas(v,i,S){ 
    const id=S.cageOf[i]; if(id<0) return true;
    if(S.used[id][v]) return false;
    const remain=S.empt[id]-1;
    const s=S.sum[id]+v, t=S.tgt[id];
    if(s>t) return false;
    const min=remain*(remain+1)/2, max=9*remain-(remain*(remain-1))/2;
    const need=t-s; return (need>=min && need<=max);
  }
  function cand(i,g,S){ 
    const r=(i/9|0),c=i%9,b=(r/3|0)*3+(c/3|0);
    const a=[]; for(let v=1;v<=9;v++){ if(S.row[r][v]||S.col[c][v]||S.box[b][v]) continue; if(!feas(v,i,S)) continue; a.push(v);}
    return a;
  }
  function hasUnique(grid,cages,expect,{limit=2,timeoutMs=150}={}){ 
    const g=grid.slice(); const S=build(g,cages||[]);
    const empty=[]; for(let i=0;i<81;i++) if(!g[i]) empty.push(i);
    function pickMRV(){ let bi=-1,bl=10,bc=null; for(const i of empty){ if(g[i]) continue; const c=cand(i,g,S), L=c.length; if(L===0) return {i,c}; if(L<bl){ bl=L; bi=i; bc=c; if(L===1) break; } } return {i:bi,c:bc||[]}; }
    let count=0; const t0=performance.now();
    function place(i,v){ const r=(i/9|0),c=i%9,b=(r/3|0)*3+(c/3|0), id=S.cageOf[i]; g[i]=v; S.row[r][v]=S.col[c][v]=S.box[b][v]=true; if(id>=0){ S.used[id][v]=true; S.sum[id]+=v; S.empt[id]--; } } 
    function unplace(i,v){ const r=(i/9|0),c=i%9,b=(r/3|0)*3+(c/3|0), id=S.cageOf[i]; g[i]=0; S.row[r][v]=S.col[c][v]=S.box[b][v]=false; if(id>=0){ S.used[id][v]=false; S.sum[id]-=v; S.empt[id]++; } } 
    function dfs(){
      if(performance.now()-t0>timeoutMs) return true;
      let done=true; for(const i of empty){ if(!g[i]){done=false;break;} } 
      if(done){ 
        if(expect){ for(let i=0;i<81;i++){ if((g[i]||0)!==expect[i]){ count=limit; return true; } } } 
        count++; return (count>=limit);
      }
      const {i,c}=pickMRV(); if(i<0 || c.length===0) return false;
      c.sort((a,b)=>{ if(!expect) return 0; const va=(expect[i]===a)?-1:0, vb=(expect[i]===b)?-1:0; return va-vb; });
      for(const v of c){ place(i,v); if(dfs()) return true; unplace(i,v); if(count>=limit) return true; } 
      return false;
    }
    dfs(); return (count===1);
  }
  return { hasUnique };
})();

/* ================= Killer Maker ===== */
async function makeKillerLightSmart(diff='easy', maxTries=30){
  const profile=KILLER_PROFILES[diff]||KILLER_PROFILES.easy;
  let solArr=LocalSolution.genSolutionArray();
  for(let t=0;t<maxTries;t++){
    const cages=CageGen.makeCagesFromSolution(solArr,{minSize:profile.minSize,maxSize:profile.maxSize,preferCrossBox:true,allowSingleton:false});
    const {tightCount,crossCount}=cageStats(cages);
    if(!(tightCount>=profile.needTight && crossCount>=profile.minCross)){ solArr=LocalSolution.genSolutionArray(); continue; }
    const unique=UniqueFast.hasUnique(Array(81).fill(0), cages, solArr, {timeoutMs:150, limit:2});
    if(!unique){ solArr=LocalSolution.genSolutionArray(); continue; }
    const grid=chooseGivens(solArr, profile.givens);
    return { grid, cages, solution: solArr };
  }
  if(diff!=='easy') return await makeKillerLightSmart('easy', 20);
  throw new Error('Killer 라이트 생성 실패');
}

/* ================= Sudoku Maker (로컬) ===== */
const SUDOKU_PROFILE={ easy:36, medium:30, hard:26, expert:22 };
function makeSudokuLocal(diff='easy'){ const sol=LocalSolution.genSolutionArray(); const givens=SUDOKU_PROFILE[diff]??36; const grid=chooseGivens(sol, givens); return { grid, solution: sol }; }

/* ================= Prefetch ================= */
const Prefetch=(()=>{ const sudokuQ=[], killerQ=[]; let sudokuDiff='easy', killerDiff='easy'; let preSud=false, preKil=false;
  function setDiffs({sudoku,killer}){ if(sudoku) sudokuDiff=sudoku; if(killer) killerDiff=killer; }
  async function _fillSudokuOnce(){ if(preSud) return; preSud=true; try{ const {grid,solution}=makeSudokuLocal(sudokuDiff); sudokuQ.push({grid,solution}); } finally{ preSud=false; } }
  async function _fillKillerOnce(){ if(preKil) return; preKil=true; try{ const {grid,cages,solution}=await makeKillerLightSmart(killerDiff,20); killerQ.push({grid,cages,solution}); } finally{ preKil=false; } }
  function ensure(){ if(sudokuQ.length<1) _fillSudokuOnce(); if(killerQ.length<1) _fillKillerOnce(); }
  function popSudoku(){ const p=sudokuQ.shift(); ensure(); return p??null; }
  function popKiller(){ const p=killerQ.shift(); ensure(); return p??null; }
  Bus.on('progress:changed',({mode,ratio})=>{ if(ratio>=0.5){ if(mode==='sudoku'&&sudokuQ.length<1) _fillSudokuOnce(); if(mode==='killer'&&killerQ.length<1) _fillKillerOnce(); }});
  return { setDiffs, popSudoku, popKiller, _fillKillerOnce };
})();

/* ================= Input ================= */
const Input=(()=>{

  function bindKeys(){
    document.addEventListener('keydown',(e)=>{
      const st=Game.get();
      if(e.key==='q'){ Game.setInputMode('note1'); return; }
      if(e.key==='w'){ Game.setInputMode('note2'); return; }
      if(e.key==='e'){ Game.setInputMode('digit'); return; }
      if(e.key==='r'){ Game.setInputMode('delete'); Game.clear(); return; }
      if(st.selected<0) return;
      if(e.key>='1'&&e.key<='9'){
        if(st.inputMode==='digit') Game.setDigit(+e.key);
        else if(st.inputMode==='delete') Game.clear();
        else Game.toggleNote(+e.key);
      }
      if(e.key==='Backspace'||e.key==='Delete'||e.key==='0'){ Game.setInputMode('delete'); Game.clear(); }
    });
  }

  function onCellClick(i){ Game.select(i); }
  function onDigit(n){
    const st=Game.get();
    if(st.inputMode==='digit') Game.setDigit(n);
    else if(st.inputMode==='delete') Game.clear();
    else Game.toggleNote(n);
  }

  async function newGame(){
    const mode=$("#mode").value, diff=$("#difficulty").value;
    Prefetch.setDiffs({sudoku:diff, killer:diff});
    Game.setMode(mode);
    const btn=$("#newGame"); const old=btn.textContent; btn.textContent='생성 중...';
    try{
      if(mode==='sudoku'){
        const ready=Prefetch.popSudoku();
        if(ready) Game.load(ready.grid, [], ready.solution);
        else { const {grid,solution}=makeSudokuLocal(diff); Game.load(grid, [], solution); }
        Prefetch._fillKillerOnce();
      }else{
        const ready=Prefetch.popKiller();
        if(ready) Game.load(ready.grid, ready.cages, ready.solution);
        else { const {grid,cages,solution}=await makeKillerLightSmart(diff,20); Game.load(grid, cages, solution); }
      }
    }catch(e){
      alert('새 퍼즐 생성 실패'); console.error(e);
    } finally { btn.textContent=old; }
  }

  bindKeys();
  return { onCellClick, onDigit, newGame };
})();

/* ================= Init ================= */
(async ()=>{
  const diff=$("#difficulty").value;
  Prefetch.setDiffs({sudoku:diff, killer:diff});
  try{
    const {grid,solution}=makeSudokuLocal(diff);
    Game.load(grid, [], solution);
    Prefetch._fillKillerOnce();
  }catch(e){
    alert('초기 퍼즐 생성 실패'); console.error(e);
  }
})();
