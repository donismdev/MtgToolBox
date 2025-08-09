import { allThemes } from './themes.js';
import { initiativeManager } from './initiative.js';
import * as secretNotes from './secretNotes.js';

// Import new modules
import { OptionsModal } from './OptionsModal.js';
import { CountersViewerModal } from './CountersViewerModal.js';
import { LifeLogOverlay } from './LifeLogOverlay.js';
import { ThemeSelectorOverlay } from './ThemeSelectorOverlay.js';

function getLifeChangeDirection(position, rect, rotation) {
    const adjustMode = window.localSettings.lifeAdjustDirection;
    let amount = 0;

    if (adjustMode === 'horizontal') {
        const isRight = position.x > rect.width / 2;
        switch (rotation) {
            case 0: amount = isRight ? 1 : -1; break;
            case 180: amount = isRight ? -1 : 1; break;
            case 90: amount = position.y > rect.height / 2 ? 1 : -1; break;
            case 270: amount = position.y > rect.height / 2 ? -1 : 1; break;
        }
    } else { // vertical
        const isBottom = position.y > rect.height / 2;
        switch (rotation) {
            case 0: amount = isBottom ? -1 : 1; break;
            case 180: amount = isBottom ? 1 : -1; break;
            case 90: amount = position.x > rect.width / 2 ? 1 : -1; break;
            case 270: amount = position.x > rect.width / 2 ? -1 : 1; break;
        }
    }
    return amount;

}
export class Player {

    // Helper to update all player icons
    static updateAllPlayerIcons() {
        window.players.forEach(p => p.updateIcons());
    }


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

		// 드래그 상태 변수
		this.isDragging = false;
		this.isPressing = false;
		this.dragStartPos = { x: 0, y: 0 };
		this.longPressTimer = null;
		this.fastChangeAmount = 5;

		// [NEW] State for the split-screen view
        this.splitViewCounters = []; // Stores the IDs of counters to display in split view

