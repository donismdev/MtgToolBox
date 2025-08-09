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
    resetBtn.textContent = '라이프 초기화';
    resetBtn.classList.remove('confirm-animation');
    
    const customPicker = document.querySelector('.card-picker-container, .number-picker-container');
    if (customPicker) {
        customPicker.remove();
    }

    window.activeUI = null;
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

// 1. 숫자 뽑기 UI 생성 및 로직 처리
export function showNumberSelector() {
    hideAllOverlays();
    window.overlay.style.display = 'block';
    window.activeUI = 'number-picker';

    const container = document.createElement('div');
    container.className = 'number-picker-container';

    const title = document.createElement('div');
    title.className = 'number-picker-title';
    title.textContent = '최대 숫자 선택';
    
    const sliderWrapper = document.createElement('div');
    sliderWrapper.className = 'slider-wrapper';
    
    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = 0;
    slider.max = 50;
    slider.value = 20;

    const valueDisplay = document.createElement('span');
    valueDisplay.textContent = slider.value;
    
    slider.oninput = () => { valueDisplay.textContent = slider.value; };
    
    valueDisplay.onclick = () => {
        const newValue = prompt('최대값을 직접 입력하세요 (0~999):', slider.value);
        if (newValue !== null && !isNaN(newValue) && newValue >= 0 && newValue < 1000) {
            slider.max = newValue;
            slider.value = newValue;
            valueDisplay.textContent = newValue;
        }
    };

    sliderWrapper.append(slider, valueDisplay);

    const randomButton = document.createElement('button');
    randomButton.className = 'random-number-button';
    randomButton.textContent = '뽑기';
    
    randomButton.onclick = () => {
        const max = parseInt(slider.value, 10);
        const result = Math.floor(Math.random() * (max + 1));
        
        // 기존 주사위 UI를 재활용하여 결과 표시
        // rollDiceVisual 함수가 세 번째 인자로 미리 정해진 결과를 받을 수 있도록 수정이 필요할 수 있습니다.
        // 예: rollDiceVisual(1, max, [result]);
        rollDiceVisual(1, max, [result]); // 
        
        container.remove(); // 숫자 뽑기 창은 닫기
    };
    
    container.append(title, sliderWrapper, randomButton);
    document.body.appendChild(container);
}

// 2. 카드 뽑기 UI 생성 및 로직 처리
export function showCardSelector() {
    hideAllOverlays();
    showMenu(window.settingsMenu, '전체 카드 수 선택', [2, 3, 4, 5, 6, 7], (totalCards) => {
        totalCards = parseInt(totalCards, 10);
        const pickOptions = Array.from({ length: totalCards }, (_, i) => i + 1);
        showMenu(window.settingsMenu, '선택할 카드 수', pickOptions, (numToPick) => {
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
