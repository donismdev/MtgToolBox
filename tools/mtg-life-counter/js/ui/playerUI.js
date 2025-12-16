
import { allThemes } from '../themes.js';
import { initiativeManager } from '../initiative.js';
import * as secretNotes from '../secretNotes.js';
import { OptionsModal } from '../OptionsModal.js';
import { CountersViewerModal } from '../CountersViewerModal.js';
import { LifeLogOverlay } from '../LifeLogOverlay.js';
import { ThemeSelectorOverlay } from '../ThemeSelectorOverlay.js';
import { TimerOverlay } from '../TimerOverlay.js';
import { getSettings } from '../state.js';

export class PlayerUI {
    constructor(player, app) {
        this.player = player;
        this.app = app; // A reference to the main app/state
        this.elements = {};
        this.createDOM();
        this.applyTheme();
        this.updateDisplay();
    }

    createDOM() {
        const p = this.player;
        this.elements.area = document.createElement('div');
        this.elements.area.id = `${p.id}-area`;
        this.elements.area.className = 'player-area';

        this.elements.lifeTotal = document.createElement('div');
        this.elements.lifeTotal.className = 'life-total user-select-none';
        
        this.elements.area.appendChild(this.elements.lifeTotal);
        
        // Simplified event handling, will be moved to events.js
        this.elements.area.addEventListener('click', (e) => {
            if(e.target.classList.contains('life-total')) {
                const rect = e.target.getBoundingClientRect();
                const isRight = e.clientX > rect.left + rect.width / 2;
                const amount = isRight ? 1 : -1;
                p.changeLife(amount);
                this.updateDisplay(true);
            }
        });
    }

    updateDisplay(withAnimation = false) {
		const el = this.elements.lifeTotal;
		el.textContent = this.player.life;

		if (withAnimation) {
			el.classList.remove('life-total-animate');
			void el.offsetWidth;
			el.classList.add('life-total-animate');
		}
	}

    applyTheme() {
        const theme = this._getThemeByName(this.player.themeName);
        if (theme) {
            this.elements.area.style.background = theme.background;
            this.elements.lifeTotal.style.color = theme.lifeTextColor || '#FFFFFF';
        }
    }

    _getThemeByName(name) {
        let theme = allThemes.light.find(t => t.name === name);
        if (!theme) {
            theme = allThemes.dark.find(t => t.name === name);
        }
        return theme || allThemes.dark[0];
    }
}
