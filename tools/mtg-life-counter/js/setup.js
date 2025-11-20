import { Player } from './player.js';
import { showMenu, hideAllOverlays, applyLifeFontSize, showNumberSelector, showCardSelector } from './ui.js';
import { rollDiceVisual } from './dice.js';
import { initiativeManager } from './initiative.js';
import { allThemes } from './themes.js';

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

	const defaultThemeNames = [
		allThemes.dark[0].name,
		allThemes.light[0].name,
		allThemes.dark[1].name,
		allThemes.light[1].name
    ];

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
            
            // --- 이 부분을 아래와 같이 수정합니다 ---
            let rotation; // 변수를 미리 선언만 해둡니다.

            // 플레이어 수에 따라 초기 회전값을 결정합니다.
            // 2인 또는 4인 게임에서는 저장된 회전값(rotationData)을 무시하고
            // 고정된 레이아웃을 우선 적용합니다.
            if (count === 2) {
                rotation = (i === 0) ? 180 : 0;
            } else if (count === 4) {
                // 상단 두 명(인덱스 0, 1)은 180도, 하단 두 명(인덱스 2, 3)은 0도로 설정
                rotation = (i < 2) ? 180 : 0;
            } else {
                // 그 외의 경우(예: 1인 모드)는 저장된 값을 사용합니다.
                rotation = rotationData[playerId] ?? 0;
            }
            // --- 수정 끝 ---

			const player = new Player(playerId, lifeData[playerId] ?? window.localSettings.lifeMax, rotation, defaultThemeNames[i] ?? i);
            
            // [추가] 생성 직후 'start' 로그 기록
            player.logEvent('start', { lifeAfter: player.life });

            player.elements.area.classList.add(`player-count-${count}`);
            window.players.push(player);
            window.gameContainer.appendChild(player.elements.area);
        }
    }
    requestAnimationFrame(() => {
        window.players.forEach(p => p.updateRotationClass());
    });
}

export function setupEventListeners() {
    window.overlay.addEventListener('click', hideAllOverlays);

    document.getElementById('reset-button').addEventListener('click', (e) => {
        const btn = e.currentTarget;

		if (btn.classList.contains('confirm-animation')) {

			initiativeManager.resetAll();

			window.players.forEach(p => {
				p.resetLife(window.localSettings.lifeMax, true);
			});
			
			btn.textContent = window.i18n.t('resetLife');
			btn.classList.remove('confirm-animation');
			hideAllOverlays();
		} else {
			hideAllOverlays();
			window.activeUI = 'reset';
			btn.textContent = window.i18n.t('confirm');
			btn.classList.add('confirm-animation');
			window.overlay.style.display = 'block';
		}
    });

    document.getElementById('dice-button').addEventListener('click', () => {

		showMenu(window.randomMenu, window.i18n.t('randomSelection'), [window.i18n.t('card'), window.i18n.t('number'), window.i18n.t('dice')], (selection) => {
			if (selection === window.i18n.t('card')) {
				showCardSelector();
			} else if (selection === window.i18n.t('number')) {
				showNumberSelector();
			} else if (selection === window.i18n.t('dice')) {
				showMenu(window.diceCountMenu, window.i18n.t('diceCountToRoll'), [1, 2, 3, 4, 5, 6], (count) => {
					rollDiceVisual(count, window.localSettings.diceSides);
				});
			}
		});
	});

    document.getElementById('settings-button').addEventListener('click', () => {
        
		const showPlayerCountMenu = () => showMenu(window.playerCountMenu, window.i18n.t('playerCountSelect', { count: window.localSettings.playerCount }), [2, 3, 4], (count) => {
			window.localSettings.playerCount = count;
			initializePlayers(count);
			hideAllOverlays();

			if (count === 3) {
				hideAllOverlays();
				showMenu(window.threePlayerLayoutButtonsContainer, window.i18n.t('select3PlayerLayout'), [window.i18n.t('top'), window.i18n.t('bottom'), window.i18n.t('left'), window.i18n.t('right')], (layout) => {
					const layoutMap = { [window.i18n.t('top')]: 'top', [window.i18n.t('bottom')]: 'bottom', [window.i18n.t('left')]: 'left', [window.i18n.t('right')]: 'right' };
					window.localSettings.threePlayerLayout = layoutMap[layout];
					initializePlayers(3);
					hideAllOverlays();
				});
			}
		});
		
		const showLifeMenu = () => showMenu(window.lifeMaxMenu, window.i18n.t('startingLifeSelect', { life: window.localSettings.lifeMax }), [20, 30, 40], (life) => {
            window.localSettings.lifeMax = life;
            window.players.forEach(p => p.resetLife(life));
            hideAllOverlays();
        });

		const showAdjustDirectionMenu = () => showMenu(
			window.settingsMenu,
			window.i18n.t('lifeAdjustDirection'),
			[window.i18n.t('leftRight'), window.i18n.t('upDown')],
			(selection) => {
				window.localSettings.lifeAdjustDirection = (selection === window.i18n.t('leftRight')) ? 'horizontal' : 'vertical';
				hideAllOverlays();
			}
		);

        const showFontMenu = () => showMenu(window.fontSizeMenu, window.i18n.t('fontSizeSelect'), [window.i18n.t('small'), window.i18n.t('medium'), window.i18n.t('large'), window.i18n.t('xLarge')], (selection) => {
            const sizeMap = {[window.i18n.t('small')]: 'small', [window.i18n.t('medium')]: 'medium', [window.i18n.t('large')]: 'large', [window.i18n.t('xLarge')]: 'xlarge'};
            applyLifeFontSize(sizeMap[selection]);
            hideAllOverlays();
        });

        const showDiceSidesMenu = () => showMenu(window.diceSidesMenu, window.i18n.t('diceSidesSelect', { sides: window.localSettings.diceSides }), [6, 20, 4, 8, 10, 12], (sides) => {
            window.localSettings.diceSides = sides;
            hideAllOverlays();
        });

		showMenu(window.settingsMenu, window.i18n.t('settings'), [window.i18n.t('startingLife'), window.i18n.t('fontSize'), window.i18n.t('diceSides')], (selection) => {
            if (selection === window.i18n.t('startingLife')) showLifeMenu();
            else if (selection === window.i18n.t('fontSize')) showFontMenu();
            else if (selection === window.i18n.t('diceSides')) showDiceSidesMenu();
        });
    });
}
