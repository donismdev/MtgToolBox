import { themes } from './themes.js';

export class Player {
    constructor(id, initialLife, initialRotation, themeIndex) {
        this.id = id;
        this.life = initialLife;
        this.rotation = initialRotation;
        this.themeIndex = themeIndex;
        this.elements = {};
        this.createDOM();
        this.applyTheme();
        this.updateDisplay();
    }

    applyTheme() {
		 const theme = themes[this.themeIndex % themes.length];
		if (theme) {
			// 배경 설정
			// 배경 설정
			this.elements.area.style.background = theme.background;

			// CSS 변수로 버튼 색상 설정
			this.elements.area.style.setProperty('--button-bg-color', theme.buttonBgColor || 'rgba(0,0,0,0.4)');
			this.elements.area.style.setProperty('--button-hover-bg-color', theme.buttonHoverBgColor || 'rgba(0,0,0,0.6)');

			// --- 여기부터 새로 추가된 부분 ---
			const lifeTotalEl = this.elements.lifeTotal;
			
			// 라이프 글자 색상 적용
			lifeTotalEl.style.color = theme.lifeTextColor || '#FFFFFF';

			// 라이프 글자 그림자 적용
			if (theme.lifeTextShadowColor && theme.lifeTextShadowOffset) {
				lifeTotalEl.style.textShadow = `${theme.lifeTextShadowOffset} ${theme.lifeTextShadowColor}`;
			} else {
				lifeTotalEl.style.textShadow = 'none'; // 값이 없으면 그림자 제거
			}
			// --- 여기까지 ---

			this.updateHint();
		}
    }
    
	createDOM() {
		this.elements.area = document.createElement('div');
		this.elements.area.id = `${this.id}-area`;
		this.elements.area.className = `player-area`;

		// --- 1. 헤더 버튼 생성 (아직 부착은 안 함) ---
		const headerContainer = document.createElement('div');
		headerContainer.className = 'player-header-buttons';

		// 이니셔티브 버튼
		this.elements.initiativeButton = document.createElement('button');
		this.elements.initiativeButton.className = 'header-button';
		this.elements.initiativeButton.style.backgroundImage = 'url(./assets/initiative.png)';
		this.elements.initiativeButton.addEventListener('click', (e) => {
			e.stopPropagation();
			window.dataSpace.settings.initiativeIndex = this.getPlayerIndex();
			window.updateAllPlayerIcons();
			window.openInitiativeDungeon(this.getPlayerIndex());
		});

		// 모나크 버튼
		this.elements.monarchButton = document.createElement('button');
		this.elements.monarchButton.className = 'header-button';
		this.elements.monarchButton.style.backgroundImage = 'url(./assets/monarch.png)';
		this.elements.monarchButton.addEventListener('click', (e) => {
			e.stopPropagation();
			window.dataSpace.settings.monarchIndex = this.getPlayerIndex();
			window.updateAllPlayerIcons();
		});

		// 테마 버튼
		this.elements.themeButton = document.createElement('button');
		this.elements.themeButton.className = 'header-button';
		this.elements.themeButton.style.backgroundImage = 'url(./assets/theme.png)';
		this.elements.themeButton.addEventListener('click', (e) => {
			e.stopPropagation();
			this.showThemeSelector();
		});

		headerContainer.appendChild(this.elements.initiativeButton);
		headerContainer.appendChild(this.elements.monarchButton);
		headerContainer.appendChild(this.elements.themeButton);

		// --- 2. 테마 선택창 생성 ---
		this.elements.themeSelector = document.createElement('div');
		this.elements.themeSelector.className = 'theme-selector-overlay';
		this.elements.themeSelector.addEventListener('click', () => this.hideThemeSelector());
		const themeContainer = document.createElement('div');
		themeContainer.className = 'theme-selector-container';
		themeContainer.addEventListener('click', (e) => e.stopPropagation());
		this.elements.themeSelector.appendChild(themeContainer);
		this.elements.area.appendChild(this.elements.themeSelector);

		// --- 3. 회전될 콘텐츠 래퍼 생성 및 부착 ---
		this.elements.contentWrapper = document.createElement('div');
		this.elements.area.appendChild(this.elements.contentWrapper);

		// ★★★ 핵심: 헤더 버튼을 회전될 contentWrapper 안으로 이동 ★★★
		this.elements.contentWrapper.appendChild(headerContainer);

		// --- 4. 나머지 콘텐츠(라이프, 힌트)를 래퍼 안에 생성 ---
		this.elements.lifeTotal = document.createElement('div');
		this.elements.lifeTotal.className = 'life-total user-select-none';
		this.elements.hintInc = document.createElement('div');
		this.elements.hintDec = document.createElement('div');
		this.elements.hintInc.className = 'life-hint increase';
		this.elements.hintDec.className = 'life-hint decrease';

		this.elements.contentWrapper.appendChild(this.elements.hintInc);
		this.elements.contentWrapper.appendChild(this.elements.hintDec);
		this.elements.contentWrapper.appendChild(this.elements.lifeTotal);
		
		// --- 5. 주사위 컨테이너 생성 (회전되지 않음) ---
		this.elements.diceContainer = document.createElement('div');
		this.elements.diceContainer.className = 'dice-container';
		this.elements.area.appendChild(this.elements.diceContainer);
		
		// --- 6. 라이프 변경 이벤트 리스너 ---
		this.elements.area.addEventListener('pointerdown', (event) => {
			if (window.activeUI !== null || event.target.closest('.rotate-button') || event.target.closest('.header-button')) return;

			const rect = this.elements.area.getBoundingClientRect();
			const pointerX = event.clientX - rect.left;
			const pointerY = event.clientY - rect.top;

			let amount = 0;
			const adjustMode = window.localSettings.lifeAdjustDirection;
			const isRight = pointerX > rect.width / 2;
			const isBottom = pointerY > rect.height / 2;

			if (adjustMode === 'horizontal') {
				switch (this.rotation) {
					case 0: amount = isRight ? +1 : -1; break;
					case 180: amount = isRight ? -1 : +1; break;
					case 90: amount = isBottom ? +1 : -1; break;
					case 270: amount = isBottom ? -1 : +1; break;
				}
			} else {
				switch (this.rotation) {
					case 0: amount = isBottom ? -1 : +1; break;
					case 180: amount = isBottom ? +1 : -1; break;
					case 90: amount = isRight ? +1 : -1; break;
					case 270: amount = isRight ? -1 : +1; break;
				}
			}

			this.changeLife(amount);

			const relativeX = event.clientX - rect.left;
			const relativeY = event.clientY - rect.top;
			this.showLifeFeedback(amount, relativeX, relativeY);
			this.showAreaRipple(amount, event);
		});

		// --- 7. 회전 버튼 (비활성화) ---
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

		// --- 1. 스타일(`.active`) 설정 ---
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


		// --- 2. 애니메이션(`.is-animating`) 동기화 ---
		const bothAreActive = isInitiativeActive && isMonarchActive;

		if (bothAreActive) {
			// 두 버튼이 모두 활성화된 경우, 애니메이션을 강제로 재시작하여 동기화
			const restartAnimation = (el) => {
				el.classList.remove('is-animating');
				void el.offsetWidth; // 브라우저에 리플로우를 강제하여 변경사항을 즉시 반영
				el.classList.add('is-animating');
			};
			restartAnimation(initiativeButton);
			restartAnimation(monarchButton);

		} else {
			// 하나만 활성화된 경우, 개별적으로 애니메이션 클래스를 켜고 끔
			initiativeButton.classList.toggle('is-animating', isInitiativeActive);
			monarchButton.classList.toggle('is-animating', isMonarchActive);
		}
	}

