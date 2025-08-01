import { Player } from './player.js';
import { showMenu, hideAllOverlays, applyLifeFontSize } from './ui.js';
import { rollDiceVisual } from './dice.js';

export function initializePlayers(count) {
    window.gameContainer.innerHTML = '';

    // 초기화: 관련 클래스 모두 제거
    document.body.classList.remove(
        'buttons-raised',
        'buttons-left',
        'buttons-right'
    );
    window.gameContainer.classList.remove(
        'game-layout-3-top',
        'game-layout-3-bottom'
    );

    window.players = [];

    let lifeData = window.dataSpace.lifeCounter;
    let rotationData = window.dataSpace.playerRotations;
    let themeData = window.dataSpace.themeData;

    if (parseInt(window.dataSpace.settings.playerCount, 10) !== parseInt(count, 10)) {
        lifeData = {};
        rotationData = {};
        themeData = {};
    }

    window.localSettings.playerCount = count;

    if (count === 3) {
        const layout = window.localSettings.threePlayerLayout;

        const p1 = new Player('player-1', lifeData['player-1'] ?? window.localSettings.lifeMax, rotationData['player-1'] ?? 0, themeData['player-1'] ?? 0);
        const p2 = new Player('player-2', lifeData['player-2'] ?? window.localSettings.lifeMax, rotationData['player-2'] ?? 0, themeData['player-2'] ?? 1);
        const p3 = new Player('player-3', lifeData['player-3'] ?? window.localSettings.lifeMax, rotationData['player-3'] ?? 0, themeData['player-3'] ?? 2);
        
        // [추가] 생성 직후 'start' 로그 기록
        p1.logEvent('start', { lifeAfter: p1.life });
        p2.logEvent('start', { lifeAfter: p2.life });
        p3.logEvent('start', { lifeAfter: p3.life });

        window.players.push(p1, p2, p3);

        if (layout === 'left' || layout === 'right') {
            document.body.classList.add(layout === 'left' ? 'buttons-right' : 'buttons-left');

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
            // top 또는 bottom
            window.gameContainer.classList.add(`game-layout-3-${layout}`);
            window.players.forEach(p => window.gameContainer.appendChild(p.elements.area));
        }
    } else {
        // 2인 / 4인
        for (let i = 0; i < count; i++) {
            const playerId = `player-${i + 1}`;
            let rotation = rotationData[playerId] ?? 0;
            if (count === 2) {
                if (i === 0) rotation = 180;
                if (i === 1) rotation = 0;
            }
            const player = new Player(playerId, lifeData[playerId] ?? window.localSettings.lifeMax, rotation, themeData[playerId] ?? i);
            
            // [추가] 생성 직후 'start' 로그 기록
            player.logEvent('start', { lifeAfter: player.life });

            player.elements.area.classList.add(`player-count-${count}`);
            window.players.push(player);
            window.gameContainer.appendChild(player.elements.area);
        }
    }
    window.players.forEach(p => p.updateRotationClass());
}

export function setupEventListeners() {
    window.overlay.addEventListener('click', hideAllOverlays);

    document.getElementById('reset-button').addEventListener('click', (e) => {
        const btn = e.currentTarget;

		if (btn.classList.contains('confirm-animation')) {
	
			window.players.forEach(p => {
				p.setLife(window.localSettings.lifeMax, true);
				p.playIntroAnimation?.();  // 등장 애니메이션 재생
			});
			
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
        
		const showPlayerCountMenu = () => showMenu(window.playerCountMenu, `플레이어 수 선택 (현재 ${window.localSettings.playerCount})`, [2, 3, 4], (count) => {
			window.localSettings.playerCount = count;
			initializePlayers(count);
			hideAllOverlays();

			if (count === 3) {
				hideAllOverlays();
				showMenu(window.threePlayerLayoutButtonsContainer, '3인 레이아웃 선택', ['위', '아래', '왼쪽', '오른쪽'], (layout) => {
					const layoutMap = { '위': 'top', '아래': 'bottom', '왼쪽': 'left', '오른쪽': 'right' };
					window.localSettings.threePlayerLayout = layoutMap[layout];
					initializePlayers(3);
					hideAllOverlays();
				});
			}
		});
		
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

        // showMenu(window.settingsMenu, '설정', ['플레이어 수', '시작 라이프', '폰트 크기', '주사위 면 수', '라이프 조절 방향'], (selection) => {
        //     if (selection === '플레이어 수') { hideAllOverlays(); showPlayerCountMenu(); }
        //     else if (selection === '시작 라이프') showLifeMenu();
        //     else if (selection === '폰트 크기') showFontMenu();
        //     else if (selection === '주사위 면 수') showDiceSidesMenu();
        //     else if (selection === '라이프 조절 방향') showAdjustDirectionMenu();
        // });

		showMenu(window.settingsMenu, '설정', ['시작 라이프', '폰트 크기', '주사위 면 수', '라이프 조절 방향'], (selection) => {
            if (selection === '시작 라이프') showLifeMenu();
            else if (selection === '폰트 크기') showFontMenu();
            else if (selection === '주사위 면 수') showDiceSidesMenu();
            else if (selection === '라이프 조절 방향') showAdjustDirectionMenu();
        });
    });
}
