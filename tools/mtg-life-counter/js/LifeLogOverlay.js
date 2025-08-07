import { renderLifeLogChart } from './logChart.js';

export class LifeLogOverlay {
    constructor(player) {
        this.player = player;
        this.elements = {};
        this.createDOM();
    }

    createDOM() {
        this.elements.logOverlay = document.createElement('div');
        this.elements.logOverlay.className = 'life-log-overlay';
        
        const logModal = document.createElement('div');
        logModal.className = 'life-log-modal';
        
        const closeModalBtn = document.createElement('button');
        closeModalBtn.className = 'close-button';
        closeModalBtn.innerHTML = '&times;';
        
        const canvas = document.createElement('canvas');
        this.elements.logCanvas = canvas;
        
        logModal.appendChild(closeModalBtn);
        logModal.appendChild(canvas);
        this.elements.logOverlay.appendChild(logModal);

        const hideLog = () => {
            this.elements.logOverlay.style.display = 'none';
            window.activeUI = null;
        }

        this.elements.logOverlay.addEventListener('pointerdown', e => e.stopPropagation());
        logModal.addEventListener('pointerdown', e => e.stopPropagation());

        this.elements.logOverlay.addEventListener('click', e => {
            if (e.target === this.elements.logOverlay) {
                hideLog();
            }
        });

        closeModalBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            hideLog();
        });
    }

    show() {
        this.elements.logOverlay.style.display = 'flex';
        const theme = this.player._getThemeByName(this.player.themeName);
        renderLifeLogChart(this.elements.logCanvas, this.player.lifeLog, theme);
        this.player.elements.area.appendChild(this.elements.logOverlay); // 플레이어 영역에 추가
        window.activeUI = this.player;
    }
}
