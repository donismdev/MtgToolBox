import { allThemes } from './themes.js';
import { renderLifeLogChart } from './logChart.js';
import { initiativeManager } from './initiative.js';

export class Player {
	constructor(id, initialLife, initialRotation, themeName) {
		this.id = id;
		this.life = initialLife;
		this.rotation = initialRotation;
		this.themeName = themeName;
		this.elements = {};
		this.lifeChangeTimeout = null;
		this.lifeChangeAmount = 0;
		this.lifeChangePositions = [];
		this.lifeLog = [];
		this.cumulativeFeedbackEl = null;
		this.feedbackFadeTimeout = null;

		this.buttonSettings = [
        { id: 'initiative', label: 'Initiative', enabled: false },
        { id: 'monarch', label: 'Monarch', enabled: false },
        { id: 'log', label: 'Life Log', enabled: false },
        { id: 'theme', label: 'Theme', enabled: false },
        { id: 'layout', label: 'HP Layout', enabled: false },
    	];

		this.counterSettings = [
            { id: 'plain',    imageName: 'plain',    enabled: false, count : 0, label: '', backgroundSize: '120%' },
            { id: 'island',   imageName: 'island',   enabled: false, count : 0, label: '', backgroundSize: '120%' },
            { id: 'swamp',    imageName: 'swamp',    enabled: false, count : 0, label: '', backgroundSize: '120%' },
            { id: 'mountain', imageName: 'mountain', enabled: false, count : 0, label: '', backgroundSize: '120%' },
            { id: 'forest',   imageName: 'forest',   enabled: false, count : 0, label: '', backgroundSize: '120%' },
            { id: 'tax',      imageName: 'tax',      enabled: false, count : 0, label: '', backgroundSize: '85%' },
            { id: 'mana',     imageName: 'mana',     enabled: false, count : 0, label: '', backgroundSize: '100%' },
            { id: 'book',     imageName: 'book',     enabled: false, count : 0, label: '', backgroundSize: '85%' },
            { id: 'card',     imageName: 'card',     enabled: false, count : 0, label: '', backgroundSize: '85%' },
            { id: 'cross',    imageName: 'cross',    enabled: false, count : 0, label: '', backgroundSize: '100%' },
            { id: 'weapon',   imageName: 'weapon',   enabled: false, count : 0, label: '', backgroundSize: '85%' },
        ];

		this.createDOM();
		this.applyTheme();
		this.updateDisplay();

		console.log(`Player ${this.id}가 rotation: ${this.rotation} 값으로 생성되었습니다.`);
	}

	_getThemeByName(name) {
        let theme = allThemes.light.find(t => t.name === name);
        if (!theme) {
            theme = allThemes.dark.find(t => t.name === name);
        }

        return theme || allThemes.dark[0]; 
    }

	applyTheme() {

        const theme = this._getThemeByName(this.themeName);
        if (theme) {
            this.elements.area.style.background = theme.background;
            this.elements.area.style.setProperty('--button-bg-color', theme.buttonBgColor || 'rgba(0,0,0,0.4)');
            this.elements.area.style.setProperty('--button-hover-bg-color', theme.buttonHoverBgColor || 'rgba(0,0,0,0.6)');
            const lifeTotalEl = this.elements.lifeTotal;
            lifeTotalEl.style.color = theme.lifeTextColor || '#FFFFFF';
            if (theme.lifeTextShadowColor && theme.lifeTextShadowOffset) {
                lifeTotalEl.style.textShadow = `${theme.lifeTextShadowOffset} ${theme.lifeTextShadowColor}`;
            } else {
                lifeTotalEl.style.textShadow = 'none';
            }
            this.updateHint();
        }
    }
	
	createDOM() {

		 this.elements.area = document.createElement('div');
		this.elements.area.id = `${this.id}-area`;
		this.elements.area.className = 'player-area';

		// 1. 옵션 버튼 (우측 상단 고정)
		this.elements.optionsButton = document.createElement('button');
		this.elements.optionsButton.className = 'player-options-button header-button';
		this.elements.optionsButton.style.backgroundImage = 'url(./assets/option.png)';
		this.elements.optionsButton.addEventListener('click', (e) => {
			e.stopPropagation();
			this.showOptionsModal();
		});

		// 2. 액션 버튼 컨테이너 (좌측 하단, 동적으로 버튼 추가/제거)
		this.elements.actionButtonContainer = document.createElement('div');
		this.elements.actionButtonContainer.className = 'player-header-buttons'; // 기존 클래스 재사용

		// --- 기본 라이프 카운터 및 래퍼 생성 ---
		this.elements.contentWrapper = document.createElement('div');
		this.elements.area.appendChild(this.elements.contentWrapper);

		this.elements.lifeTotal = document.createElement('div');
		this.elements.lifeTotal.className = 'life-total user-select-none';
		this.elements.hintInc = document.createElement('div');
		this.elements.hintDec = document.createElement('div');
		this.elements.hintInc.className = 'life-hint increase';
		this.elements.hintDec.className = 'life-hint decrease';

		this.elements.contentWrapper.appendChild(this.elements.hintInc);
		this.elements.contentWrapper.appendChild(this.elements.hintDec);
		this.elements.contentWrapper.appendChild(this.elements.lifeTotal);
		
		// --- 생성된 요소들을 player-area에 추가 ---
		this.elements.area.appendChild(this.elements.optionsButton);
		this.elements.area.appendChild(this.elements.actionButtonContainer);
		
		// 3. 옵션 모달 생성 (처음에는 숨겨져 있음)
		this.createOptionsModal();
		this.elements.area.appendChild(this.elements.optionsModalOverlay);
		
		// --- 기존의 다른 요소들 생성 (주사위, 로그 오버레이 등) ---
		this.createDiceAndLogOverlays(); // 관련 코드를 별도 함수로 분리하여 가독성 향상

		// --- 기존 이벤트 리스너들 ---
		this.setupAreaEventListeners();

		// 초기 버튼 상태 렌더링
		this.rebuildPlayerButtons();
		this.updateRotationClass();
	}

