import { themes } from './themes.js';
import { renderLifeLogChart } from './logChart.js';
import { initiativeManager } from './initiative.js';

export class Player {
	constructor(id, initialLife, initialRotation, themeIndex) {
		this.id = id;
		this.life = initialLife;
		this.rotation = initialRotation;
		this.themeIndex = themeIndex;
		this.elements = {};
		this.lifeChangeTimeout = null;
		this.lifeChangeAmount = 0;
		this.lifeChangePositions = [];
		this.lifeLog = [];
		this.createDOM();
		this.applyTheme();
		this.updateDisplay();
	}

	// ... (applyTheme, createDOM, getPlayerIndex, updateIcons, showThemeSelector, hideThemeSelector 등 다른 함수는 이전과 동일합니다) ...
	
	applyTheme() {
		const theme = themes[this.themeIndex % themes.length];
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
		this.elements.area.className = `player-area`;

		const headerContainer = document.createElement('div');
		headerContainer.className = 'player-header-buttons';

		this.elements.initiativeButton = document.createElement('button');
		this.elements.initiativeButton.className = 'header-button';
		this.elements.initiativeButton.style.backgroundImage = 'url(./assets/initiative.png)';
		this.elements.initiativeButton.addEventListener('click', (e) => {
			e.stopPropagation();
			const playerIndex = this.getPlayerIndex();
			window.dataSpace.settings.initiativeIndex = playerIndex;
			window.updateAllPlayerIcons();
			initiativeManager.showDungeon(this.id); 
		});

		this.elements.monarchButton = document.createElement('button');
		this.elements.monarchButton.className = 'header-button';
		this.elements.monarchButton.style.backgroundImage = 'url(./assets/monarch.png)';
		this.elements.monarchButton.addEventListener('click', (e) => {
			e.stopPropagation();
			const playerIndex = this.getPlayerIndex();
			if (window.dataSpace.settings.monarchIndex === playerIndex) {
				window.dataSpace.settings.monarchIndex = -1;
			} else {
				window.dataSpace.settings.monarchIndex = playerIndex;
			}
			window.updateAllPlayerIcons();
		});

		this.elements.logButton = document.createElement('button');
		this.elements.logButton.className = 'header-button';
		this.elements.logButton.style.backgroundImage = 'url(./assets/lifelog.png)';
		this.elements.logButton.style.backgroundSize = '90%';
		this.elements.logButton.addEventListener('click', (e) => {
			e.stopPropagation();
			this.showLifeLog();
		});

		this.elements.themeButton = document.createElement('button');
		this.elements.themeButton.className = 'header-button';
		this.elements.themeButton.style.backgroundImage = 'url(./assets/theme.png)';
		this.elements.themeButton.addEventListener('click', (e) => {
			e.stopPropagation();
			this.showThemeSelector();
		});

		headerContainer.appendChild(this.elements.initiativeButton);
		headerContainer.appendChild(this.elements.monarchButton);
		headerContainer.appendChild(this.elements.logButton);
		headerContainer.appendChild(this.elements.themeButton);

		this.elements.themeSelector = document.createElement('div');
		this.elements.themeSelector.className = 'theme-selector-overlay';
		this.elements.themeSelector.addEventListener('pointerdown', e => e.stopPropagation());
		this.elements.themeSelector.addEventListener('click', (e) => {
			if (e.target === this.elements.themeSelector) {
				this.hideThemeSelector();
			}
		});
		const themeContainer = document.createElement('div');
		themeContainer.className = 'theme-selector-container';
		themeContainer.addEventListener('click', (e) => e.stopPropagation());
		this.elements.themeSelector.appendChild(themeContainer);
		this.elements.area.appendChild(this.elements.themeSelector);

		this.elements.contentWrapper = document.createElement('div');
		this.elements.area.appendChild(this.elements.contentWrapper);
		this.elements.contentWrapper.appendChild(headerContainer);

		this.elements.lifeTotal = document.createElement('div');
		this.elements.lifeTotal.className = 'life-total user-select-none';
		this.elements.hintInc = document.createElement('div');
		this.elements.hintDec = document.createElement('div');
		this.elements.hintInc.className = 'life-hint increase';
		this.elements.hintDec.className = 'life-hint decrease';

		this.elements.contentWrapper.appendChild(this.elements.hintInc);
		this.elements.contentWrapper.appendChild(this.elements.hintDec);
		this.elements.contentWrapper.appendChild(this.elements.lifeTotal);
		
		this.elements.diceContainer = document.createElement('div');
		this.elements.diceContainer.className = 'dice-container';
		this.elements.area.appendChild(this.elements.diceContainer);

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
			// 2. 기존 라이프(Life) 변경 로직
			// ==================================================

			// 버튼 등 다른 UI 요소가 활성화 상태이거나, 특정 버튼을 눌렀을 때는 작동하지 않도록 함
			if (window.activeUI !== null || event.target.closest('.rotate-button') || event.target.closest('.header-button')) {
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

			// 탭한 위치에 피드백 효과를 주고 라이프를 변경
			const relativeX = event.clientX - rect.left;
			const relativeY = event.clientY - rect.top;

			this.showLifeFeedback(amount, { x: relativeX, y: relativeY }, false);
			this.changeLife(amount, { x: relativeX, y: relativeY });
			this.showAreaRipple(amount, event);
		});