		this.buttonSettings = [
			{ id: 'initiative',	label: 'Initiative',	enabled: false, backgroundSize: '85%' },
			{ id: 'monarch',	label: 'Monarch',		enabled: false, backgroundSize: '85%' },
			{ id: 'log',		label: 'Life Log',		enabled: false, backgroundSize: '95%' },
			{ id: 'theme',		label: 'Theme',			enabled: false, backgroundSize: '85%' },
			{ id: 'layout',		label: 'HP Layout',		enabled: false, backgroundSize: '85%' },
			{ id: 'counter',	label: 'Counters',		enabled: false, backgroundSize: '85%' },
			{ id: 'note',		label: 'Secret Notes',	enabled: false, backgroundSize: '85%' },
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

		this.genericCounters = [
            { id: 'energy',   imageName: 'energy',   count: 0, label: '' },
            { id: 'skull',    imageName: 'skull',    count: 0, label: '' },
            { id: 'power',    imageName: 'power',    count: 0, label: '' },
            { id: 'treasure', imageName: 'treasure', count: 0, label: '' },
            { id: 'clue',     imageName: 'clue',     count: 0, label: '' },
            { id: 'food',     imageName: 'food',     count: 0, label: '' },
            { id: 'blood',    imageName: 'blood',    count: 0, label: '' },
            { id: 'card',     imageName: 'card',     count: 0, label: '' },
            { id: 'potion',   imageName: 'potion',   count: 0, label: '' },
            { id: 'wizard',   imageName: 'wizard',   count: 0, label: '' },
            { id: 'weapon',   imageName: 'weapon',   count: 0, label: '' },
            { id: 'sun',      imageName: 'sun',      count: 0, label: '' },
            { id: 'shield',   imageName: 'shield',   count: 0, label: '' },
            { id: 'hood',     imageName: 'hood',     count: 0, label: '' },
            { id: 'feather',  imageName: 'feather',  count: 0, label: '' },
            { id: 'battle',   imageName: 'battle',   count: 0, label: '' },
        ];

		this.secretNotes = Array(5).fill(null).map(() => secretNotes.createDefaultNote());

        // Modals and Overlays (lazy loaded)
        this.optionsModal = null;
        this.countersViewerModal = null;
        this.lifeLogOverlay = null;
        this.themeSelectorOverlay = null;

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

		// 1. 모든 구성요소를 생성합니다 (순서는 아직 중요하지 않음).
		
		// 옵션 버튼 생성
		this.elements.optionsButton = document.createElement('button');
		this.elements.optionsButton.className = 'player-options-button header-button';
		this.elements.optionsButton.style.backgroundImage = 'url(./assets/option.png)';
		this.elements.optionsButton.addEventListener('click', (e) => {
			e.stopPropagation();
			this.showOptionsModal();
		});

		// 액션 버튼 컨테이너 생성
		this.elements.actionButtonContainer = document.createElement('div');
		this.elements.actionButtonContainer.className = 'player-header-buttons';

		// 기본 뷰 Wrapper 생성 (전체 화면을 덮는 투명한 배경 역할)
		this.elements.contentWrapper = document.createElement('div');
		this.elements.contentWrapper.className = 'player-content-wrapper'; 

		// 분할 뷰 컨테이너 생성
		this.elements.splitViewContainer = document.createElement('div');
		this.elements.splitViewContainer.className = 'split-view-container';
		
		// 주사위 컨테이너 생성
		this.elements.diceContainer = document.createElement('div');
		this.elements.diceContainer.className = 'dice-container';

		// 생명점 숫자 및 힌트 생성
		this.elements.lifeTotal = document.createElement('div');
		this.elements.lifeTotal.className = 'life-total user-select-none';
		this.elements.hintInc = document.createElement('div');
		this.elements.hintDec = document.createElement('div');
		this.elements.hintInc.className = 'life-hint increase';
		this.elements.hintDec.className = 'life-hint decrease';

		// Wrapper 안에 생명점 관련 요소들을 넣습니다.
		this.elements.contentWrapper.appendChild(this.elements.hintInc);
		this.elements.contentWrapper.appendChild(this.elements.hintDec);
		this.elements.contentWrapper.appendChild(this.elements.lifeTotal);
		
		
		// 2. ✅ [핵심 수정] 최종적으로 player-area에 요소를 쌓는 순서를 변경합니다.
		// 배경 역할을 하는 요소들을 먼저 추가합니다.
		this.elements.area.appendChild(this.elements.contentWrapper);       // 기본 뷰 (가장 아래)
		this.elements.area.appendChild(this.elements.splitViewContainer);   // 분할 뷰
		this.elements.area.appendChild(this.elements.diceContainer);        // 주사위 컨테이너

		// 그 위에 사용자가 클릭해야 하는 UI 버튼들을 추가합니다.
		this.elements.area.appendChild(this.elements.actionButtonContainer); // 액션 버튼 (가장 위)
		this.elements.area.appendChild(this.elements.optionsButton);       // 옵션 버튼 (가장 위)


		// 3. 이벤트 리스너 설정 및 초기화
		this.setupInteractiveQuadrant(this.elements.contentWrapper, 'life');
		
		this.rebuildPlayerButtons();
		this.updateRotationClass();
		secretNotes.initialize(this);
	}

