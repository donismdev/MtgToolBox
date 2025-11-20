import { rollDiceVisual } from './dice.js';

// ✅ [수정] 새로운 메뉴(randomMenu)를 숨기는 목록에 추가합니다.
export function hideAllOverlays() {
    // 1. 모든 메뉴 숨기기 (기존 코드)
    [
        window.playerCountMenu, window.diceCountMenu, window.settingsMenu, 
        window.lifeMaxMenu, window.fontSizeMenu, window.diceSidesMenu, 
        window.threePlayerLayoutButtonsContainer, window.randomMenu
    ].forEach(el => {
        if (el) el.style.display = 'none';
    });

	const globalDiceContainer = document.getElementById('global-dice-container');
    if (globalDiceContainer) {
        globalDiceContainer.innerHTML = '';
    }

    // 2. ✅ [추가] 모든 플레이어의 주사위 관련 UI를 깨끗하게 정리합니다.
    if (window.players) {
        window.players.forEach(p => {
            if (p.elements.diceContainer) {
                p.elements.diceContainer.style.display = 'none'; // 주사위 컨테이너 숨기기
                p.elements.diceContainer.innerHTML = ''; // 내용 비우기
            }
            p.elements.area.classList.remove('dice-rolling'); // 배경 흐림 효과 제거
            
            // 힌트 업데이트 (기존 코드)
            if (typeof p.updateHint === 'function') {
                p.updateHint();
            }
        });
    }

    // 3. 나머지 정리 (기존 코드)
    window.overlay.style.display = 'none';
    window.centerButtons.style.display = 'flex';

    const resetBtn = document.getElementById('reset-button');
    resetBtn.textContent = window.i18n.t('resetLife');
    resetBtn.classList.remove('confirm-animation');
    
    const customPicker = document.querySelector('.card-picker-container, .number-picker-container');
    if (customPicker) {
        customPicker.remove();
    }

    window.activeUI = null;

	const pickers = document.querySelectorAll('.card-picker-container, .number-picker-container');
	pickers.forEach(el => el.remove());
}

export function showMenu(container, labelText, options, onSelect) {
    window.activeUI = 'menu'; // 메뉴가 열리면 activeUI 상태 변경
    container.innerHTML = `<div class="dice-menu-label">${labelText}</div>`;
    const group = document.createElement('div');
    group.className = 'dice-option-group';
    options.forEach(opt => {
        const btn = document.createElement('button');
        btn.className = 'dice-option';
        btn.textContent = opt;
        btn.onclick = () => onSelect(opt);
        group.appendChild(btn);
    });
    container.appendChild(group);
    container.style.display = 'flex';
    window.overlay.style.display = 'block';
    window.centerButtons.style.display = 'none';
    container.style.top = '40%';
}

export function applyLifeFontSize(size) {
    document.body.classList.remove('font-size-small', 'font-size-medium', 'font-size-large', 'font-size-xlarge');
    document.body.classList.add(`font-size-${size}`);
    window.localSettings.lifeFontSize = size;
}

function ensureRangeStyles() {
  if (document.getElementById('range-fix-styles')) return;
  const css = `
  .number-picker-container input[type="range"]{
    -webkit-appearance:none; appearance:none;
    width:100%; height:18px; background:transparent;
    opacity:1 !important;               /* 혹시 전역에서 0으로 만든 경우 대비 */
    pointer-events:auto !important;
  }
  /* WebKit (Chrome/Safari/Edge Chromium) */
  .number-picker-container input[type="range"]::-webkit-slider-runnable-track{
    height:6px; background:rgba(255,255,255,.28); border-radius:999px;
  }
  .number-picker-container input[type="range"]::-webkit-slider-thumb{
    -webkit-appearance:none;
    width:18px; height:18px; border-radius:50%; background:#fff; border:none;
    margin-top:-6px; /* 트랙 높이 6px 기준 중앙 정렬 */
    box-shadow:0 1px 3px rgba(0,0,0,.35);
  }
  /* Firefox */
  .number-picker-container input[type="range"]::-moz-range-track{
    height:6px; background:rgba(255,255,255,.28); border-radius:999px;
  }
  .number-picker-container input[type="range"]::-moz-range-thumb{
    width:18px; height:18px; border-radius:50%; background:#fff; border:none;
    box-shadow:0 1px 3px rgba(0,0,0,.35);
  }
  /* Old Edge/IE */
  .number-picker-container input[type="range"]::-ms-track{
    height:6px; background:transparent; border-color:transparent; color:transparent;
  }
  .number-picker-container input[type="range"]::-ms-fill-lower,
  .number-picker-container input[type="range"]::-ms-fill-upper{
    background:rgba(255,255,255,.28); border-radius:999px;
  }
  .number-picker-container input[type="range"]::-ms-thumb{
    width:18px; height:18px; border-radius:50%; background:#fff; border:none;
  }
  `;
  const style = document.createElement('style');
  style.id = 'range-fix-styles';
  style.textContent = css;
  document.head.appendChild(style);
}

