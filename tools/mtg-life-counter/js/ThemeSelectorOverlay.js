import { allThemes } from './themes.js';

export class ThemeSelectorOverlay {
    constructor(player) {
        this.player = player;
        this.elements = {};
        this.createDOM();
    }

    createDOM() {
        this.elements.themeSelector = document.createElement('div');
        this.elements.themeSelector.className = 'theme-selector-overlay';
        
        const themeContainer = document.createElement('div');
        themeContainer.className = 'theme-selector-container';
        
        this.elements.themeSelector.appendChild(themeContainer);

        const hideThemeSelector = () => {
            this.elements.themeSelector.style.display = 'none';
            window.activeUI = null;
        };

        this.elements.themeSelector.addEventListener('pointerdown', e => e.stopPropagation());
        themeContainer.addEventListener('pointerdown', e => e.stopPropagation());

        this.elements.themeSelector.addEventListener('click', (e) => {
            if (e.target === this.elements.themeSelector) {
                hideThemeSelector();
            }
        });
    }

    show() {
        const themeContainer = this.elements.themeSelector.querySelector('.theme-selector-container');
        themeContainer.innerHTML = ''; 

        const usedThemeNames = window.players
            .filter(p => p.id !== this.player.id)
            .map(p => p.themeName);

        const createThemeGroup = (title, themeList) => {
            const group = document.createElement('div');
            group.className = 'theme-group';

            const groupTitle = document.createElement('div');
            groupTitle.className = 'theme-group-title';
            groupTitle.textContent = title;
            group.appendChild(groupTitle);
            
            const swatchesContainer = document.createElement('div');
            swatchesContainer.className = 'theme-swatches-container';
            group.appendChild(swatchesContainer);

            themeList.forEach(theme => {
                const swatch = document.createElement('div');
                swatch.className = 'theme-swatch';
                swatch.style.background = theme.background;
                
                if (usedThemeNames.includes(theme.name)) {
                    swatch.classList.add('disabled');
                } else {
                    swatch.addEventListener('click', () => {
                        this.player.themeName = theme.name;
                        this.player.applyTheme();
                        window.saveLifeTotals();
                        this.hide();
                    });
                }
                swatchesContainer.appendChild(swatch);
            });
            return group;
        };

        themeContainer.appendChild(createThemeGroup('Light Themes', allThemes.light));
        themeContainer.appendChild(createThemeGroup('Dark Themes', allThemes.dark));

        this.elements.themeSelector.style.display = 'flex';
        this.player.elements.area.appendChild(this.elements.themeSelector); // 플레이어 영역에 추가
        window.activeUI = this.player;
    }

    hide() {
        this.elements.themeSelector.style.display = 'none';
        window.activeUI = null;
    }
}