	setupInteractiveQuadrant(quadrantElement, target) {
		let isPressing = false, isDragging = false;
		let longPressTimer = null, dragStartPos = { x: 0, y: 0 };
		
		let dragChangeAmount = 0;
		let dragFeedbackEl = null;

		const DRAG_SENSITIVITY = 40;
		const LONG_PRESS_DURATION = 250;

		// ✅ [핵심 수정 1] 회전 각도에 따라 방향을 뒤집을지 결정하는 변수 추가
		const adjustMode = window.localSettings.lifeAdjustDirection;
		let directionMultiplier = 1;
		if (adjustMode === 'horizontal') {
			if (this.rotation === 180 || this.rotation === 270) {
				directionMultiplier = -1;
			}
		} else { // 'vertical'
			if (this.rotation === 180 || this.rotation === 90) {
				directionMultiplier = -1;
			}
		}

		const getPointerPosition = (event) => {
			const rect = quadrantElement.getBoundingClientRect();
			return { x: event.clientX - rect.left, y: event.clientY - rect.top };
		};

		const handleChange = (amount) => {
			if (amount === 0) return;
			if (target === 'life') {
				this.changeLife(amount);
			} else {
				const action = amount > 0 ? 'increment' : 'decrement';
				for (let i = 0; i < Math.abs(amount); i++) {
					this.updateCounterValue(target, action, null);
				}
				const valueElement = quadrantElement.querySelector('.counter-quadrant-value');
				if (valueElement) valueElement.textContent = target.count;
				this.showQuadrantFeedback(amount, quadrantElement);
			}
		};
		
		quadrantElement.addEventListener('pointerdown', (e) => {
			if (window.activeUI !== null || e.target.closest('.header-button, .player-options-button')) return;
			e.stopPropagation();

			isPressing = true;
			isDragging = false;
			dragStartPos = getPointerPosition(e);
			dragChangeAmount = 0;

			const clickDirection = getLifeChangeDirection(dragStartPos, quadrantElement.getBoundingClientRect(), this.rotation);

			longPressTimer = setTimeout(() => {
				if (isPressing && !isDragging) {
					handleChange(clickDirection * (this.fastChangeAmount - 1));
					if (navigator.vibrate) navigator.vibrate(50);
				}
			}, LONG_PRESS_DURATION);

			const onPointerMove = (ev) => {
				if (!isPressing) return;
				const currentPos = getPointerPosition(ev);
				const deltaX = currentPos.x - dragStartPos.x;
				const deltaY = currentPos.y - dragStartPos.y;

				if (!isDragging && Math.hypot(deltaX, deltaY) > DRAG_SENSITIVITY / 2) {
					isDragging = true;
					clearTimeout(longPressTimer);
					if (!dragFeedbackEl) {
						dragFeedbackEl = document.createElement('div');
						dragFeedbackEl.className = 'drag-cumulative-feedback';
						quadrantElement.appendChild(dragFeedbackEl);
					}
				}

				if (isDragging) {
					const changeDelta = (adjustMode === 'horizontal') ? deltaX : deltaY;
					
					// ✅ [핵심 수정 2] 기기가 인식한 값에 방향 변수를 곱해줍니다.
					const newTotalAmount = Math.round(changeDelta / DRAG_SENSITIVITY) * directionMultiplier;

					if (newTotalAmount !== dragChangeAmount) {
						dragChangeAmount = newTotalAmount;
						const displayAmount = dragChangeAmount > 0 ? `+${dragChangeAmount}` : `${dragChangeAmount}`;
						dragFeedbackEl.textContent = displayAmount;
					}
				}
			};

			const onPointerUp = (ev) => {
				clearTimeout(longPressTimer);
				if (isDragging) {
					// ✅ [핵심 수정 3] 최종 적용되는 값도 이미 방향이 보정된 값을 사용합니다.
					handleChange(dragChangeAmount);
					if (dragFeedbackEl) {
						dragFeedbackEl.remove();
						dragFeedbackEl = null;
					}
				} else if (isPressing) {
					handleChange(getLifeChangeDirection(getPointerPosition(ev), quadrantElement.getBoundingClientRect(), this.rotation));
				}

				isPressing = false;
				isDragging = false;
				window.removeEventListener('pointermove', onPointerMove);
				window.removeEventListener('pointerup', onPointerUp);
			};

			window.addEventListener('pointermove', onPointerMove);
			window.addEventListener('pointerup', onPointerUp);
		});
	}

	toggleCounterForSplitView(counterId, isAdding) {
		console.log(`[1] toggleCounterForSplitView 호출됨: ${counterId}, 추가?: ${isAdding}`);
		console.log(`[2] 변경 전 카운터 목록:`, [...this.splitViewCounters]);

		// 대응되는 counter setting 찾기
		const setting = this.counterSettings.find(s => s.id === counterId);

		const index = this.splitViewCounters.indexOf(counterId);

		if (isAdding && index === -1) {
			if (this.splitViewCounters.length < 4) {
				this.splitViewCounters.push(counterId);
				// ⬇️ 헤더 버튼(메인 버튼)에도 노출되도록 enable
				if (setting != null) setting.enabled = true;
			} else {
				alert("분할 화면에는 최대 4개의 카운터만 추가할 수 있습니다.");
				if (this.optionsModal) {
					this.optionsModal.renderCounterSettingsList();
				}
				return;
			}
		} else if (!isAdding && index > -1) {
			this.splitViewCounters.splice(index, 1);
			// ⬇️ 분할뷰에서 뺐으면 헤더 버튼도 숨기고 싶다면 꺼준다(필요 없으면 이 줄은 주석)
			if (setting != null) setting.enabled = false;
		}

		console.log(`[3] 변경 후 카운터 목록:`, [...this.splitViewCounters]);

		// ⬇️ 헤더 버튼(메인 버튼) 최신화
		this.rebuildPlayerButtons();

		// 분할 뷰 토글
		if (this.splitViewCounters.length > 0) {
			this._activateSplitView();
		} else {
			this._deactivateSplitView();
		}
	}