	updateCounterValue(setting, action, targetElement = null) {
        if (action === 'increment') {
            setting.count++;
			if (targetElement && setting.label) {
                this.showSpeechBubble(setting.label, targetElement);
            }
        } else if (action === 'reset') {
            setting.count = 0;
			if (targetElement && setting.label) {
				this.showSpeechBubble(setting.label + " reset", targetElement);
			}
        }

        // 데이터가 변경되었으니, 모든 UI를 최신 데이터로 다시 그립니다.
        this.rebuildPlayerButtons(); // 메인 버튼 UI 새로고침
        
        // 옵션창이 열려있을 수 있으니, 옵션창 목록도 새로고침합니다.
        if (this.elements.counterSettingsList) {
            this.renderCounterSettingsList();
        }
    }

	showSpeechBubble(text, buttonElement) {
		const playerArea = buttonElement.closest('.player-area');
		if (!playerArea) return;

		const existingBubble = playerArea.querySelector('.speech-bubble');
		if (existingBubble) {
			existingBubble.remove();
		}

		const bubble = document.createElement('div');
		bubble.className = 'speech-bubble';
		bubble.textContent = text;
		
		bubble.style.visibility = 'hidden';
		playerArea.appendChild(bubble);

		const bubbleRect = bubble.getBoundingClientRect();
		const buttonRect = buttonElement.getBoundingClientRect();
		const areaRect = playerArea.getBoundingClientRect();
		
		// 1. 버튼의 가로 중앙 위치를 계산합니다.
		const buttonCenterX = (buttonRect.left - areaRect.left) + (buttonRect.width / 2);
		
		// 2. 말풍선이 버튼 중앙에 오도록 초기 left 값을 계산합니다.
		let bubbleLeftX = buttonCenterX - (bubbleRect.width / 2);
		
		// 3. 화면 가장자리 밖으로 나가는지 확인하고 보정합니다.
		const PADDING = 10;
		if (bubbleLeftX < PADDING) {
			bubbleLeftX = PADDING;
		}
		if (bubbleLeftX + bubbleRect.width > areaRect.width - PADDING) {
			bubbleLeftX = areaRect.width - bubbleRect.width - PADDING;
		}

		const buttonTopY = buttonRect.top - areaRect.top;
		
		// 4. 말풍선 몸체의 최종 위치를 적용합니다.
		bubble.style.left = `${bubbleLeftX}px`;
		bubble.style.top = `${buttonTopY}px`;
		
		// ▼▼▼ [핵심 추가] 꼬리 위치 계산 및 CSS 변수 설정 ▼▼▼
		// 5. 보정된 말풍선 위치 안에서, 원래 버튼 중앙이 어디인지 계산합니다.
		const tailLeft = buttonCenterX - bubbleLeftX;
		
		// 6. 계산된 꼬리 위치를 '--tail-left'라는 CSS 변수로 설정합니다.
		bubble.style.setProperty('--tail-left', `${tailLeft}px`);
		// ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲

		bubble.style.visibility = 'visible';
		
		// 사라지는 애니메이션 (기존과 동일)
		setTimeout(() => { bubble.classList.add('fade-out'); }, 1500);
		setTimeout(() => { if (bubble.parentElement) { bubble.remove(); } }, 2000);
	}

