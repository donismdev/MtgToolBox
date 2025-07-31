import { Player } from './player.js';
import { showMenu, hideAllOverlays, applyLifeFontSize } from './ui.js';
import { rollDiceVisual } from './dice.js';

export function initializePlayers(count) {
    window.gameContainer.innerHTML = '';
    document.body.classList.remove('buttons-raised');
    window.gameContainer.classList.remove('game-layout-3-top', 'game-layout-3-bottom');
    
    window.players = [];
    
    let lifeData = window.dataSpace.lifeCounter;
    let rotationData = window.dataSpace.playerRotations;
    
    if (parseInt(window.dataSpace.settings.playerCount, 10) !== parseInt(count, 10)) {
        lifeData = {};
        rotationData = {};
        if (parseInt(count, 10) === 2) rotationData['player-1'] = 180;
    }
    
    window.localSettings.playerCount = count;

    if (count === 3) {
        const layout = window.localSettings.threePlayerLayout;
        if (layout === 'left' || layout === 'right') document.body.classList.add('buttons-raised');

        const p1 = new Player('player-1', lifeData['player-1'] ?? window.localSettings.lifeMax, rotationData['player-1'] ?? 0);
        const p2 = new Player('player-2', lifeData['player-2'] ?? window.localSettings.lifeMax, rotationData['player-2'] ?? 0);
        const p3 = new Player('player-3', lifeData['player-3'] ?? window.localSettings.lifeMax, rotationData['player-3'] ?? 0);
        window.players.push(p1, p2, p3);

        if (layout === 'left' || layout === 'right') {
            const column = document.createElement('div');
            column.style.cssText = 'display:flex; flex-direction:column; width:50%; height:100%;';
            p2.elements.area.style.cssText = 'height:50%; width:100%;';
            p3.elements.area.style.cssText = 'height:50%; width:100%;';
            column.appendChild(p2.elements.area);
            column.appendChild(p3.elements.area);
            p1.elements.area.style.cssText = 'width:50%; height:100%;';
            if (layout === 'left') {
                window.gameContainer.appendChild(p1.elements.area);
                window.gameContainer.appendChild(column);
            } else {
                window.gameContainer.appendChild(column);
                window.gameContainer.appendChild(p1.elements.area);
            }
        } else {
            window.gameContainer.classList.add(`game-layout-3-${layout}`);
            window.players.forEach(p => window.gameContainer.appendChild(p.elements.area));
        }
    } else {
        for (let i = 0; i < count; i++) {
            const playerId = `player-${i + 1}`;
            const player = new Player(playerId, lifeData[playerId] ?? window.localSettings.lifeMax, rotationData[playerId] ?? 0);
            player.elements.area.classList.add(`player-count-${count}`);
            window.players.push(player);
            window.gameContainer.appendChild(player.elements.area);
        }
    }
}

export function setupEventListeners() {
    window.overlay.addEventListener('click', hideAllOverlays);

    document.getElementById('player-select-button').addEventListener('click', () => {
        showMenu(window.playerCountMenu, '플레이어 수 선택', [2, 3, 4], (count) => {
            initializePlayers(count);
            hideAllOverlays();
            if (count === 3) {
                showMenu(window.threePlayerLayoutButtonsContainer, '3인 레이아웃 선택', ['위', '아래', '왼쪽', '오른쪽'], (layout) => {
                    const layoutMap = {'위':'top', '아래':'bottom', '왼쪽':'left', '오른쪽':'right'};
                    window.localSettings.threePlayerLayout = layoutMap[layout];
                    initializePlayers(3);
                    hideAllOverlays();
                });
            }
        });
    });

    document.getElementById('reset-button').addEventListener('click', (e) => {
        const btn = e.currentTarget;

		if (btn.classList.contains('confirm-animation')) {
			window.players.forEach(p => p.setLife(window.localSettings.lifeMax));
			btn.textContent = '라이프 초기화';
			btn.classList.remove('confirm-animation');
			hideAllOverlays();
		} else {
			hideAllOverlays();
			window.activeUI = 'reset';
			btn.textContent = '확인';
			btn.classList.add('confirm-animation');
			window.overlay.style.display = 'block';
		}
    });

    document.getElementById('dice-button').addEventListener('click', () => {
        showMenu(window.diceCountMenu, '굴릴 주사위 개수', [1, 2, 3, 4, 5, 6], (count) => {
            rollDiceVisual(count, window.localSettings.diceSides);
        });
    });

    document.getElementById('settings-button').addEventListener('click', () => {
        const showLifeMenu = () => showMenu(window.lifeMaxMenu, `시작 라이프 (현재 ${window.localSettings.lifeMax})`, [20, 30, 40], (life) => {
            window.localSettings.lifeMax = life;
            window.players.forEach(p => p.setLife(life));
            hideAllOverlays();
        });

		const showAdjustDirectionMenu = () => showMenu(
			window.settingsMenu,
			'라이프 조절 방향',
			['좌우', '상하'],
			(selection) => {
				window.localSettings.lifeAdjustDirection = (selection === '좌우') ? 'horizontal' : 'vertical';
				hideAllOverlays();
			}
		);

        const showFontMenu = () => showMenu(window.fontSizeMenu, '폰트 크기 선택', ['작음', '보통', '크게', '아주 크게'], (selection) => {
            const sizeMap = {'작음': 'small', '보통': 'medium', '크게': 'large', '아주 크게': 'xlarge'};
            applyLifeFontSize(sizeMap[selection]);
            hideAllOverlays();
        });

        const showDiceSidesMenu = () => showMenu(window.diceSidesMenu, `주사위 면 수 (현재 D${window.localSettings.diceSides})`, [6, 20, 4, 8, 10, 12], (sides) => {
            window.localSettings.diceSides = sides;
            hideAllOverlays();
        });
        
        showMenu(window.settingsMenu, '설정', ['시작 라이프', '폰트 크기', '주사위 면 수', '라이프 조절 방향'], (selection) => {
            if (selection === '시작 라이프') showLifeMenu();
            else if (selection === '폰트 크기') showFontMenu();
            else if (selection === '주사위 면 수') showDiceSidesMenu();
            else if (selection === '라이프 조절 방향') showAdjustDirectionMenu();
        });
    });
}