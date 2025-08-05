import { initializePlayers, setupEventListeners } from './setup.js';
import { applyLifeFontSize } from './ui.js';

	document.addEventListener('DOMContentLoaded', () => {
		// [수정] 상위 창의 session_data 객체에 안정적으로 연결하고, 없으면 생성합니다.
		const parentWindow = window.parent || window;
		if (!parentWindow.session_data) {
			parentWindow.session_data = {};
		}
		window.dataSpace = parentWindow.session_data;

		// 최초 로딩 시, 저장된 데이터가 없으면 기본값으로 초기화
		if (!window.dataSpace.settings) {
			window.dataSpace.settings = {
				lifeMax: 20,
				diceSides: 6,
				playerCount: 2,
				initiativeIndex: -1,
				monarchIndex: -1,
				threePlayerLayout: 'top',
				lifeFontSize: 'large',
				lifeAdjustDirection: 'horizontal'
			};
		}
    if (!window.dataSpace.lifeCounter) window.dataSpace.lifeCounter = {};
    if (!window.dataSpace.playerRotations) window.dataSpace.playerRotations = {};
    if (!window.dataSpace.themeData) window.dataSpace.themeData = {};

	document.body.classList.add('player-count-2');

    window.body = document.body;
    window.gameContainer = document.getElementById('game-container');
    window.overlay = document.getElementById('overlay');
    window.centerButtons = document.getElementById('center-buttons');
    window.playerCountMenu = document.getElementById('player-count-menu');
    window.diceCountMenu = document.getElementById('diceCountMenu');
    window.settingsMenu = document.getElementById('settingsMenu');
    window.lifeMaxMenu = document.getElementById('lifeMaxMenu');
    window.fontSizeMenu = document.getElementById('fontSizeMenu');
    window.diceSidesMenu = document.getElementById('diceSidesMenu');
    window.threePlayerLayoutButtonsContainer = document.getElementById('three-player-layout-buttons');
    window.toggleButton = document.getElementById('toggle-button');
    window.closeButton = document.getElementById('close-button');
    
    window.activeUI = null;
    window.players = []; 
    window.localSettings = JSON.parse(JSON.stringify(window.dataSpace.settings));

    window.saveLifeTotals = () => {
        const lifeTotalsToSave = {};
        const rotationsToSave = {};
		const themesToSave = {};
        window.players.forEach(p => {
            lifeTotalsToSave[p.id] = p.life;
            rotationsToSave[p.id] = p.rotation;
			themesToSave[p.id] = p.themeName;
        });
        window.dataSpace.lifeCounter = lifeTotalsToSave;
        window.dataSpace.playerRotations = rotationsToSave;
        window.dataSpace.themeData = themesToSave;
        window.dataSpace.settings = window.localSettings;
    };

    // 외부(index.html)에서 호출될 수 있도록 전역 스코프에 함수를 정의합니다.
    window.onModalClose = () => {
        if (window.saveLifeTotals) {
            window.saveLifeTotals();
        }

		document.body.classList.remove('modal-mode');
    }
    
    window.onModalOpen = () => {
		document.body.classList.add('modal-mode');
    }

	window.onEmbeddedOpen = () => {
    }

	window.onEmbeddedClose = () => {
		if (window.saveLifeTotals) {
			window.saveLifeTotals();
		}
    }

    window.toggleButton.addEventListener('click', () => {
        const centerButtons = document.getElementById('center-buttons');
        const toggleButtonContainer = document.getElementById('toggle-button-container');
        centerButtons.style.display = 'flex';
        toggleButtonContainer.style.display = 'none';
    });

    window.closeButton.addEventListener('click', () => {
        const centerButtons = document.getElementById('center-buttons');
		const toggleButtonContainer = document.getElementById('toggle-button-container');

		centerButtons.style.display = 'none';
		toggleButtonContainer.style.display = 'block';

		window.overlay.style.display = 'none'; 
    });

    setupEventListeners();
    
    // Initial Load
    applyLifeFontSize(window.localSettings.lifeFontSize);
    initializePlayers(window.localSettings.playerCount);

    window.updateAllPlayerIcons = () => {
        window.players.forEach(p => p.updateIcons());
    };

    // Initial icon state
    window.updateAllPlayerIcons();
});