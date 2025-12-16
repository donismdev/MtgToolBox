function version(){ return "1.0.3"; }
function printVersion(){ console.log("도구 모음 버전: " + version()); }
printVersion();

const $ = (sel, el=document) => el.querySelector(sel);
const $$ = (sel, el=document) => Array.from(el.querySelectorAll(sel));

const state = { board: Array.from({length:9},()=>Array(9).fill(0)), score: 0, combo: 1, activePieces: [], placing: null };
const PIECES = [ [[0,0]], [[0,0],[1,0]], [[0,0],[1,0],[2,0]], [[0,0],[0,1]], [[0,0],[0,1],[0,2]], [[0,0],[1,0],[0,1],[1,1]], [[0,0],[1,0],[2,0],[2,1]], [[0,0],[1,0],[1,1]], [[0,0],[1,0],[0,1],[0,2]], [[0,0],[1,0],[2,0],[3,0]], [[0,0],[0,1],[0,2],[0,3]], [[0,0],[1,0],[2,0],[3,0],[4,0]] ];

const boardEl = $('#board');
const trayEl = $('#tray');
const scoreEl = $('#score');
const comboEl = $('#combo');
const toastEl = $('#toast');

    function buildBoard(){
      boardEl.innerHTML = '';
      for(let r=0;r<9;r++) for(let c=0;c<9;c++){
        const cell=document.createElement('div'); cell.className='bg-gradient-to-b from-gray-900 to-gray-800 rounded-md shadow-inner'; cell.dataset.r=r; cell.dataset.c=c; boardEl.appendChild(cell);
      }
    }

    function reset(){
      state.board = Array.from({length:9},()=>Array(9).fill(0));
      state.score = 0; state.combo = 1; state.activePieces = []; state.placing = null;
      updateScore(0,true); comboEl.textContent='x1';
      $$('.cell',boardEl).forEach(c=>c.classList.remove('filled','outline-2','outline-green-500','-outline-offset-2','outline-red-500'));
      dealPieces();
    }
    $('#btnReset').addEventListener('click', reset);

    function updateScore(delta, force){ if(!force){ state.score += delta; } scoreEl.textContent = state.score.toString(); if(delta>0){ toastEl.textContent = `+${delta}`; toastEl.classList.add('show'); setTimeout(()=>toastEl.classList.remove('show'), 650);} }

    function randomPiece(){ return PIECES[Math.floor(Math.random()*PIECES.length)]; }
    function dealPieces(){ while(state.activePieces.length<3){ state.activePieces.push(randomPiece()); } renderTray(); }

    function bounds(shape){ let w=0,h=0; shape.forEach(([x,y])=>{ w=Math.max(w,x+1); h=Math.max(h,y+1); }); return {w,h}; }
    function pickUnit(){ return getComputedStyle(document.documentElement).getPropertyValue('--u').trim() || '24px'; }

    function renderTray(){
      trayEl.innerHTML='';
      state.activePieces.forEach((shape, idx)=>{
        const p=document.createElement('div'); p.className='p-2 bg-gray-900 border border-gray-700 rounded-xl relative shadow-lg cursor-grab'; p.dataset.idx=idx; p.style.setProperty('--u', pickUnit());
        const g=document.createElement('div'); g.className='grid'; const {w,h}=bounds(shape); g.style.gridTemplateColumns=`repeat(${w}, var(--u))`; g.style.gap='4px';
        for(let y=0;y<h;y++) for(let x=0;x<w;x++){
          const has=shape.some(([sx,sy])=>sx===x && sy===y); if(has){ const b=document.createElement('div'); b.className='w-[var(--u)] h-[var(--u)] rounded-md bg-gradient-to-b from-cyan-400 to-sky-600 shadow-lg'; b.dataset.sx=x; b.dataset.sy=y; g.appendChild(b);} }
        p.appendChild(g);
        p.addEventListener('pointerdown', onPiecePointerDown, {passive:false});
        trayEl.appendChild(p);
      });
    }

    function makeGhost(shape, src){ const ghost = src.cloneNode(true); ghost.classList.add('drag-ghost'); ghost.classList.remove('hidden'); ghost.style.setProperty('--u', pickUnit()); return ghost; }

    function onPiecePointerDown(e){
      e.preventDefault();
      const pieceIdx=Number(e.currentTarget.dataset.idx); const shape=state.activePieces[pieceIdx]; if(!shape) return;
      const t=e.target.closest('.w-\\[var\\(--u\\)\\]'); const ax=t?Number(t.dataset.sx||0):0; const ay=t?Number(t.dataset.sy||0):0;
      const ghost=makeGhost(shape, e.currentTarget); document.body.appendChild(ghost);
      const u=parseFloat(getComputedStyle(ghost).getPropertyValue('--u'))||24; const gap=4, pad=8; const offX=-(ax*(u+gap)+pad), offY=-(ay*(u+gap)+pad);
      ghost.style.transform = `translate(calc(-50% + ${offX}px), calc(-50% + ${offY}px)) scale(1.06)`;
      state.placing={ pieceIdx, shape, ghost, anchor:{ax,ay}, lastX:e.clientX, lastY:e.clientY };
      e.currentTarget.setPointerCapture(e.pointerId);
      document.addEventListener('pointermove', onMove, {passive:false});
      document.addEventListener('pointerup', onUp, { once:true });
      onMove(e);
    }

    function onMove(e){
      if(!state.placing) return; e.preventDefault();
      const { ghost, shape, anchor } = state.placing;
      const dx = e.clientX - (state.placing.lastX||e.clientX);
      const dy = e.clientY - (state.placing.lastY||e.clientY);
      const lead = 0.25; 
      const Lx = e.clientX + dx*lead; const Ly = e.clientY + dy*lead;
      ghost.style.left = Lx + 'px'; ghost.style.top = Ly + 'px';
      state.placing.lastX = Lx; state.placing.lastY = Ly;
      $$('.cell',boardEl).forEach(c=>c.classList.remove('outline-2','outline-green-500','-outline-offset-2','outline-red-500'));
      const tgt=document.elementFromPoint(Lx, Ly);
      if(tgt && tgt.classList.contains('bg-gradient-to-b')){
        const r=Number(tgt.dataset.r), c=Number(tgt.dataset.c);
        const r0=r-(anchor?.ay||0), c0=c-(anchor?.ax||0);
        const ok=canPlace(r0,c0,shape); markHint(r0,c0,shape, ok);
      }
    }

    function onUp(e){
      if(!state.placing) return;
      const { pieceIdx, shape, ghost, anchor, lastX, lastY } = state.placing;
      ghost.remove();
      $$('.cell',boardEl).forEach(c=>c.classList.remove('outline-2','outline-green-500','-outline-offset-2','outline-red-500'));
      const dropX = lastX ?? e.clientX, dropY = lastY ?? e.clientY;
      const tgt=document.elementFromPoint(dropX, dropY);
      if(tgt && tgt.classList.contains('bg-gradient-to-b')){
        const r=Number(tgt.dataset.r), c=Number(tgt.dataset.c);
        const r0=r-(anchor?.ay||0), c0=c-(anchor?.ax||0);
        if(canPlace(r0,c0,shape)){
          place(r0,c0,shape);
          state.activePieces.splice(pieceIdx,1); renderTray(); if(state.activePieces.length===0) dealPieces();
          state.placing=null; return;
        }
      }
      flashBad(); state.placing=null;
    }

    function cellAt(r,c){ return document.querySelector(`.cell[data-r="${r}"][data-c="${c}"]`); }
    function canPlace(r,c,shape){ for(const [dx,dy] of shape){ const rr=r+dy, cc=c+dx; if(rr<0||rr>=9||cc<0||cc>=9) return false; if(state.board[rr][cc]===1) return false; } return true; }
    function markHint(r,c,shape, ok){ for(const [dx,dy] of shape){ const rr=r+dy, cc=c+dx; const cell=cellAt(rr,cc); if(!cell) continue; cell.classList.add('outline-2', ok ? 'outline-green-500' : 'outline-red-500', '-outline-offset-2'); } }
    function place(r,c,shape){ let base=0; for(const [dx,dy] of shape){ const rr=r+dy, cc=c+dx; state.board[rr][cc]=1; cellAt(rr,cc).classList.add('bg-gradient-to-b', 'from-cyan-400', 'to-sky-600'); base+=10; } const cleared=clearLinesAndBoxes(); let bonus=0; if(cleared.total>0){ bonus+=cleared.total*50; } if(cleared.total>1){ state.combo=Math.min(8,state.combo+1);} else if(cleared.total===0){ state.combo=1;} comboEl.textContent='x'+state.combo; const gained=Math.floor((base+bonus)*state.combo); updateScore(gained); }

    function clearLinesAndBoxes(){ const toClear=new Set(); for(let r=0;r<9;r++){ let full=true; for(let c=0;c<9;c++){ if(state.board[r][c]!==1){ full=false; break; } } if(full){ for(let c=0;c<9;c++) toClear.add(r*9+c); } } for(let c=0;c<9;c++){ let full=true; for(let r=0;r<9;r++){ if(state.board[r][c]!==1){ full=false; break; } } if(full){ for(let r=0;r<9;r++) toClear.add(r*9+c); } } for(let br=0;br<3;br++) for(let bc=0;bc<3;bc++){ let full=true; for(let y=0;y<3;y++) for(let x=0;x<3;x++){ if(state.board[br*3+y][bc*3+x]!==1){ full=false; } } if(full){ for(let y=0;y<3;y++) for(let x=0;x<3;x++){ toClear.add((br*3+y)*9+(bc*3+x)); } } } toClear.forEach(key=>{ const r=Math.floor(key/9), c=key%9; state.board[r][c]=0; const cell=cellAt(r,c); if(cell){ cell.classList.remove('bg-gradient-to-b', 'from-cyan-400', 'to-sky-600'); cell.animate([{transform:'scale(1)'},{transform:'scale(.7)'},{transform:'scale(1)'}],{duration:180}); } }); return { total: countRegions(toClear) }; }
    function countRegions(set){ let cnt=0; for(let r=0;r<9;r++){ let all=true; for(let c=0;c<9;c++){ if(!set.has(r*9+c)){ all=false; break; } } if(all) cnt++; } for(let c=0;c<9;c++){ let all=true; for(let r=0;r<9;r++){ if(!set.has(r*9+c)){ all=false; break; } } if(all) cnt++; } for(let br=0;br<3;br++) for(let bc=0;bc<3;bc++){ let all=true; for(let y=0;y<3;y++) for(let x=0;x<3;x++){ if(!set.has((br*3+y)*9+(bc*3+x))){ all=false; } } if(all) cnt++; } return cnt; }

    function flashBad(){ boardEl.classList.add('animate-shake'); setTimeout(()=>boardEl.classList.remove('animate-shake'), 250); }

    buildBoard(); reset();