	_activateSplitView() {
		// 분할 뷰 내용 먼저 그리기
		this.rebuildSplitView();
		// 기본 뷰 숨김, 분할 뷰 표시
		this.elements.contentWrapper.classList.add('hidden');
		this.elements.splitViewContainer.classList.add('active');
	}

	// 분할 화면을 비활성화하는 메서드
	_deactivateSplitView() {
		// 클래스를 제거하여 원래 상태로 되돌립니다.
		this.elements.contentWrapper.classList.remove('hidden');
		this.elements.splitViewContainer.classList.remove('active');
	}

	showQuadrantFeedback(amount, quadrantElement) {
		if (!quadrantElement) return;

		// 기존 피드백이 있다면 제거
		const oldFeedback = quadrantElement.querySelector('.quadrant-feedback');
		if (oldFeedback) oldFeedback.remove();

		const feedbackEl = document.createElement('div');
		feedbackEl.className = 'quadrant-feedback'; // CSS 스타일링을 위함

		const displayAmount = amount > 0 ? `+${amount}` : `${amount}`;
		feedbackEl.textContent = displayAmount;

		const theme = this._getThemeByName(this.themeName);
		if (theme) {
			feedbackEl.style.color = amount > 0 ? theme.plusColor : theme.minusColor;
		}
		
		quadrantElement.appendChild(feedbackEl);

		// 잠시 후 사라지는 애니메이션
		setTimeout(() => {
			feedbackEl.style.opacity = '0';
			feedbackEl.style.transform = 'translate(-50%, -150%)';
		}, 100); // 아주 약간의 딜레이 후 애니메이션 시작

		setTimeout(() => {
			feedbackEl.remove();
		}, 800); // 0.8초 후에 DOM에서 완전히 제거
	}

    // [NEW] Dynamically builds the content of the split-screen view
    rebuildSplitView() {
        const container = this.elements.splitViewContainer;
        container.innerHTML = ''; // Clear previous content

        // 1. Create HP Area (Top 1/4)
        const hpArea = document.createElement('div');
        hpArea.className = 'split-hp-area';
        
        const hpValue = document.createElement('div');
        hpValue.className = 'split-hp-value user-select-none';
        hpValue.textContent = this.life;
        
        const hintInc = document.createElement('div');
        const hintDec = document.createElement('div');
        hintInc.className = 'life-hint increase';
        hintDec.className = 'life-hint decrease';
        hintInc.textContent = '+';
        hintDec.textContent = '-';
        const theme = this._getThemeByName(this.themeName);
        if (theme) {
            hintInc.style.color = theme.plusColor;
            hintDec.style.color = theme.minusColor;
        }

        hpArea.appendChild(hintInc);
        hpArea.appendChild(hintDec);
        hpArea.appendChild(hpValue);
        container.appendChild(hpArea);
        
        this.elements.splitViewHPValue = hpValue; // Store reference to update later
        this.setupInteractiveQuadrant(hpArea, 'life');

        // 2. Create Counter Grid (Bottom 3/4)
        const counterGrid = document.createElement('div');
        counterGrid.className = 'split-counter-grid';
        container.appendChild(counterGrid);

        // 3. Populate grid with selected counters
        this.splitViewCounters.forEach(counterId => {
            const setting = this.counterSettings.find(s => s.id === counterId);
            if (!setting) return;

            const quadrant = document.createElement('div');
            quadrant.className = 'counter-quadrant';
            quadrant.dataset.counterId = counterId; // For easy identification

            const icon = document.createElement('div');
            icon.className = 'counter-quadrant-icon';
            icon.style.backgroundImage = `url(./assets/board_icon/${setting.imageName}.png)`;

            const value = document.createElement('div');
            value.className = 'counter-quadrant-value user-select-none';
            value.textContent = setting.count;

            quadrant.appendChild(icon);
            quadrant.appendChild(value);

            if (setting.label) {
                const label = document.createElement('div');
                label.className = 'counter-quadrant-label user-select-none';
                label.textContent = setting.label;
                quadrant.appendChild(label);
            }
            
            counterGrid.appendChild(quadrant);

            this.setupInteractiveQuadrant(quadrant, setting); 
        });
    }