	createOptionsModal() {
		this.elements.optionsModalOverlay = document.createElement('div');
		this.elements.optionsModalOverlay.className = 'player-options-overlay';
		
		const modal = document.createElement('div');
		modal.className = 'player-options-modal';
		modal.addEventListener('pointerdown', e => e.stopPropagation()); // 이벤트 전파 방지

		const closeModalBtn = document.createElement('button');
		closeModalBtn.className = 'close-button';
		closeModalBtn.innerHTML = '&times;';
		closeModalBtn.onclick = () => this.hideOptionsModal();

		// 탭 메뉴
		const tabContainer = document.createElement('div');
		tabContainer.className = 'options-tab-container';
		const counterTabBtn = document.createElement('button');
		counterTabBtn.className = 'options-tab-button active';
		counterTabBtn.textContent = 'Counter';
		const buttonsTabBtn = document.createElement('button');
		buttonsTabBtn.className = 'options-tab-button';
		buttonsTabBtn.textContent = 'Buttons';
		
		// 탭 콘텐츠
		const contentContainer = document.createElement('div');
		contentContainer.className = 'options-content-container';
		
		const counterContent = document.createElement('div');
		counterContent.className = 'options-tab-content active';

		this.elements.counterSettingsList = document.createElement('ul');
        this.elements.counterSettingsList.className = 'button-settings-list'; // 기존 스타일 재사용
        counterContent.appendChild(this.elements.counterSettingsList);

		const buttonsContent = document.createElement('div');
		buttonsContent.className = 'options-tab-content';
		this.elements.buttonSettingsList = document.createElement('ul');
		this.elements.buttonSettingsList.className = 'button-settings-list';
		buttonsContent.appendChild(this.elements.buttonSettingsList);
		
		// 탭 전환 로직
		counterTabBtn.onclick = () => {
			counterTabBtn.classList.add('active');
			buttonsTabBtn.classList.remove('active');
			counterContent.classList.add('active');
			buttonsContent.classList.remove('active');
		};
		buttonsTabBtn.onclick = () => {
			buttonsTabBtn.classList.add('active');
			counterTabBtn.classList.remove('active');
			buttonsContent.classList.add('active');
			counterContent.classList.remove('active');
		};

		tabContainer.append(counterTabBtn, buttonsTabBtn);
		contentContainer.append(counterContent, buttonsContent);
		modal.append(closeModalBtn, tabContainer, contentContainer);
		this.elements.optionsModalOverlay.appendChild(modal);

		// 오버레이 클릭 시 닫기
		this.elements.optionsModalOverlay.addEventListener('click', (e) => {
			if (e.target === this.elements.optionsModalOverlay) {
				this.hideOptionsModal();
			}
		});

		this.renderCounterSettingsList();
		this.renderButtonSettingsList();

		this.setupDragAndDrop(this.elements.counterSettingsList, this.counterSettings);
	    this.setupDragAndDrop(this.elements.buttonSettingsList, this.buttonSettings);
	}

	renderCounterSettingsList() {
		const list = this.elements.counterSettingsList;
		list.innerHTML = '';

		this.counterSettings.forEach(setting => {
			const item = document.createElement('li');
			item.className = 'button-setting-item';
			item.dataset.id = setting.id;
	        item.draggable = true;

			const dragHandle = document.createElement('span');
			dragHandle.className = 'drag-handle';
			dragHandle.innerHTML = '&#x2630;';


			const checkbox = document.createElement('input');
			checkbox.type = 'checkbox';
			checkbox.checked = setting.enabled;
			checkbox.id = `${this.id}-counter-check-${setting.id}`;
			checkbox.onchange = () => {
				const enabledCounters = this.counterSettings.filter(s => s.enabled).length;
				const enabledNormalButtons = this.buttonSettings.filter(s => s.enabled && s.id !== 'initiative' && s.id !== 'monarch').length;
				const totalNormalEnabled = enabledCounters + enabledNormalButtons;

				if (checkbox.checked && totalNormalEnabled >= 4) {
					alert('일반 버튼과 카운터는 최대 4개까지만 선택할 수 있습니다.');
					checkbox.checked = false;
					return;
				}

				setting.enabled = checkbox.checked;
				this.rebuildPlayerButtons();
			};

			const image = document.createElement('img');
			image.src = `./assets/board_icon/${setting.imageName}.png`;
			image.className = 'modal-counter-icon';
			image.style.cssText = 'width: 24px; height: 24px; margin-right: 10px; vertical-align: middle;';

			const textContainer = document.createElement('div');
			textContainer.className = 'counter-text-container';

			const labelSpan = document.createElement('span');
			labelSpan.className = 'counter-label'; // 식별을 위해 클래스 이름은 유지
			labelSpan.textContent = setting.label || '(라벨 수정)'; // 텍스트 변경
			if (!setting.label) {
				labelSpan.style.opacity = '0.5';
			}
			
			const countSpan = document.createElement('span');
			countSpan.className = 'modal-counter-value';
			countSpan.textContent = `Counts : ${setting.count}`;

			textContainer.append(labelSpan, countSpan);
			item.append(dragHandle, checkbox, image, textContainer);
			list.appendChild(item);
			
			item.addEventListener('pointerdown', (e) => {
				// 체크박스를 클릭한 경우는 어떤 동작도 하지 않음

				console.log("PointerUp Event Triggered! Clicked down:", e.target);

				if (e.target === checkbox) return;
				e.stopPropagation();

				this.isLongPress = false;
				this.longPressTimer = setTimeout(() => {
					this.isLongPress = true;
					// 길게 누를 땐 대상이 무엇이든 항상 초기화
					this.updateCounterValue(setting, 'reset');
				}, 700);
			});

			item.addEventListener('pointerup', (e) => {

				console.log("PointerUp Event Triggered! Clicked up:", e.target);

				if (e.target === checkbox) return;
				e.stopPropagation();
				clearTimeout(this.longPressTimer);

				if (this.isLongPress) {
					// 긴 클릭이 방금 완료되었으므로, 아무것도 하지 않고 종료
					return;
				}

				// 짧은 클릭이었을 경우, 클릭 대상을 확인
				if (e.target.classList.contains('counter-label')) {
					// 1. 만약 라벨을 클릭했다면 -> 수정 로직 실행
					console.log("라벨 클릭됨:", setting.label);
					const newLabel = prompt('카운터의 새 라벨을 입력하세요:', setting.label);
					if (newLabel !== null) {
						setting.label = newLabel.trim();
						this.renderCounterSettingsList(); // 목록 UI 새로고침
						this.rebuildPlayerButtons();    // 버튼 UI 새로고침
					}
				} else {
					// 2. 그 외의 영역(이미지, 빈 공간 등)을 클릭했다면 -> 숫자 증가 로직 실행
					this.updateCounterValue(setting, 'increment');
				}
			});

			item.addEventListener('pointerleave', () => {
				clearTimeout(this.longPressTimer);
			});
			// ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲
		});
	}

