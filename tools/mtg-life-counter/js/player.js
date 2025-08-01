export class Player {
    constructor(id, initialLife, initialRotation) {
        this.id = id;
        this.life = initialLife;
        this.rotation = initialRotation;
        this.elements = {};
        this.createDOM();
        this.updateDisplay();
    }
    
    createDOM() {
        this.elements.area = document.createElement('div');
        this.elements.area.id = `${this.id}-area`;
        this.elements.area.className = `player-area`;
        this.elements.contentWrapper = document.createElement('div');
        this.elements.area.appendChild(this.elements.contentWrapper);
        this.elements.lifeTotal = document.createElement('div');
        this.elements.lifeTotal.className = 'life-total';
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
        this.elements.area.addEventListener('pointerdown', (event) => {
			if (window.activeUI !== null || event.target.closest('.rotate-button')) return;

			const rect = this.elements.area.getBoundingClientRect();
			const pointerX = event.clientX - rect.left;
			const pointerY = event.clientY - rect.top;

			let amount = 0;
			const adjustMode = window.localSettings.lifeAdjustDirection;

			// 중심 기준
			const isRight = pointerX > rect.width / 2;
			const isBottom = pointerY > rect.height / 2;

			if (adjustMode === 'horizontal') {
				// 좌우 기준 (+ = 오른쪽)
				switch (this.rotation) {
					case 0:
						amount = isRight ? +1 : -1;
						break;
					case 180:
						amount = isRight ? -1 : +1;
						break;
					case 90:
						amount = isBottom ? +1 : -1;
						break;
					case 270:
						amount = isBottom ? -1 : +1;
						break;
				}
			} else {
				// vertical 기준 (+ = 위쪽)
				switch (this.rotation) {
					case 0:
						amount = isBottom ? -1 : +1;
						break;
					case 180:
						amount = isBottom ? +1 : -1;
						break;
					case 90:
						amount = isRight ? +1 : -1; // ← 반대로 보정
						break;
					case 270:
						amount = isRight ? -1 : +1; // ← 반대로 보정
						break;
				}
			}

			this.changeLife(amount);
		});

        const rotateButton = document.createElement('button');
        rotateButton.className = 'rotate-button';
        rotateButton.innerHTML = '&#x21bb;';
        rotateButton.addEventListener('click', (e) => {
            e.stopPropagation();
            this.rotateArea();
        });
        this.elements.area.appendChild(rotateButton);
        this.updateRotationClass();
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

	updateHint() {
		const adjustMode = window.localSettings.lifeAdjustDirection;
		const spacing = '7rem'; // 중앙 기준으로 얼마나 떨어질지

		const inc = this.elements.hintInc;
		const dec = this.elements.hintDec;

		inc.textContent = '➕';
		dec.textContent = '➖';

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