// 1. 숫자 뽑기 UI 생성 및 로직 처리
export function showNumberSelector() {
  hideAllOverlays();
  window.overlay.style.display = 'block';
  window.activeUI = 'number-picker';

  // ✅ 슬라이더 스타일 보장
  ensureRangeStyles();

  const container = document.createElement('div');
  container.className = 'number-picker-container';
  // (필요시 가시성 강화용 배경 등)
  Object.assign(container.style, {
    position:'fixed', left:'50%', top:'50%', transform:'translate(-50%,-50%)',
    zIndex:'10002', background:'rgba(24,26,32,.98)', borderRadius:'12px',
    padding:'16px 18px', boxShadow:'0 12px 40px rgba(0,0,0,.5)',
    maxWidth:'420px', width:'min(90%, 420px)'
  });

  const title = document.createElement('div');
  title.className = 'number-picker-title';
  title.textContent = window.i18n.t('selectMaxNumber');

  const sliderWrapper = document.createElement('div');
  sliderWrapper.className = 'slider-wrapper';
  Object.assign(sliderWrapper.style, { width:'100%', gap:'8px', display:'flex', alignItems:'center' });

  const slider = document.createElement('input');
  slider.type = 'range';
  slider.min = 0; slider.max = 50; slider.value = 20;
  slider.style.flex = '1 1 auto';   // ✅ 너비 확보

  const valueDisplay = document.createElement('span');
  valueDisplay.textContent = slider.value;

  slider.oninput = () => { valueDisplay.textContent = slider.value; };

  valueDisplay.onclick = () => {
    const newValue = prompt(window.i18n.t('promptMaxNumber'), slider.value);
    if (newValue !== null && !isNaN(newValue) && newValue >= 0 && newValue < 1000) {
      slider.max = newValue;
      slider.value = newValue;
      valueDisplay.textContent = newValue;
    }
  };

  sliderWrapper.append(slider, valueDisplay);

  const randomButton = document.createElement('button');
  randomButton.className = 'random-number-button';
  randomButton.textContent = window.i18n.t('pick');
  randomButton.onclick = () => {
    const max = parseInt(slider.value, 10);
    const result = Math.floor(Math.random() * (max + 1));
    rollDiceVisual(1, max, [result]);
    container.remove(); // 숫자 뽑기 창 닫기 (overlay는 기존 로직대로 다른 곳에서 닫음)
  };

  container.append(title, sliderWrapper, randomButton);
  document.body.appendChild(container);
}

// 2. 카드 뽑기 UI 생성 및 로직 처리
export function showCardSelector() {
    hideAllOverlays();
    showMenu(window.settingsMenu, window.i18n.t('totalCardSelect'), [2, 3, 4, 5, 6, 7], (totalCards) => {
        totalCards = parseInt(totalCards, 10);
        const pickOptions = Array.from({ length: totalCards }, (_, i) => i + 1);
        showMenu(window.settingsMenu, window.i18n.t('cardsToSelect'), pickOptions, (numToPick) => {
            numToPick = parseInt(numToPick, 10);
            // 이 부분이 새 함수를 호출하도록 변경됩니다.
            displayCardResult(totalCards, numToPick); 
        });
    });
}

// (내부 헬퍼 함수이므로 export 불필요)
function displayCardResult(totalCards, numToPick) {
    hideAllOverlays();
    window.overlay.style.display = 'block';
    window.activeUI = 'card-picker'; // hideAllOverlays가 닫을 수 있도록 상태 설정

    // 카드 컨테이너 생성
    const cardContainer = document.createElement('div');
    cardContainer.className = 'card-picker-container';

    // "선택된" 카드의 인덱스를 미리 무작위로 정해둠
    const selectedIndexes = new Set();
    const allIndexes = Array.from({ length: totalCards }, (_, i) => i);
    while (selectedIndexes.size < numToPick) {
        const randomIndex = Math.floor(Math.random() * allIndexes.length);
        const [pickedIndex] = allIndexes.splice(randomIndex, 1);
        selectedIndexes.add(pickedIndex);
    }

    // 카드 DOM 요소 생성 (인터랙션 없음)
    for (let i = 0; i < totalCards; i++) {
        const card = document.createElement('div');
        card.className = 'card-back';

        // 해당 카드가 선택된 카드인지 확인하고 'selected' 클래스 추가
        if (selectedIndexes.has(i)) {
            card.classList.add('selected');
        }
        cardContainer.appendChild(card);
    }
    document.body.appendChild(cardContainer);
}