	renderButtonSettingsList() {
		const list = this.elements.buttonSettingsList;
		list.innerHTML = ''; // 목록 초기화

		this.buttonSettings.forEach(setting => {
			const item = document.createElement('li');
			item.className = 'button-setting-item';
			item.dataset.id = setting.id;
			item.draggable = true;

			const dragHandle = document.createElement('span');
			dragHandle.className = 'drag-handle';
			dragHandle.innerHTML = '&#x2630;'; // 드래그 핸들 아이콘

			const checkbox = document.createElement('input');
			checkbox.type = 'checkbox';
			checkbox.checked = setting.enabled;
			checkbox.id = `${this.id}-btn-check-${setting.id}`;
			checkbox.onchange = () => {

				if (setting.id !== 'initiative' && setting.id !== 'monarch') {
					const enabledCounters = this.counterSettings.filter(s => s.enabled).length;
					const enabledNormalButtons = this.buttonSettings.filter(s => s.enabled && s.id !== 'initiative' && s.id !== 'monarch').length;
					const totalNormalEnabled = enabledCounters + enabledNormalButtons;

					if (checkbox.checked && totalNormalEnabled >= 4) {
						alert('일반 버튼과 카운터는 최대 4개까지만 선택할 수 있습니다.');
						checkbox.checked = false;
						return;
					}
				}

				setting.enabled = checkbox.checked;
				this.rebuildPlayerButtons(); // 체크 상태 변경 시 즉시 버튼 UI에 반영
			};

			const labelButton = document.createElement('button');
			labelButton.className = 'label-button';
			labelButton.textContent = setting.label;
			labelButton.onclick = () => {
				this.hideOptionsModal();
	            this.executeButtonAction(setting.id);
			};

			item.append(dragHandle, checkbox, labelButton);
			list.appendChild(item);
		});

		this.setupDragAndDrop(list, this.buttonSettings);
	}

	setupDragAndDrop(list, settingsArray) {
		let draggedItem = null;

		list.addEventListener('dragstart', (e) => {
			// 드래그 시작 시 li 요소를 정확히 타겟팅합니다.
			draggedItem = e.target.closest('.button-setting-item');
			if (draggedItem) {
				setTimeout(() => draggedItem.classList.add('dragging'), 0);
			}
		});

		list.addEventListener('dragend', () => {
			if (draggedItem) {
				draggedItem.classList.remove('dragging');
				draggedItem = null;
			}
		});

		list.addEventListener('dragover', (e) => {
			e.preventDefault();
			const afterElement = this.getDragAfterElement(list, e.clientY);
			if (draggedItem) {
				if (afterElement == null) {
					list.appendChild(draggedItem);
				} else {
					list.insertBefore(draggedItem, afterElement);
				}
			}
		});

		list.addEventListener('drop', (e) => {
			e.preventDefault();
			if (!draggedItem) return;

			// 1. 화면에 보이는 순서대로 id 배열을 새로 만듭니다.
			const newOrderIds = [...list.querySelectorAll('.button-setting-item')].map(item => item.dataset.id);
			
			// 2. 데이터 배열(settingsArray)을 화면 순서에 맞게 재정렬합니다.
			settingsArray.sort((a, b) => newOrderIds.indexOf(a.id) - newOrderIds.indexOf(b.id));
			
			// 3. 재정렬된 데이터에 따라 메인 화면 버튼을 다시 그립니다.
			this.rebuildPlayerButtons();
		});
	}

	getDragAfterElement(container, y) {
		const draggableElements = [...container.querySelectorAll('.button-setting-item:not(.dragging)')];
		return draggableElements.reduce((closest, child) => {
			const box = child.getBoundingClientRect();
			const offset = y - box.top - box.height / 2;
			if (offset < 0 && offset > closest.offset) {	
				return { offset: offset, element: child };
			} else {
				return closest;
			}
		}, { offset: Number.NEGATIVE_INFINITY }).element;
	}

