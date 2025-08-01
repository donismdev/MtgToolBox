import { initializePlayers, setupEventListeners } from './setup.js';
import { applyLifeFontSize } from './ui.js';
import { themes } from './themes.js';

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
			themesToSave[p.id] = p.themeIndex;
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
    }
    
    window.onModalOpen = () => {
        console.log('라이프 카운터 모달이 열렸습니다.');
    }

	window.onEmbeddedOpen = () => {
        console.log('라이프 카운터 임베디드 모드가 열렸습니다.');
    }

	window.onEmbeddedClose = () => {
		if (window.saveLifeTotals) {
			window.saveLifeTotals();
		}
    }

    setupEventListeners();
    
    // Initial Load
    applyLifeFontSize(window.localSettings.lifeFontSize);
    initializePlayers(window.localSettings.playerCount);

    window.updateAllPlayerIcons = () => {
        window.players.forEach(p => p.updateIcons());
    };

    window.openInitiativeDungeon = (playerIndex) => {
        const dungeonOverlay = document.getElementById('dungeon-overlay');
        dungeonOverlay.innerHTML = `Player ${playerIndex + 1} has the initiative!`;
        dungeonOverlay.style.display = 'flex';
    };

	// 던전 암막. 임시일 수 있음
	// 암막(Dungeon Overlay) 요소를 가져옵니다.
	const dungeonOverlay = document.getElementById('dungeon-overlay');

	// 암막에 클릭 이벤트 리스너를 추가합니다.
	dungeonOverlay.addEventListener('click', () => {
		// 클릭 시 암막을 숨깁니다.
		dungeonOverlay.style.display = 'none';
	});

    // Initial icon state
    window.updateAllPlayerIcons();
	
});