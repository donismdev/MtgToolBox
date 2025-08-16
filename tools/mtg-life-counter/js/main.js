import { initializePlayers, setupEventListeners } from './setup.js';
import { applyLifeFontSize } from './ui.js';

import { Player } from './player.js';

import { hideAllOverlays } from './ui.js';


// document.addEventListener('click', (e) => {
// 	console.log('[click path]', e.composedPath().map(n => n.id || n.className || n.tagName));
// }, { capture: true });

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
	window.randomMenu = document.getElementById('random-menu');
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

		Player.closeAllPlayerOptionModals();

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

		const pickers = document.querySelectorAll('.card-picker-container, .number-picker-container');
		pickers.forEach(el => el.remove());

		const resetButton = document.getElementById('reset-button');
	
		if (resetButton.classList.contains('confirm-animation')) {
		
			resetButton.textContent = '라이프 초기화';
			resetButton.classList.remove('confirm-animation');
		}
    });

    setupEventListeners();
    
    // Initial Load
    applyLifeFontSize(window.localSettings.lifeFontSize);
    initializePlayers(window.localSettings.playerCount);
});

// --- Start of new code for iOS WKWebView issues ---

// 1. 복귀 감지 → 강제 리렌더링 트리거 및 입력 핸들러 soft-reset
document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
        console.log("App is visible again. Forcing reflow and soft-resetting input.");
        requestAnimationFrame(() => {
            // 강제 리플로우 유도
            document.body.offsetHeight;
            // 입력 핸들러 soft-reset
            document.body.click(); // 또는 dummy focus 이벤트
        });
    }
});

// 2. pointer-events, z-index, opacity 체크 - 모달/오버레이 강제 초기화
window.addEventListener("pageshow", () => {
    console.log("Page is shown again. Resetting modals/overlays.");
    // mtg-life-counter에서 사용되는 모달/오버레이 클래스에 따라 조정 필요
    // 현재 코드에서는 명확한 모달/오버레이 클래스가 보이지 않으므로, 일반적인 클래스명 사용
    document.querySelectorAll(".modal, .overlay").forEach(el => {
        el.classList.remove("active");
        el.style.display = "none";
        // 추가적으로 opacity, z-index 등도 초기화할 수 있음
        el.style.opacity = "";
        el.style.zIndex = "";
    });
});

// 4. CSS 트리 초기화 강제 리드로우 유틸리티 함수
function forceRepaint(el) {
    if (el) {
        const originalDisplay = el.style.display;
        el.style.display = "none";
        el.offsetHeight; // 강제 리플로우
        el.style.display = originalDisplay;
        console.log(`Forced repaint on element: ${el.tagName}`);
    }
}

// 3. iOS bfcache 대응
window.addEventListener("pageshow", (event) => {
	if (event.persisted) {
		console.log("⚠️ Restored from bfcache");
		location.reload(); // or soft-reset
	}
});

// 4. 포커스 보조 (선택)
document.addEventListener("visibilitychange", () => {
	if (document.visibilityState === "visible") {
		const dummy = document.getElementById("dummy-focus");
		if (dummy) {
			dummy.focus();  // 포커스 줘서 입력 시스템 깨우기
			dummy.blur();   // 바로 블러 처리해서 키보드 호출 방지
		}
	}
});

// 5. will-change 제거
document.addEventListener("visibilitychange", () => {
	if (document.visibilityState === "visible") {
		document.querySelectorAll("[style*='will-change']").forEach(el => {
			el.style.willChange = "auto";
		});
	}
});

// --- End of new code ---