
import { showMenu, hideAllOverlays, applyLifeFontSize, showNumberSelector, showCardSelector } from './ui.js';
import { rollDiceVisual } from '../dice.js';
import { initiativeManager } from '../initiative.js';
import { getSettings, updateSetting, getPlayers } from '../state.js';
import { initializePlayersUI } from './renderer.js';

export function setupEventListeners() {
    document.getElementById('overlay').addEventListener('click', hideAllOverlays);

    document.getElementById('reset-button').addEventListener('click', (e) => {
        const btn = e.currentTarget;

		if (btn.classList.contains('confirm-animation')) {
			initiativeManager.resetAll();

			getPlayers().forEach(p => {
				p.resetLife(getSettings().lifeMax, true);
			});
			
			btn.textContent = window.i18n.t('resetLife');
			btn.classList.remove('confirm-animation');
			hideAllOverlays();
		} else {
			hideAllOverlays();
			// setActiveUI('reset'); // This should be handled in ui.js
			btn.textContent = window.i18n.t('confirm');
			btn.classList.add('confirm-animation');
			document.getElementById('overlay').style.display = 'block';
		}
    });

    document.getElementById('dice-button').addEventListener('click', () => {
		showMenu(document.getElementById('randomMenu'), window.i18n.t('randomSelection'), [window.i18n.t('card'), window.i18n.t('number'), window.i18n.t('dice')], (selection) => {
			if (selection === window.i18n.t('card')) {
				showCardSelector();
			} else if (selection === window.i18n.t('number')) {
				showNumberSelector();
			} else if (selection === window.i18n.t('dice')) {
				showMenu(document.getElementById('diceCountMenu'), window.i18n.t('diceCountToRoll'), [1, 2, 3, 4, 5, 6], (count) => {
					rollDiceVisual(count, getSettings().diceSides);
				});
			}
		});
	});

    document.getElementById('settings-button').addEventListener('click', () => {
        
		const showPlayerCountMenu = () => showMenu(document.getElementById('playerCountMenu'), window.i18n.t('playerCountSelect', { count: getSettings().playerCount }), [2, 3, 4], (count) => {
			updateSetting('playerCount', count);
			initializePlayersUI(count);
			hideAllOverlays();

			if (count === 3) {
				hideAllOverlays();
				showMenu(document.getElementById('three-player-layout-buttons'), window.i18n.t('select3PlayerLayout'), [window.i18n.t('top'), window.i18n.t('bottom'), window.i18n.t('left'), window.i18n.t('right')], (layout) => {
					const layoutMap = { [window.i18n.t('top')]: 'top', [window.i18n.t('bottom')]: 'bottom', [window.i18n.t('left')]: 'left', [window.i18n.t('right')]: 'right' };
					updateSetting('threePlayerLayout', layoutMap[layout]);
					initializePlayersUI(3);
					hideAllOverlays();
				});
			}
		});
		
		const showLifeMenu = () => showMenu(document.getElementById('lifeMaxMenu'), window.i18n.t('startingLifeSelect', { life: getSettings().lifeMax }), [20, 30, 40], (life) => {
            updateSetting('lifeMax', life);
            getPlayers().forEach(p => p.resetLife(life));
            hideAllOverlays();
        });

		const showAdjustDirectionMenu = () => showMenu(
			document.getElementById('settingsMenu'),
			window.i18n.t('lifeAdjustDirection'),
			[window.i18n.t('leftRight'), window.i18n.t('upDown')],
			(selection) => {
                const direction = (selection === window.i18n.t('leftRight')) ? 'horizontal' : 'vertical';
				updateSetting('lifeAdjustDirection', direction);
				hideAllOverlays();
			}
		);

        const showFontMenu = () => showMenu(document.getElementById('fontSizeMenu'), window.i18n.t('fontSizeSelect'), [window.i18n.t('small'), window.i18n.t('medium'), window.i18n.t('large'), window.i18n.t('xLarge')], (selection) => {
            const sizeMap = {[window.i18n.t('small')]: 'small', [window.i18n.t('medium')]: 'medium', [window.i18n.t('large')]: 'large', [window.i18n.t('xLarge')]: 'xlarge'};
            const size = sizeMap[selection];
            updateSetting('lifeFontSize', size);
            applyLifeFontSize(size);
            hideAllOverlays();
        });

        const showDiceSidesMenu = () => showMenu(document.getElementById('diceSidesMenu'), window.i18n.t('diceSidesSelect', { sides: getSettings().diceSides }), [6, 20, 4, 8, 10, 12], (sides) => {
            updateSetting('diceSides', sides);
            hideAllOverlays();
        });

		showMenu(document.getElementById('settingsMenu'), window.i18n.t('settings'), [window.i18n.t('startingLife'), window.i18n.t('fontSize'), window.i18n.t('diceSides')], (selection) => {
            if (selection === window.i18n.t('startingLife')) showLifeMenu();
            else if (selection === window.i18n.t('fontSize')) showFontMenu();
            else if (selection === window.i18n.t('diceSides')) showDiceSidesMenu();
        });
    });

    document.getElementById('toggle-button').addEventListener('click', () => {
        getPlayers().forEach(p => p.closeAllPlayerOptionModals());
        document.getElementById('center-buttons').style.display = 'flex';
        document.getElementById('toggle-button-container').style.display = 'none';
    });

    document.getElementById('close-button').addEventListener('click', () => {
        document.getElementById('center-buttons').style.display = 'none';
        document.getElementById('toggle-button-container').style.display = 'block';
        document.getElementById('overlay').style.display = 'none';
        document.querySelectorAll('.card-picker-container, .number-picker-container').forEach(el => el.remove());
        const resetButton = document.getElementById('reset-button');
        if (resetButton.classList.contains('confirm-animation')) {
            resetButton.textContent = window.i18n.t('resetLife');
            resetButton.classList.remove('confirm-animation');
        }
    });
}

// Global window functions for modal interaction
window.onModalClose = () => {
    if (window.saveLifeTotals) { // This function needs to be refactored out of global scope
        window.saveLifeTotals();
    }
    document.body.classList.remove('modal-mode');
}

window.onModalOpen = () => {
    document.body.classList.add('modal-mode');
}

window.onEmbeddedOpen = () => {}

window.onEmbeddedClose = () => {
    if (window.saveLifeTotals) {
        window.saveLifeTotals();
    }
}
