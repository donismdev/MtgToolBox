// --- 전역 변수 및 상수 정의 ---

	const ResourceManager = {
		basePath: "/MtgToolbox", // GitHub Pages 등을 사용한다면 


		dungeon(filename) {
			return `${this.basePath}/assets/dungeon/${filename}`;
		},
	}

    window.session_data = {};
	window.resourceManager = ResourceManager;
    const toolIndexUrl = "tool_index.json";

    // --- DOM 요소 캐싱 ---
    const toolListContainer = document.getElementById("tool-list-container");
    const contentArea = document.getElementById("content");
    const loaderOverlay = document.getElementById('loader-overlay');
    
    // ModalTool 관련 요소
    const modalToolOverlay = document.getElementById('modal-tool-overlay');
    const modalTool = document.getElementById('modal-tool-iframe');
    
    // 사이드바 관련 요소
    const sidebar = document.getElementById("sidebar");
    const sidebarOverlay = document.getElementById("sidebar-overlay");
    const toggleSidebarBtn = document.getElementById('toggleSidebarBtn');
    
    // 오른쪽 UI 관련 요소
    const fixedButtonsContainer = document.getElementById('fixed-buttons-container');
    const uiToggleBtn = document.getElementById('uiToggleBtn');
    const expandedUiContainer = document.getElementById('expanded-ui-container');
    const hideButtonsBtn = document.getElementById('hideButtonsBtn');
    const fullscreenBtn = document.getElementById('fullscreenBtn');

    // --- 상태 관리 변수 ---
    let currentOpenModalUrl = null;
    const modalToolDisplayNameMap = {}; // { "url": "icon" } 형식으로 ModalTool 버튼의 텍스트 저장
    const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

    // --- 초기화 ---
    history.replaceState({ modal: false }, '', location.href);
    toggleSidebar(true); // 페이지 로드 시 사이드바를 기본으로 표시

	// 페이지 로드 시 기기를 감지하여 iOS일 경우 body에 'iOS' 클래스를 추가합니다.
	if (/iPhone|iPad|iPod/i.test(navigator.userAgent)) {
		document.body.classList.add('iOS');
	}



    // ===================================================================================
    // ✨ 리팩토링 핵심 개념 ✨
    // 1. EmbeddedTool: 사이드바 목록에서 선택하여 메인 콘텐츠 영역(#content)에 그려지는 툴
    // 2. ModalTool: 화면 오른쪽의 플로팅 버튼을 눌러 전체 화면 모달(#modal-tool-overlay)로 로드되는 툴.
    // ===================================================================================

    // --- 사이드바 및 UI 상태 관리 함수 ---

    /** 사이드바를 열거나 닫습니다. */
    function toggleSidebar(show) {
        if (show) {
            sidebar.classList.add("show");
            sidebarOverlay.classList.add("active");
        } else {
            sidebar.classList.remove("show");
            sidebarOverlay.classList.remove("active");
        }
    }

    /** 확장 UI 메뉴를 열거나 닫습니다. */
    function toggleUiExpansion(forceHide = false) {
        const isActive = expandedUiContainer.classList.contains('show');
        if (forceHide || isActive) {
            expandedUiContainer.classList.remove('show');
            uiToggleBtn.classList.remove('active');
        } else {
            expandedUiContainer.classList.add('show');
            uiToggleBtn.classList.add('active');
        }
    }

    // --- 툴 렌더링 및 관리 함수 ---

    /**
     * tool.json 객체를 기반으로 사이드바에 표시할 아이콘을 결정합니다.
     * @param {object} tool - 툴 정보 객체
     * @returns {string} Bootstrap 아이콘 클래스명
     */
    function getIconForTool(tool) {
        if (tool.tags?.includes("mtg")) return "bi-box-seam";
        if (tool.tags?.includes("csv")) return "bi-file-earmark-spreadsheet";
        if (tool.tags?.includes("json")) return "bi-file-earmark-code";
        // EmbeddedTool 타입은 재생 아이콘을 사용합니다.
        if (tool.type === "html" || (Array.isArray(tool.type) && tool.type.includes("html"))) return "bi-file-earmark-play";
        return "bi-tools"; // 기본 아이콘
    }

    /**
     * 메인 콘텐츠 영역(#content)에 EmbeddedTool을 렌더링합니다.
     * @param {object} tool - 렌더링할 툴 정보 객체
     */
    function renderEmbeddedTool(tool) {
        loaderOverlay.style.display = 'flex'; // 로딩 시작

        // 만약 ModalTool이 열려있다면 먼저 닫습니다.
        if (modalToolOverlay.style.display === 'flex') {
            closeModalTool(false);
        }

        let html = "";
		if (tool.hide_header !== true) {
			html += `<h1 class="display-5 text-light mb-4">${tool.name}</h1>`;
		}
        let isIframe = false;

        // 툴 타입이 'html' (EmbeddedTool)인 경우 iframe으로 렌더링합니다.
        if (tool.type === "html" || (Array.isArray(tool.type) && tool.type.includes("html"))) {
            const htmlPath = `${tool.path}${tool.name}.html`;
            html += `<iframe id="embedded-tool-iframe" src="${htmlPath}" class="w-100" style="height: 100%; border: none; border-radius: 8px;"></iframe>`;
            isIframe = true;
        } else {
            // 다른 타입의 툴 (예: 폼 기반)은 여기에 렌더링 로직을 추가할 수 있습니다.
            // (기존 로직 유지)
        }

        contentArea.innerHTML = html;
        toggleSidebar(false); // 툴을 선택하면 사이드바를 닫습니다.


        if (isIframe) {
            const embeddedToolIframe = document.getElementById('embedded-tool-iframe');
            // iframe 로드가 완료되면 로딩 오버레이를 숨깁니다.

			const iframeWindow = embeddedToolIframe.contentWindow; 

            embeddedToolIframe.onload = () => {
                loaderOverlay.style.display = 'none';

				if (iframeWindow && typeof iframeWindow.onEmbeddedOpen === 'function') {
                    iframeWindow.onEmbeddedOpen();
                }
            };
            // 안전장치: 8초 후에도 로딩이 완료되지 않으면 강제로 로더를 숨깁니다.
            setTimeout(() => {
                if (loaderOverlay.style.display === 'flex') {
                    loaderOverlay.style.display = 'none';
                }
            }, 8000);
        } else {
            // iframe이 아닌 툴은 즉시 로딩 오버레이를 숨깁니다.
            loaderOverlay.style.display = 'none';
        }

        // 렌더링 후 화면 상단으로 스크롤합니다.
        setTimeout(() => window.scrollTo(0, 0), 10);
    }
    
    /**
     * ModalTool을 열고 관련 UI 상태를 업데이트합니다.
     * @param {string} fullUrl - 로드할 ModalTool의 전체 URL
     * @param {object} tool - ModalTool 정보 객체
     */
    function openModalTool(fullUrl, tool) {
        // 이미 같은 ModalTool이 열려있으면 닫습니다.
        if (modalToolOverlay.style.display === 'flex' && currentOpenModalUrl === fullUrl) {
            closeModalTool();
            return;
        }
        
        loaderOverlay.style.display = 'flex'; // 로딩 시작

        // iframe 로드가 완료되면 로더를 숨기고 모달을 표시합니다.
        modalTool.onload = () => {
            loaderOverlay.style.display = 'none';
            modalToolOverlay.style.display = 'flex';

            // 모달 내부의 onModalOpen 함수가 있다면 호출합니다.
            try {
                const iframeWindow = modalTool.contentWindow;
                if (iframeWindow && typeof iframeWindow.onModalOpen === 'function') {
                    iframeWindow.onModalOpen();
                }
            } catch (e) {
                console.error("Iframe 접근 오류:", e);
            }
        };

        // 모달을 열기 전 UI 상태를 설정합니다.
        toggleSidebar(false);
        toggleSidebarBtn.classList.add('inactive-when-modal'); // 사이드바 버튼 비활성화
        document.body.classList.add('modal-open');
        currentOpenModalUrl = fullUrl;
        updateModalToolButtonStates(fullUrl); // 활성 ModalTool 버튼 스타일 업데이트

        // 브라우저 history에 모달 상태를 추가합니다 (뒤로가기 지원).
        if (!history.state?.modal) {
            history.pushState({ modal: true }, '', '');
        }

        // 마지막으로 iframe의 src를 설정하여 로딩을 시작합니다.
        modalTool.src = fullUrl;
    }

    /**
     * 현재 열려있는 ModalTool을 닫습니다.
     * @param {boolean} pushStateBack - 브라우저 history를 뒤로 돌릴지 여부
     */
    function closeModalTool(pushStateBack = true) {
        modalTool.onload = null; // onload 핸들러 초기화

        // 모달 내부의 onModalClose 함수가 있다면 호출합니다.
        try {
            const iframeWindow = modalTool.contentWindow;
            if (iframeWindow && typeof iframeWindow.onModalClose === 'function') {
                iframeWindow.onModalClose();
            }
        } catch (e) {
            console.error("Iframe 접근 오류:", e);
        }

        // UI 상태를 원래대로 복원합니다.
        toggleSidebarBtn.classList.remove('inactive-when-modal');
        modalToolOverlay.style.display = 'none';
        document.body.classList.remove('modal-open');
        modalTool.src = 'about:blank'; // ModalTool 비우기
        clearActiveModalToolButtonState(); // 모든 ModalTool 버튼 활성 상태 해제
        currentOpenModalUrl = null;

        // history.back()으로 닫는 경우를 처리합니다.
        if (pushStateBack && history.state?.modal) {
            history.back();
        }
    }


    // --- UI 상태 업데이트 함수 ---

    /** 사이드바에서 현재 선택된 EmbeddedTool의 활성 상태를 해제합니다. */
    function clearActiveListSelection() {
        const currentActive = document.querySelector('.nav-link.active-tool');
        if (currentActive) currentActive.classList.remove('active-tool');
    }
    
    /** 모든 ModalTool 버튼의 활성 상태(테두리, 아이콘)를 초기화합니다. */
    function clearActiveModalToolButtonState() {
        document.querySelectorAll('.modal-tool-button').forEach(btn => {
            btn.classList.remove('active-modal');
            btn.textContent = modalToolDisplayNameMap[btn.dataset.modalUrl]; // 원래 아이콘으로 복원
        });
    }
    
    /**
     * 주어진 URL에 해당하는 ModalTool 버튼을 활성화하고 나머지는 비활성화합니다.
     * @param {string} activeUrl - 활성화할 ModalTool의 URL
     */
    function updateModalToolButtonStates(activeUrl) {
        document.querySelectorAll('.modal-tool-button').forEach(btn => {
            if (btn.dataset.modalUrl === activeUrl) {
                btn.classList.add('active-modal');
                btn.textContent = '✓'; // 활성 상태 아이콘
            } else {
                btn.classList.remove('active-modal');
                btn.textContent = modalToolDisplayNameMap[btn.dataset.modalUrl]; // 원래 아이콘
            }
        });
    }

    // --- 전체화면 관리 ---
    function toggleFullScreen() {
		// body에 'iOS' 클래스가 있는지 확인하여 아이폰 계열 기기인지 판단
		const isIOSDevice = document.body.classList.contains('iOS');
		const fullscreenIcon = fullscreenBtn.querySelector('i');

		// iOS 기기일 경우: CSS 클래스를 이용한 유사 전체화면 모드 토글
		if (isIOSDevice) {
			const isPseudoFullscreen = document.body.classList.toggle('pseudo-fullscreen');
			
			// 아이콘 상태를 직접 업데이트
			fullscreenIcon.classList.toggle('bi-arrows-fullscreen', !isPseudoFullscreen);
			fullscreenIcon.classList.toggle('bi-arrows-angle-contract', isPseudoFullscreen);

		} else { // 그 외 기기(안드로이드, PC)일 경우: 표준 전체화면 API 사용
			if (!document.fullscreenElement) {
				document.documentElement.requestFullscreen().catch(err => {
					alert(`전체화면 모드를 시작할 수 없습니다: ${err.message}`);
				});
			} else {
				if (document.exitFullscreen) document.exitFullscreen();
			}
		}
		toggleUiExpansion(true); // 기능 실행 후 확장 메뉴 닫기
	}

    // --- 이벤트 리스너 설정 ---

    // 확장 UI 토글 버튼
    uiToggleBtn.addEventListener('click', () => toggleUiExpansion());

    // 플로팅 버튼 숨기기/표시 버튼
    hideButtonsBtn.addEventListener('click', () => {
        const icon = hideButtonsBtn.querySelector('i');
        const isHidden = fixedButtonsContainer.classList.toggle('hidden-to-right');
        icon.classList.toggle('bi-box-arrow-right', !isHidden);
        icon.classList.toggle('bi-box-arrow-left', isHidden);
        toggleUiExpansion(true); // 메뉴 닫기
    });

    // 사이드바 목록 토글 버튼
    toggleSidebarBtn.addEventListener('click', () => {
        if (toggleSidebarBtn.classList.contains('inactive-when-modal')) return; // 모달 열렸을 땐 동작 안함
        toggleUiExpansion(true); // 확장 메뉴 먼저 닫기
        toggleSidebar(!sidebar.classList.contains("show"));
    });

    // 전체화면 버튼
    fullscreenBtn.addEventListener('click', toggleFullScreen);
    document.addEventListener('fullscreenchange', () => {
		const isFullscreen = !!document.fullscreenElement;
		const fullscreenIcon = fullscreenBtn.querySelector('i');
		fullscreenIcon.classList.toggle('bi-arrows-fullscreen', !isFullscreen);
		fullscreenIcon.classList.toggle('bi-arrows-angle-contract', isFullscreen);
	});

    // 모달 오버레이 클릭 시 닫기
    // modalToolOverlay.addEventListener('click', (event) => {
    //     if (event.target === modalToolOverlay) closeModalTool(true);
    // });

    // 브라우저 뒤로가기 버튼으로 모달 닫기
    window.addEventListener('popstate', (event) => {
        if (!event.state?.modal && modalToolOverlay.style.display === 'flex') {
            closeModalTool(false);
        }
    });

    // 초기 화면에서 콘텐츠 영역 클릭 시 사이드바 열기
    contentArea.addEventListener('click', () => {
        const h1 = contentArea.querySelector('h1');
        if (h1 && h1.textContent === '툴을 선택해주세요') {
            toggleSidebar(true);
        }
    });

    // --- 데이터 로딩 및 동적 UI 생성 ---

    fetch(toolIndexUrl)
        .then(res => res.json())
        .then(data => {
            // 활성화된 툴만 필터링 (플랫폼 조건 포함)
            const enabledTools = data.tools.filter(tool => {
                if (tool.enable === false) return false;
                if (tool.mobileOnly === true && !isMobile) return false;
                if (tool.desktopOnly === true && isMobile) return false;
                return true;
            });

            // 1. ModalTool 버튼 생성
            const modalTools = enabledTools.filter(tool => tool.type === 'html_modal' || (Array.isArray(tool.type) && tool.type.includes('html_modal')));
            modalTools.forEach(tool => {
                const fullUrl = `${tool.path}${tool.name}.html?modal=true`;
                const displayName = tool.modalIcon || tool.name;
                modalToolDisplayNameMap[fullUrl] = displayName; // 아이콘/텍스트 정보 저장

                const button = document.createElement('button');
                button.className = 'btn modal-tool-button';
                button.textContent = displayName;
                button.dataset.modalUrl = fullUrl;
                button.title = tool.name;
                if (tool.modalIconColor) {
                    button.style.backgroundColor = tool.modalIconColor;
                }

                button.onclick = () => {
                    toggleUiExpansion(true); // 버튼 클릭 시 확장 메뉴는 닫기
                    openModalTool(fullUrl, tool);
                };
                
                fixedButtonsContainer.appendChild(button);
            });
            
            // 2. EmbeddedTool 및 기타 툴 목록 (사이드바) 생성
            const toolsByParent = enabledTools.reduce((acc, tool) => {
                const parent = tool.parent || "기타";
                if (!acc[parent]) acc[parent] = [];
                acc[parent].push(tool);
                return acc;
            }, {});

            Object.keys(toolsByParent).forEach(parent => {
                const parentLi = document.createElement("li");
                parentLi.className = "nav-item";
                parentLi.innerHTML = `
                    <a href="#collapse-${parent.replace(/\s/g, '')}" class="nav-link link-dark" data-bs-toggle="collapse" aria-expanded="true">
                        <i class="bi bi-folder me-2"></i>${parent}
                        <span class="ms-auto flex-shrink-0"><i class="bi bi-chevron-down collapse-icon"></i></span>
                    </a>
                `;
                
                const subUl = document.createElement("ul");
                subUl.id = `collapse-${parent.replace(/\s/g, '')}`;
                subUl.className = "nav nav-pills flex-column ms-3 collapse show";
                
                toolsByParent[parent].forEach(tool => {
                    const item = document.createElement("li");
                    item.className = "nav-item";
                    
                    const link = document.createElement('a');
                    link.href = '#';
                    link.className = 'nav-link link-dark';
                    link.innerHTML = `<i class="bi ${getIconForTool(tool)} me-2"></i>${tool.name}`;
                    
                    link.onclick = (e) => {
                        e.preventDefault();
                        clearActiveModalToolButtonState(); // 다른 툴 선택 시 ModalTool 활성 상태 해제
                        clearActiveListSelection(); // 기존 선택 해제
                        link.classList.add('active-tool'); // 현재 툴 활성
                        renderEmbeddedTool(tool); // EmbeddedTool 렌더링
                    };

                    item.appendChild(link);
                    subUl.appendChild(item);
                });

                if (toolsByParent[parent].length > 0) {
                    parentLi.appendChild(subUl);
                    toolListContainer.appendChild(parentLi);
                }
            });
        });

		// --- Start of new code for iOS WKWebView issues (index.html) ---

		// 1. 복귀 감지 → 강제 리렌더링 트리거 및 입력 핸들러 soft-reset
		document.addEventListener("visibilitychange", () => {
			if (document.visibilityState === "visible") {
				console.log("Index: App is visible again. Forcing reflow and soft-resetting input.");
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
			console.log("Index: Page is shown again. Resetting main overlays.");
			// 메인 페이지의 오버레이들을 초기화
			document.querySelectorAll("#modal-tool-overlay, #sidebar-overlay").forEach(el => {
				el.style.display = "none";
				el.classList.remove("active");
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
				console.log(`Index: Forced repaint on element: ${el.tagName}`);
			}
		}

		// --- End of new code ---

		function updateVh() {
			const vh = window.innerHeight * 0.01;
			document.documentElement.style.setProperty('--vh', `${vh}px`);
		}

		window.addEventListener('load', updateVh);
		window.addEventListener('resize', updateVh);
