export function hideAllOverlays() {
    [window.playerCountMenu, window.diceCountMenu, window.settingsMenu, window.lifeMaxMenu, window.fontSizeMenu, window.diceSidesMenu, window.threePlayerLayoutButtonsContainer].forEach(el => el.style.display = 'none');
    window.overlay.style.display = 'none';
    window.centerButtons.style.display = 'flex';

	const resetBtn = document.getElementById('reset-button');

	resetBtn.textContent = '라이프 초기화';
    resetBtn.classList.remove('confirm-animation');

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