		let lastTouchEnd = 0;
		document.addEventListener('touchend', function (event) {
			const now = new Date().getTime();
			if (now - lastTouchEnd <= 300) {
				event.preventDefault();
			}
			lastTouchEnd = now;
		}, false);

		/*
		const rotateButton = document.createElement('button');
		rotateButton.className = 'rotate-button';
		rotateButton.innerHTML = '&#x21bb;';
		rotateButton.addEventListener('click', (e) => {
			e.stopPropagation();
			this.rotateArea();
		});
		this.elements.area.appendChild(rotateButton);
		*/

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

		const hideLog = () => this.elements.logOverlay.style.display = 'none';
		this.elements.logOverlay.addEventListener('pointerdown', e => e.stopPropagation());
		this.elements.logOverlay.addEventListener('click', e => {
			if (e.target === this.elements.logOverlay) hideLog();
		});
		logModal.addEventListener('pointerdown', e => e.stopPropagation());
		closeModalBtn.addEventListener('click', hideLog);
		this.updateRotationClass();
	}

	getPlayerIndex() {
		return window.players.findIndex(p => p.id === this.id);
	}

	updateIcons() {
		const playerIndex = this.getPlayerIndex();
		const theme = themes[this.themeIndex % themes.length];
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
		setHighlight(initiativeButton, isInitiativeActive);
		setHighlight(monarchButton, isMonarchActive);
		const bothAreActive = isInitiativeActive && isMonarchActive;
		if (bothAreActive) {
			const restartAnimation = (el) => {
				el.classList.remove('is-animating');
				void el.offsetWidth;
				el.classList.add('is-animating');
			};
			restartAnimation(initiativeButton);
			restartAnimation(monarchButton);
		} else {
			initiativeButton.classList.toggle('is-animating', isInitiativeActive);
			monarchButton.classList.toggle('is-animating', isMonarchActive);
		}
	}

	showThemeSelector() {
		const themeContainer = this.elements.themeSelector.querySelector('.theme-selector-container');
		themeContainer.innerHTML = '';
		const usedThemeIndexes = window.players
			.filter(p => p.id !== this.id)
			.map(p => p.themeIndex);
		themes.forEach((theme, index) => {
			const swatch = document.createElement('div');
			swatch.className = 'theme-swatch';
			swatch.style.background = theme.background;
			if (usedThemeIndexes.includes(index)) {
				swatch.classList.add('disabled');
			} else {
				swatch.addEventListener('click', () => {
					this.themeIndex = index;
					this.applyTheme();
					window.saveLifeTotals();
					this.hideThemeSelector();
				});
			}
			themeContainer.appendChild(swatch);
		});
		this.elements.themeSelector.style.display = 'flex';
	}

	hideThemeSelector() {
		this.elements.themeSelector.style.display = 'none';
	}

	changeLife(amount, position) {
		clearTimeout(this.lifeChangeTimeout);
		this.lifeChangeAmount += amount;
		if (position) {
			this.lifeChangePositions.push(position);
		}
		this.life += amount;
		this.updateDisplay();

		this.lifeChangeTimeout = setTimeout(() => {
			if (this.lifeChangeAmount !== 0) {
				this.logEvent('lifeChange', {
					amount: this.lifeChangeAmount,
					lifeAfter: this.life
				});
				this.showLifeFeedback(this.lifeChangeAmount);
			}
			this.lifeChangeAmount = 0;
			this.lifeChangePositions = [];
		}, 600);
	}

	updateDisplay() { this.elements.lifeTotal.textContent = this.life; }

	setLife(newLife, isReset = false) {
		this.life = newLife;
		this.updateDisplay();
		if (isReset) {
			this.lifeLog = [];
			this.logEvent('reset', { lifeAfter: this.life });
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
		this.elements.contentWrapper.className = `player-content-wrapper rotation-${this.rotation}`;
		this.elements.diceContainer.classList.remove('pushed-up', 'pushed-down');
		if (this.rotation === 0) this.elements.diceContainer.classList.add('pushed-up');
		if (this.rotation === 180) this.elements.diceContainer.classList.add('pushed-down');
		this.updateHint();
	}

	/**
	 * ## 핵심 수정 ##
	 * 라이프 증감 피드백을 표시하는 함수입니다.
	 * CSS 변수(--feedback-rotation)를 사용해 애니메이션이 플레이어의 회전 각도를 유지하도록 합니다.
	 */
	showLifeFeedback(amount, position = { x: '50%', y: '50%' }, isCumulative = true) {
		const feedback = document.createElement('div');
		feedback.className = 'life-feedback';
		feedback.textContent = (amount > 0) ? `+${amount}` : `${amount}`;
	
		// CSS 애니메이션이 사용할 회전 각도를 변수로 전달합니다.
		feedback.style.setProperty('--feedback-rotation', `${this.rotation}deg`);
	
		if (isCumulative) {
			// 합산 피드백 (중앙에 표시)
			const theme = themes[this.themeIndex % themes.length];
			if (theme) {
				feedback.style.color = amount > 0 ? theme.plusColor : theme.minusColor;
			}
			feedback.style.fontSize = '4rem';
			feedback.style.left = `50%`;
			feedback.style.top = `50%`;
			// 실제 transform은 CSS 애니메이션(@keyframes)에서 처리합니다.
		} else {
			// 즉시 피드백 (클릭 위치에 표시)
			feedback.style.color = '#FFFFFF';
			feedback.style.left = `${position.x}px`;
			feedback.style.top = `${position.y}px`;
			// // 애니메이션을 사용하지 않으므로 transform을 직접 설정합니다.
			// feedback.style.transform = `translate(-50%, -50%) rotate(${this.rotation}deg)`;
		}
	
		this.elements.area.appendChild(feedback);
		setTimeout(() => {
			feedback.remove();
		}, 600);
	}

	showAreaRipple(amount, event) {
		const ripple = document.createElement('div');
		ripple.className = 'life-ripple';
		const theme = themes[this.themeIndex % themes.length];
		if (amount > 0) {
			ripple.style.backgroundColor = theme.ripplePlusColor || 'rgba(0, 255, 255, 0.4)';
		} else {
			ripple.style.backgroundColor = theme.rippleMinusColor || 'rgba(255, 80, 80, 0.4)';
		}
		const rect = this.elements.area.getBoundingClientRect();
		const x = (event?.clientX || rect.width / 2) - rect.left;
		const y = (event?.clientY || rect.height / 2) - rect.top;
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
		const theme = themes[this.themeIndex % themes.length];
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
		const theme = themes[this.themeIndex % themes.length];
		renderLifeLogChart(this.elements.logCanvas, this.lifeLog, theme);
	}
}