	enableAndCreateButton(buttonId) {
		const setting = this.buttonSettings.find(s => s.id === buttonId);
		if (setting && !setting.enabled) {
			setting.enabled = true;
			this.rebuildPlayerButtons(); // UI 업데이트
		}
	}

	executeButtonAction(buttonId) {
		switch (buttonId) {
			case 'initiative':
				// 모든 플레이어에게 버튼을 생성하고 싶다면, window 또는 전역 manager를 통해 제어
				window.players.forEach(p => p.enableAndCreateButton('initiative'));
				initiativeManager.showDungeon(this.id);
				break;
			case 'monarch':
				// 모든 플레이어에게 버튼 생성
				window.players.forEach(p => p.enableAndCreateButton('monarch'));
				const playerIndex = this.getPlayerIndex();
				window.dataSpace.settings.monarchIndex = playerIndex;
				window.updateAllPlayerIcons();
				break;
			case 'log':
				this.showLifeLog(); // 즉시 로그 창 열기
				break;
			case 'theme':
				this.showThemeSelector(); // 즉시 테마 창 열기
				break;
			case 'layout':
				console.log(`HP Layout button created for player ${this.id}`);
				break;
		}
	}

	rebuildPlayerButtons() {
		const container = this.elements.actionButtonContainer;
        container.innerHTML = ''; 

        this.elements.initiativeButton = null;
        this.elements.monarchButton = null;

		this.counterSettings.forEach(setting => {
            if (setting.enabled) {
                const button = document.createElement('button');
                button.className = 'header-button'; // 스타일 적용
                button.style.backgroundImage = `url(./assets/board_icon/${setting.imageName}.png)`;
                button.style.backgroundSize = setting.backgroundSize || '75%';

				const valueSpan = document.createElement('span');
                valueSpan.className = 'counter-value';
                valueSpan.textContent = setting.count;
                button.appendChild(valueSpan);

                button.addEventListener('pointerdown', (e) => {
                    e.stopPropagation();
                    this.isLongPress = false; // 타이머 시작 시 플래그 초기화

                    this.longPressTimer = setTimeout(() => {
                        // 0.7초 이상 누르면 실행되는 코드 (초기화)
                        this.isLongPress = true; // 길게 누르기 성공!
						this.updateCounterValue(setting, 'reset', e.target);
                    }, 700); // 700ms = 0.7초
                });

                button.addEventListener('pointerup', (e) => {
                    e.stopPropagation();
                    clearTimeout(this.longPressTimer); // 타이머 취소

                    if (!this.isLongPress) {
						this.updateCounterValue(setting, 'increment', e.target);
                    }
                });

                // 마우스가 버튼 밖으로 나가도 타이머 취소
                button.addEventListener('pointerleave', () => {
                    clearTimeout(this.longPressTimer);
                });

                container.appendChild(button);
            }
        });
		
		this.buttonSettings.forEach(setting => {
			if (setting.enabled) {
				let button;
				switch(setting.id) {
					case 'initiative':
						button = document.createElement('button');
						button.className = 'header-button';
						button.style.backgroundImage = 'url(./assets/initiative.png)';
						button.addEventListener('click', (e) => {
							e.stopPropagation();
							window.players.forEach(p => p.enableAndCreateButton('initiative'));
							initiativeManager.showDungeon(this.id); 
						});
						this.elements.initiativeButton = button;
						break;
					case 'monarch':
						button = document.createElement('button');
						button.className = 'header-button';
						button.style.backgroundImage = 'url(./assets/monarch.png)';
						button.addEventListener('click', (e) => {
							e.stopPropagation();
							window.players.forEach(p => p.enableAndCreateButton('monarch'));
							const playerIndex = this.getPlayerIndex();
							if (window.dataSpace.settings.monarchIndex === playerIndex) {
								window.dataSpace.settings.monarchIndex = -1;
							} else {
								window.dataSpace.settings.monarchIndex = playerIndex;
							}
							window.updateAllPlayerIcons();
						});
						this.elements.monarchButton = button;
						break;
					case 'log':
						button = document.createElement('button');
						button.className = 'header-button';
						button.style.backgroundImage = 'url(./assets/lifelog.png)';
						button.style.backgroundSize = '90%';
						button.addEventListener('click', (e) => {
							e.stopPropagation();
							this.showLifeLog();
						});
						break;
					case 'theme':
						button = document.createElement('button');
						button.className = 'header-button';
						button.style.backgroundImage = 'url(./assets/theme.png)';
						button.addEventListener('click', (e) => {
							e.stopPropagation();
							this.showThemeSelector();
						});
						break;
					case 'layout':
						button = document.createElement('button');
						button.className = 'header-button';
						button.style.backgroundImage = 'url(./assets/layout.png)';
						button.style.backgroundSize = '90%';
						button.addEventListener('click', (e) => {
							e.stopPropagation();
							// HP 레이아웃 변경 로직 (향후 구현)
							console.log('HP Layout button clicked');
						});
						break;
				}
				if (button) {
					this.elements.actionButtonContainer.appendChild(button);
				}
			}
		});
	}

