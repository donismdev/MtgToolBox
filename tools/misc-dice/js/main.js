
document.addEventListener('DOMContentLoaded', () => {
    const diceContainer = document.getElementById('dice-container');
    const resultArea = document.getElementById('resultArea');
    const rollButton = document.getElementById('rollButton');
    const typeButtons = document.querySelectorAll('.dice-btn, #coinBtn');
    const countButtons = document.querySelectorAll('.count-btn');
    const countSelectorSection = document.getElementById('count-selector-section');

    let currentMode = 'dice';
    let currentSides = 6;
    let currentCount = 1;
    let isRolling = false;

    // Creates a 6-sided cube visually
    function createDice() {
        const scene = document.createElement('div');
        scene.className = 'scene';
        const dice = document.createElement('div');
        dice.className = 'dice';
        for (let i = 1; i <= 6; i++) {
            const face = document.createElement('div');
            face.className = `face face-${i}`;
            dice.appendChild(face);
        }
        scene.appendChild(dice);
        return scene;
    }

    function createCoin() {
        const scene = document.createElement('div');
        scene.className = 'scene';
        const coin = document.createElement('div');
        coin.className = 'coin';
        const heads = document.createElement('div');
        heads.className = 'coin-face coin-heads';
        heads.textContent = '앞면';
        const tails = document.createElement('div');
        tails.className = 'coin-face coin-tails';
        tails.textContent = '뒷면';
        coin.appendChild(heads);
        coin.appendChild(tails);
        scene.appendChild(coin);
        return scene;
    }

    function updateDisplay() {
        diceContainer.innerHTML = '';
        for (let i = 0; i < currentCount; i++) {
            if (currentMode === 'dice') {
                const diceScene = createDice();
                // Set initial placeholder numbers
                const faces = diceScene.querySelectorAll('.face');
                faces.forEach(face => {
                    face.textContent = Math.floor(Math.random() * currentSides) + 1;
                });
                diceContainer.appendChild(diceScene);
            } else {
                diceContainer.appendChild(createCoin());
            }
        }
    }

    function setMode(mode, sides = 6) {
        currentMode = mode;
        typeButtons.forEach(b => b.classList.remove('active'));
        
        if (mode === 'dice') {
            currentSides = sides;
            document.querySelector(`.dice-btn[data-sides='${sides}']`).classList.add('active');
            rollButton.textContent = `Roll D${sides}`;
            countSelectorSection.style.display = 'block';
        } else {
            document.getElementById('coinBtn').classList.add('active');
            rollButton.textContent = 'Flip Coin';
            countSelectorSection.style.display = 'block';
        }
        updateDisplay();
    }

    function setCount(count) {
        currentCount = count;
        countButtons.forEach(b => b.classList.remove('active'));
        document.querySelector(`.count-btn[data-count='${count}']`).classList.add('active');
        updateDisplay();
    }

    function roll() {
        if (isRolling) return;
        isRolling = true;
        rollButton.disabled = true;
        resultArea.innerHTML = '';
        resultArea.classList.remove('show-result');

        const items = diceContainer.querySelectorAll('.scene');
        let results = [];
        let totalResult = 0;

        items.forEach(scene => {
            const item = scene.querySelector('.dice, .coin');
            // Reset transform to allow re-rolling
            item.style.transform = 'rotateX(0deg) rotateY(0deg) rotateZ(0deg)';

            const randomX = (Math.floor(Math.random() * 6) + 4) * 360;
            const randomY = (Math.floor(Math.random() * 6) + 4) * 360;

            if (currentMode === 'dice') {
                const result = Math.floor(Math.random() * currentSides) + 1;
                results.push(result);
                totalResult += result;

                // Set the result to the front face and randomize others
                const faces = item.querySelectorAll('.face');
                faces.forEach(face => {
                    if (face.classList.contains('face-1')) {
                        face.textContent = result;
                    } else {
                        face.textContent = Math.floor(Math.random() * currentSides) + 1;
                    }
                });
                
                // Final rotation makes face-1 point up
                const finalRotation = 'rotateX(0deg) rotateY(0deg)';
                item.style.transform = `rotateX(${randomX}deg) rotateY(${randomY}deg) ${finalRotation}`;

            } else { // Coin
                const result = Math.random() < 0.5;
                results.push(result ? '앞면' : '뒷면');
                const finalRotation = result ? 0 : -180;
                item.style.transform = `rotateX(${randomX + finalRotation}deg) rotateY(${randomY}deg)`;
            }
        });

        setTimeout(() => {
            if (currentMode === 'dice') {
                let resultHTML = `<div>${results.join(', ')}</div>`;
                if (results.length > 1) {
                    resultHTML += `<div>Total: ${totalResult}</div>`;
                }
                resultArea.innerHTML = resultHTML;
            } else {
                 resultArea.innerHTML = `<div>${results.join(', ')}</div>`;
            }
            resultArea.classList.add('show-result');
            isRolling = false;
            rollButton.disabled = false;
        }, 2100); // Increased timeout for animation
    }

    typeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            if (btn.id === 'coinBtn') {
                setMode('coin');
            } else {
                const sides = parseInt(btn.dataset.sides);
                setMode('dice', sides);
            }
        });
    });

    countButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const count = parseInt(btn.dataset.count);
            setCount(count);
        });
    });

    rollButton.addEventListener('click', roll);

    // Initial setup
    setMode('dice', 6);
    setCount(1);
});