    showThemeSelector() {
        const themeContainer = this.elements.themeSelector.querySelector('.theme-selector-container');
        themeContainer.innerHTML = ''; // Clear old swatches

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

    changeLife(amount) {
        this.life += amount;
        this.updateDisplay();
    }

    updateDisplay() { this.elements.lifeTotal.textContent = this.life; }

    setLife(newLife) {
        this.life = newLife;
        this.updateDisplay();
    }

	playIntroAnimation() {
		const el = this.elements.lifeTotal;
		el.classList.remove('animate-intro');   // 재생 위해 제거
		void el.offsetWidth;                    // 강제 리플로우
		el.classList.add('animate-intro');      // 재추가로 애니메이션 발동
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

	showLifeFeedback(amount, x, y) {
		const feedback = document.createElement('div');
		feedback.className = 'life-feedback';
		feedback.textContent = (amount > 0) ? `+${amount}` : `${amount}`;

		// 클릭 위치 기준 상대 좌표 배치
		feedback.style.left = `${x}px`;
		feedback.style.top = `${y}px`;

		this.elements.area.appendChild(feedback);

		// 제거 타이머
		setTimeout(() => {
			feedback.remove();
		}, 600);
	}

	showAreaRipple(amount, event) {
	    const ripple = document.createElement('div');
		ripple.className = 'life-ripple';
		
		// 현재 플레이어의 테마를 가져옵니다.
		const theme = themes[this.themeIndex % themes.length];

		if (amount > 0) {
			// life가 증가하면 ripplePlusColor를, 없으면 기본 파란색을 사용합니다.
			ripple.style.backgroundColor = theme.ripplePlusColor || 'rgba(0, 255, 255, 0.4)';
		} else {
			// life가 감소하면 rippleMinusColor를, 없으면 기본 빨간색을 사용합니다.
			// 이전에 사용하던 .minus 클래스는 이제 색상 지정에 사용되지 않습니다.
			ripple.style.backgroundColor = theme.rippleMinusColor || 'rgba(255, 80, 80, 0.4)';
		}

		const rect = this.elements.area.getBoundingClientRect();
		const x = (event?.clientX || rect.width / 2) - rect.left;
		const y = (event?.clientY || rect.height / 2) - rect.top;

		ripple.style.left = `${x - 50}px`; // 반지름 offset
		ripple.style.top = `${y - 50}px`;

		this.elements.area.appendChild(ripple);

		setTimeout(() => ripple.remove(), 600);
	}

	updateHint() {
		const adjustMode = window.localSettings.lifeAdjustDirection;
		const spacing = '7rem'; // 중앙 기준으로 얼마나 떨어질지

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
			// 좌우 배치 (+는 오른쪽, -는 왼쪽)
			inc.style.top = '50%';
			inc.style.left = `calc(50% + ${spacing})`;
			inc.style.transform = 'translate(-50%, -50%)';

			dec.style.top = '50%';
			dec.style.left = `calc(50% - ${spacing})`;
			dec.style.transform = 'translate(-50%, -50%)';
		} else {
			// vertical 모드: 무조건 상하 배치
			// (+는 위쪽, -는 아래쪽)
			inc.style.top = `calc(50% - ${spacing})`;
			inc.style.left = '50%';
			inc.style.transform = 'translate(-50%, -50%)';

			dec.style.top = `calc(50% + ${spacing})`;
			dec.style.left = '50%';
			dec.style.transform = 'translate(-50%, -50%)';
		}
	}

}
