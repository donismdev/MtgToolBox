
import { initializeApp } from './setup.js';
import { loadState, saveState } from './state.js';

window.i18n.initPromise.then(() => {
    document.addEventListener('DOMContentLoaded', () => {
        loadState();
        initializeApp();

        // Save state on close/hide
        window.onModalClose = () => {
            saveState();
            document.body.classList.remove('modal-mode');
        }
        
        window.onModalOpen = () => {
            document.body.classList.add('modal-mode');
        }

        window.onEmbeddedOpen = () => {}

        window.onEmbeddedClose = () => {
            saveState();
        }
    });
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