	showOptionsModal() {
		this.renderButtonSettingsList(); // 모달을 열 때마다 최신 상태로 목록을 다시 렌더링
		this.elements.optionsModalOverlay.style.display = 'flex';
		window.activeUI = this; // 다른 UI와의 상호작용 방지
	}

	hideOptionsModal() {
		this.elements.optionsModalOverlay.style.display = 'none';
		window.activeUI = null;
	}

	// 기존 createDOM에 있던 다른 요소 생성 코드를 분리
	createDiceAndLogOverlays() {
		// Dice Container
		this.elements.diceContainer = document.createElement('div');
		this.elements.diceContainer.className = 'dice-container';
		this.elements.area.appendChild(this.elements.diceContainer);

		// Life Log Overlay
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
		this.elements.area.appendChild(this.elements.logOverlay);

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

		// Theme Selector Overlay
        this.elements.themeSelector = document.createElement('div');
        this.elements.themeSelector.className = 'theme-selector-overlay';
        
        const themeContainer = document.createElement('div');
        themeContainer.className = 'theme-selector-container'; // 기존 CSS 재사용
        
        this.elements.themeSelector.appendChild(themeContainer);
        this.elements.area.appendChild(this.elements.themeSelector);

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

	setupAreaEventListeners() {
		this.lastTapTime = 0; // 마지막 탭 시간을 기록, 더블 탭 줌 방지용

		this.elements.area.addEventListener('pointerdown', (event) => {
			// ==================================================
			// 1. 더블탭 줌(Zoom) 방지 로직
			// ==================================================
			const now = new Date().getTime();

			// 마지막 탭 이후 300ms 이내에 다시 탭된 경우, 브라우저의 기본 동작(줌)을 막습니다.
			if (now - this.lastTapTime <= 300) {
				event.preventDefault();
			}

			// 현재 탭 시간을 기록하여 다음 탭에서 비교할 수 있도록 합니다.
			this.lastTapTime = now;

			// ==================================================
			// 2. 라이프(Life) 변경 로직
			// ==================================================

			// 버튼 등 다른 UI 요소가 활성화 상태이거나, 특정 버튼을 눌렀을 때는 작동하지 않도록 함
			if (window.activeUI !== null || event.target.closest('.header-button') || event.target.closest('.player-options-button')) {
				return;
			}

			// 탭된 위치를 계산
			const rect = this.elements.area.getBoundingClientRect();
			const pointerX = event.clientX - rect.left;
			const pointerY = event.clientY - rect.top;

			let amount = 0;
			const adjustMode = window.localSettings.lifeAdjustDirection;
			const isRight = pointerX > rect.width / 2;
			const isBottom = pointerY > rect.height / 2;

			// 설정과 화면 회전 상태에 따라 라이프 증감 방향을 결정
			if (adjustMode === 'horizontal') {
				switch (this.rotation) {
					case 0:   amount = isRight ? +1 : -1; break;
					case 180: amount = isRight ? -1 : +1; break;
					case 90:  amount = isBottom ? +1 : -1; break;
					case 270: amount = isBottom ? -1 : +1; break;
				}
			} else { // 'vertical' 모드
				switch (this.rotation) {
					case 0:   amount = isBottom ? -1 : +1; break;
					case 180: amount = isBottom ? +1 : -1; break;
					case 90:  amount = isRight ? +1 : -1; break;
					case 270: amount = isRight ? -1 : +1; break;
				}
			}

			this.changeLife(amount);
			this.showAreaRipple(amount, event);
		});

		// 일부 모바일 브라우저의 더블탭 줌을 막기 위한 추가 리스너
		let lastTouchEnd = 0;
		document.addEventListener('touchend', function (event) {
			const now = new Date().getTime();
			if (now - lastTouchEnd <= 300) {
				event.preventDefault();
			}
			lastTouchEnd = now;
		}, false);
	}

	enableAndCreateButton(buttonId) {
		const setting = this.buttonSettings.find(s => s.id === buttonId);
		if (setting) {
			setting.enabled = true;
			this.rebuildPlayerButtons(); // UI 업데이트
		}
	}

	getPlayerIndex() {
		return window.players.findIndex(p => p.id === this.id);
	}

	updateIcons() {
		const playerIndex = this.getPlayerIndex();
		const theme = this._getThemeByName(this.themeName);
		const highlightColor = theme.highlightColor || '#FFD700';
		const initiativeButton = this.elements.initiativeButton;
		const monarchButton = this.elements.monarchButton;

		const setHighlight = (button, isActive) => {
			button.classList.toggle('active', isActive);
			if (isActive) {
				button.style.setProperty('--highlight-color', highlightColor);
			} else {
				button.style.removeProperty('--highlight-color');
			}
		};

		const isInitiativeActive = (window.dataSpace.settings.initiativeIndex === playerIndex);
		const isMonarchActive = (window.dataSpace.settings.monarchIndex === playerIndex);

		if (this.elements.initiativeButton) {
			setHighlight(this.elements.initiativeButton, isInitiativeActive);
		}

		if (this.elements.monarchButton) {
			setHighlight(this.elements.monarchButton, isMonarchActive);
		}
		
		const bothAreActive = isInitiativeActive && isMonarchActive;
		if (this.elements.initiativeButton && this.elements.monarchButton && bothAreActive) {
			const restartAnimation = (el) => {
				el.classList.remove('is-animating');
				void el.offsetWidth;
				el.classList.add('is-animating');
			};
			restartAnimation(initiativeButton);
			restartAnimation(monarchButton);
		} else {
			if (this.elements.initiativeButton) {
                this.elements.initiativeButton.classList.toggle('is-animating', isInitiativeActive);
            }
            if (this.elements.monarchButton) {
                this.elements.monarchButton.classList.toggle('is-animating', isMonarchActive);
            }
		}
	}

    showThemeSelector() {
        const themeContainer = this.elements.themeSelector.querySelector('.theme-selector-container');
		themeContainer.innerHTML = ''; 

		const usedThemeNames = window.players
			.filter(p => p.id !== this.id)
			.map(p => p.themeName);

		// 테마 그룹(한 줄)을 생성하는 헬퍼 함수
		const createThemeGroup = (title, themeList) => {
			const group = document.createElement('div');
			group.className = 'theme-group'; // <- 이 클래스가 한 줄을 담당

			const groupTitle = document.createElement('div');
			groupTitle.className = 'theme-group-title';
			groupTitle.textContent = title;
			group.appendChild(groupTitle);
			
			const swatchesContainer = document.createElement('div');
			swatchesContainer.className = 'theme-swatches-container'; // <- 스와치들을 감싸는 컨테이너
			group.appendChild(swatchesContainer);

			themeList.forEach(theme => {
				const swatch = document.createElement('div');
				swatch.className = 'theme-swatch';
				swatch.style.background = theme.background;
				
				if (usedThemeNames.includes(theme.name)) {
					swatch.classList.add('disabled');
				} else {
					swatch.addEventListener('click', () => {
						this.themeName = theme.name;
						this.applyTheme();
						window.saveLifeTotals();
						this.hideThemeSelector();
					});
				}
				swatchesContainer.appendChild(swatch);
			});
			return group;
		};

		themeContainer.appendChild(createThemeGroup('Light Themes', allThemes.light));
		themeContainer.appendChild(createThemeGroup('Dark Themes', allThemes.dark));

		this.elements.themeSelector.style.display = 'flex';
		window.activeUI = this;
    }

	hideThemeSelector() {
		this.elements.themeSelector.style.display = 'none';
		window.activeUI = null;
	}

	changeLife(amount) {
        clearTimeout(this.lifeChangeTimeout);

        this.lifeChangeAmount += amount;
        this.life += amount;
        
        // HP 숫자에 '펄스' 애니메이션을 적용하며 업데이트
        this.updateDisplay(true);

        // ## 변경점 2 ##: 누적 변경량이 0이 아닐 때만 피드백을 표시하고 타이머를 설정합니다.
        if (this.lifeChangeAmount !== 0) {
            // 피드백 요소가 없으면 새로 생성
            if (!this.cumulativeFeedbackEl) {
                this.cumulativeFeedbackEl = document.createElement('div');
                this.cumulativeFeedbackEl.className = 'life-feedback';
                // ## 변경점 1 ##: 피드백 위치를 위로 조정 (40% -> 35%). 원하시면 값을 더 줄여서 올릴 수 있습니다.
                this.cumulativeFeedbackEl.style.top = '25%';
                this.cumulativeFeedbackEl.style.left = '50%';

                this.elements.area.appendChild(this.cumulativeFeedbackEl);
            }
            
            // 피드백 요소의 숫자와 스타일 업데이트
            this.cumulativeFeedbackEl.style.opacity = '1'; 
            const theme = this._getThemeByName(this.themeName);
            const displayAmount = this.lifeChangeAmount > 0 ? `+${this.lifeChangeAmount}` : `${this.lifeChangeAmount}`;
            this.cumulativeFeedbackEl.textContent = displayAmount;
            if (theme) {
                this.cumulativeFeedbackEl.style.color = this.lifeChangeAmount > 0 ? theme.plusColor : theme.minusColor;
            }

            // 새로운 '800ms 뒤에 끄기' 타이머 설정
            this.lifeChangeTimeout = setTimeout(() => {
                this.logEvent('lifeChange', {
                    amount: this.lifeChangeAmount,
                    lifeAfter: this.life
                });

                if (this.cumulativeFeedbackEl) {
                    this.cumulativeFeedbackEl.style.transition = 'opacity 0.3s ease-out';
                    this.cumulativeFeedbackEl.style.opacity = '0';
                    
                    setTimeout(() => {
                        if(this.cumulativeFeedbackEl) this.cumulativeFeedbackEl.remove();
                        this.cumulativeFeedbackEl = null;
                    }, 300);
                }
                
                this.lifeChangeAmount = 0;
            }, 800);

        } 
        // ## 변경점 2 ##: 누적 변경량이 정확히 0이 된 경우의 처리
        else {
            // 기존에 표시되던 피드백이 있다면 즉시 제거합니다.
            if (this.cumulativeFeedbackEl) {
                this.cumulativeFeedbackEl.remove();
                this.cumulativeFeedbackEl = null;
            }
            // 타이머는 함수 시작 시점에 이미 clear 되었으므로 추가 작업이 필요 없습니다.
        }
    }

	updateDisplay(withAnimation = false) {
        const el = this.elements.lifeTotal;
        el.textContent = this.life;

        if (withAnimation) {
            el.classList.remove('life-total-animate');
            void el.offsetWidth;
            el.classList.add('life-total-animate');
        }
    }

	setLife(newLife, isReset = false) {
        this.life = newLife;
        if (isReset) {
            this.lifeLog = [];
            this.logEvent('reset', { lifeAfter: this.life });
            // ## 변경점 2 ##: 리셋 시에는 인트로 애니메이션을 재생
            this.playIntroAnimation();
        } else {
            // ## 변경점 2 ##: 일반적인 life 설정 시에는 펄스 애니메이션 재생
            this.updateDisplay(true);
        }
    }

	playIntroAnimation() {
		const el = this.elements.lifeTotal;
		el.classList.remove('animate-intro');
		void el.offsetWidth;
		el.classList.add('animate-intro');
	}

	rotateArea() {
		this.rotation = (this.rotation + 90) % 360;
		this.updateRotationClass();
	}
	
	updateRotationClass() {
		// 기존에 붙어있을 수 있는 모든 회전 관련 클래스를 먼저 제거합니다.
		this.elements.area.classList.remove('rotated-0', 'rotated-90', 'rotated-180', 'rotated-270');
		
		// 현재 회전 상태에 맞는 클래스를 player-area 요소에 직접 추가합니다. (이것으로 끝!)
		this.elements.area.classList.add(`rotated-${this.rotation}`);
	}

	showAreaRipple(amount, event) {
		// event가 없으면 함수를 바로 종료합니다.
		if (!event) return;

		const ripple = document.createElement('div');
		ripple.className = 'life-ripple';
		const theme = this._getThemeByName(this.themeName);

		if (amount > 0) {
			ripple.style.backgroundColor = theme.ripplePlusColor || 'rgba(0, 255, 255, 0.4)';
		} else {
			ripple.style.backgroundColor = theme.rippleMinusColor || 'rgba(255, 80, 80, 0.4)';
		}

		const rect = this.elements.area.getBoundingClientRect();

		// ▼▼▼▼▼ 여기가 수정된 부분입니다 ▼▼▼▼▼

		// 기존 변수명 'x', 'y'를 그대로 사용하되, 값을 변경해야 하므로 const 대신 let으로 선언합니다.
		let x = event.clientX - rect.left;
		let y = event.clientY - rect.top;

		// 플레이어의 회전 상태에 따라 실제 클릭 좌표를 보정합니다.
		switch (this.rotation) {
			case 90: {
				const tempX = x;
				x = y;
				y = rect.height - tempX;
				break;
			}
			case 180: {
				x = rect.width - x;
				y = rect.height - y;
				break;
			}
			case 270: {
				const tempY = y;
				y = x;
				x = rect.width - tempY;
				break;
			}
		}
		// ▲▲▲▲▲ 여기까지가 수정된 부분입니다 ▲▲▲▲▲

		ripple.style.left = `${x - 50}px`;
		ripple.style.top = `${y - 50}px`;

		this.elements.area.appendChild(ripple);
		setTimeout(() => ripple.remove(), 600);
	}

	updateHint() {
		const adjustMode = window.localSettings.lifeAdjustDirection;
		const spacing = '7rem';
		const inc = this.elements.hintInc;
		const dec = this.elements.hintDec;
		const theme = this._getThemeByName(this.themeName);
		inc.textContent = '+';
		dec.textContent = '-';
		if(theme) {
			inc.style.color = theme.plusColor;
			dec.style.color = theme.minusColor;
		}
		[inc, dec].forEach(el => {
			el.style.top = '';
			el.style.left = '';
			el.style.transform = '';
		});
		if (adjustMode === 'horizontal') {
			inc.style.top = '50%';
			inc.style.left = `calc(50% + ${spacing})`;
			inc.style.transform = 'translate(-50%, -50%)';
			dec.style.top = '50%';
			dec.style.left = `calc(50% - ${spacing})`;
			dec.style.transform = 'translate(-50%, -50%)';
		} else {
			inc.style.top = `calc(50% - ${spacing})`;
			inc.style.left = '50%';
			inc.style.transform = 'translate(-50%, -50%)';
			dec.style.top = `calc(50% + ${spacing})`;
			dec.style.left = '50%';
			dec.style.transform = 'translate(-50%, -50%)';
		}
	}

	logEvent(type, details = {}) {
		const logEntry = {
			timestamp: new Date().toISOString(),
			type: type,
			...details
		};
		this.lifeLog.push(logEntry);
		console.log(`Log for ${this.id}:`, logEntry);
	}

	showLifeLog() {
		this.elements.logOverlay.style.display = 'flex';
		const theme = this._getThemeByName(this.themeName);
		renderLifeLogChart(this.elements.logCanvas, this.lifeLog, theme);
	}
}