	setupAreaEventListeners() {
		this.lastTapTime = 0;
		this.isPressing = false;
		this.isDragging = false;
		this.longPressTimer = null;
		this.dragStartPos = { x: 0, y: 0 };
		this.draggedDistance = 0;

		const DRAG_THRESHOLD = 20; // 드래그 감도 조절
		const LONG_PRESS_DURATION = 250;

		const getPointerPosition = (event) => {
			const rect = this.elements.area.getBoundingClientRect();
			return {
				x: event.clientX - rect.left,
				y: event.clientY - rect.top
			};
		};

		// 클릭 위치에 따른 생명점 증감 로직
		const getClickLifeChange = (position) => {
			const rect = this.elements.area.getBoundingClientRect();
			const adjustMode = window.localSettings.lifeAdjustDirection;
			let amount = 0;

			if (adjustMode === 'horizontal') {
				const isRight = position.x > rect.width / 2;
				switch (this.rotation) {
					case 0: amount = isRight ? 1 : -1; break;
					case 180: amount = isRight ? -1 : 1; break;
					case 90: amount = position.y > rect.height / 2 ? 1 : -1; break;
					case 270: amount = position.y > rect.height / 2 ? -1 : 1; break;
				}
			} else { // vertical
				const isBottom = position.y > rect.height / 2;
				switch (this.rotation) {
					case 0: amount = isBottom ? -1 : 1; break;
					case 180: amount = isBottom ? 1 : -1; break;
					case 90: amount = position.x > rect.width / 2 ? 1 : -1; break;
					case 270: amount = position.x > rect.width / 2 ? -1 : 1; break;
				}
			}
			return amount;
		};

		this.elements.area.addEventListener('pointerdown', (e) => {
			if (window.activeUI !== null || e.target.closest('.header-button, .player-options-button')) {
				return;
			}

			const now = new Date().getTime();
			if (now - this.lastTapTime <= 300) e.preventDefault();
			this.lastTapTime = now;

			this.isPressing = true;
			this.isDragging = false;
			this.draggedDistance = 0;
			this.dragStartPos = getPointerPosition(e);

			this.longPressTimer = setTimeout(() => {
				if (this.isPressing && !this.isDragging) {
					this.isPressing = false;
					const amount = getClickLifeChange(this.dragStartPos) * (this.fastChangeAmount - 1);
					this.changeLife(amount);
					this.showAreaRipple(amount, e);
					if (navigator.vibrate) navigator.vibrate(50);
				}
			}, LONG_PRESS_DURATION);

			window.addEventListener('pointermove', onPointerMove);
			window.addEventListener('pointerup', onPointerUp);
		});

		const onPointerMove = (e) => {
			if (!this.isPressing) return;

			const currentPos = getPointerPosition(e);
			const deltaX = currentPos.x - this.dragStartPos.x;
			const deltaY = currentPos.y - this.dragStartPos.y;
			const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

			if (!this.isDragging && distance > DRAG_THRESHOLD) {
				this.isDragging = true;
				clearTimeout(this.longPressTimer);
				this.elements.dragFeedback.classList.add('active');
			}

			if (this.isDragging) {
				this.draggedDistance = distance;
				const feedbackStrength = Math.min(this.draggedDistance / 100, 1);
				this.elements.dragFeedback.style.opacity = feedbackStrength;
				this.elements.dragFeedback.style.transform = `translate(-50%, -50%) scale(${1 + feedbackStrength * 0.2})`;
			}
		};

		const onPointerUp = (e) => {
			clearTimeout(this.longPressTimer);

			if (this.isDragging) {
				const currentPos = getPointerPosition(e);
				const deltaX = currentPos.x - this.dragStartPos.x;
				const deltaY = currentPos.y - this.dragStartPos.y;
				const adjustMode = window.localSettings.lifeAdjustDirection;
				let change = 0;

				if (adjustMode === 'horizontal') {
					change = Math.round(deltaX / DRAG_THRESHOLD) * this.fastChangeAmount;
				} else {
					change = Math.round(deltaY / DRAG_THRESHOLD) * this.fastChangeAmount;
				}

				let amount = getClickLifeChange(this.dragStartPos) > 0 ? Math.abs(change) : -Math.abs(change);
				this.changeLife(amount);

			} else if (this.isPressing) {
				const amount = getClickLifeChange(this.dragStartPos);
				this.changeLife(amount);
				this.showAreaRipple(amount, e);
			}

			this.isPressing = false;
			this.isDragging = false;
			this.elements.dragFeedback.classList.remove('active');
			this.elements.dragFeedback.style.opacity = 0;

			window.removeEventListener('pointermove', onPointerMove);
			window.removeEventListener('pointerup', onPointerUp);
		};
	}

