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
        this.elements.contentWrapper.appendChild(this.elements.lifeTotal);
        this.elements.diceContainer = document.createElement('div');
        this.elements.diceContainer.className = 'dice-container';
        this.elements.area.appendChild(this.elements.diceContainer);
        this.elements.area.addEventListener('click', (event) => {
            if (window.activeUI !== null || event.target.closest('.rotate-button')) return;
            const rect = this.elements.area.getBoundingClientRect();
            const clickX = event.clientX - rect.left;
            const clickY = event.clientY - rect.top;
            let amount = 0;
            switch (this.rotation) {
                case 0: amount = (clickY > rect.height / 2) ? -1 : 1; break;
                case 180: amount = (clickY > rect.height / 2) ? 1 : -1; break;
                case 90: amount = (clickX > rect.width / 2) ? 1 : -1; break;
                case 270: amount = (clickX > rect.width / 2) ? -1 : 1; break;
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
    }
}