	updateCounterValue(setting, action, targetElement = null) {
		// 1. action에 따라 데이터(count)를 변경합니다.
		if (action === 'increment') setting.count++;
		else if (action === 'decrement') setting.count--;
		else if (action === 'reset') setting.count = 0;
		// action이 null이면(라벨만 변경된 경우 등) 데이터 변경 없이 UI만 새로고침합니다.

		// 2. targetElement가 있고(메인 버튼 클릭) 라벨이 존재하면 말풍선을 표시합니다.
		if (targetElement) {

			let bubbleText = action;

			if (bubbleText == null || bubbleText === '') 
			{
				bubbleText = "Counts Changed";
			}
			if (setting.label) {
				bubbleText += `: ${setting.label}`;
			}

			if (action === 'reset') {
				bubbleText += " reset!";
			}
			
			this.showSpeechBubble(bubbleText, targetElement);
		}

		// 3. 모든 UI를 최신 데이터로 새로고침하여 동기화합니다.
		this.rebuildPlayerButtons();
        // OptionsModal이 열려있다면 카운터 설정 목록도 업데이트
        if (this.optionsModal && this.optionsModal.elements.counterSettingsList) {
            this.optionsModal.renderCounterSettingsList();
        }
		if (this.splitViewCounters.length > 0) {
        this.rebuildSplitView();
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

	enableAndCreateButton(buttonId) {
		const setting = this.buttonSettings.find(s => s.id === buttonId);
		if (setting) {
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
				Player.updateAllPlayerIcons();
				break;
			case 'log':
                if (!this.lifeLogOverlay) {
                    this.lifeLogOverlay = new LifeLogOverlay(this);
                }
				this.lifeLogOverlay.show();
				break;
			case 'theme':
                if (!this.themeSelectorOverlay) {
                    this.themeSelectorOverlay = new ThemeSelectorOverlay(this);
                }
				this.themeSelectorOverlay.show();
				break;
			case 'layout':
				console.log(`HP Layout button created for player ${this.id}`);
				break;
			case 'counter':
                if (!this.countersViewerModal) {
                    this.countersViewerModal = new CountersViewerModal(this);
                }
                this.countersViewerModal.show();
                break;
            case 'note':
				secretNotes.showHub(this);
                break;
		}
	}

	rebuildPlayerButtons() {
		const container = this.elements.actionButtonContainer;
        container.innerHTML = ''; 

        this.elements.initiativeButton = null;
        this.elements.monarchButton = null;

        const fragment = document.createDocumentFragment();

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
                    this.isLongPress = false; 

                    // 즉시 1 증가
                    this.updateCounterValue(setting, 'increment', e.target);

                    this.longPressTimer = setTimeout(() => {
                        this.isLongPress = true; 
						// 길게 누르기 성공 시, 1 증가했던 것을 초기화하고 reset
						this.updateCounterValue(setting, 'reset', e.target);
                    }, 700); 
                });

                button.addEventListener('pointerup', (e) => {
                    e.stopPropagation();
                    clearTimeout(this.longPressTimer);
                });

                // 마우스가 버튼 밖으로 나가도 타이머 취소
                button.addEventListener('pointerleave', () => {
                    clearTimeout(this.longPressTimer);
                });

                fragment.appendChild(button);
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
							Player.updateAllPlayerIcons();
						});
						this.elements.monarchButton = button;
						break;
					case 'log':
						button = document.createElement('button');
						button.className = 'header-button';
						button.style.backgroundImage = 'url(./assets/lifelog.png)';
						
						button.addEventListener('click', (e) => {
							e.stopPropagation();
							this.executeButtonAction('log');
						});
						break;
					case 'theme':
						button = document.createElement('button');
						button.className = 'header-button';
						button.style.backgroundImage = 'url(./assets/theme.png)';
						button.addEventListener('click', (e) => {
							e.stopPropagation();
							this.executeButtonAction('theme');
						});
						break;
					case 'layout':
						button = document.createElement('button');
						button.className = 'header-button';
						button.style.backgroundImage = 'url(./assets/layout.png)';
						button.addEventListener('click', (e) => {
							e.stopPropagation();
							// HP 레이아웃 변경 로직 (향후 구현)
							console.log('HP Layout button clicked');
						});
						break;
					case 'counter':
                        button = document.createElement('button');
                        button.className = 'header-button';
                        button.style.backgroundImage = 'url(./assets/counter.png)'; // 예시 아이콘
                        button.addEventListener('click', (e) => {
                            e.stopPropagation();
                            this.executeButtonAction('counter');
                        });
                        break;
					case 'note':
                        button = document.createElement('button');
                        button.className = 'header-button';
                        button.style.backgroundImage = 'url(./assets/note.png)'; // 예시 아이콘
                        button.addEventListener('click', (e) => {
                            e.stopPropagation();
							this.executeButtonAction('note');
                        });
                        break;
				}
				if (button) {
					button.style.backgroundSize = setting.backgroundSize || '85%';
					fragment.appendChild(button);
				}
			}
		});
        container.appendChild(fragment);
	}

    showOptionsModal() {
        if (!this.optionsModal) {
            this.optionsModal = new OptionsModal(this);
            this.elements.area.appendChild(this.optionsModal.elements.optionsModalOverlay);
        }
        
        // This is a hypothetical addition to your OptionsModal rendering logic.
        // You would add a checkbox that controls the split view.
        // For example, in your OptionsModal's `renderGeneralSettings` method:
        /*
            const splitViewToggle = document.createElement('input');
            splitViewToggle.type = 'checkbox';
            splitViewToggle.checked = this.player.isSplitViewActive;
            splitViewToggle.addEventListener('change', (e) => {
                this.player.setSplitViewActive(e.target.checked);
            });
            // ... append this toggle to a label and the settings list ...
        */
        
        this.optionsModal.show();
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
		// 기본 뷰의 생명점 업데이트
		const el = this.elements.lifeTotal;
		el.textContent = this.life;

		if (withAnimation) {
			el.classList.remove('life-total-animate');
			void el.offsetWidth;
			el.classList.add('life-total-animate');
		}

		// ✅ [수정] 분할 화면의 생명점도 함께 업데이트
		// isSplitViewActive 대신 splitViewCounters 배열의 길이로 확인합니다.
		if (this.splitViewCounters.length > 0 && this.elements.splitViewHPValue) {
			const hpEl = this.elements.splitViewHPValue;
			hpEl.textContent = this.life;
			
			if (withAnimation) {
				hpEl.classList.remove('life-total-animate');
				void hpEl.offsetWidth;
				hpEl.classList.add('life-total-animate');
			}
		}
	}

	setLife(newLife, isReset = false) {
        this.life = newLife;
        if (isReset) {
            this.lifeLog = [];

			this.counterSettings.forEach(setting => {
            	setting.count = 0;
			});

            this.logEvent('reset', { lifeAfter: this.life });
            this.updateDisplay(true); // Ensure display is updated on reset
        } else {
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
		// isDragging 상태일 때는 리플 효과를 보여주지 않음
		if (this.isDragging) return;

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
}