import { hideAllOverlays } from './ui.js';

export function rollDiceVisual(count, sides) {
    hideAllOverlays();
    window.centerButtons.style.display = 'none';
    window.overlay.style.display = 'block';
    window.activeUI = 'diceRolling';

    window.players.forEach(player => {
        player.elements.area.classList.add('dice-rolling');
        const diceContainer = player.elements.diceContainer;
        diceContainer.style.display = 'flex';
        diceContainer.innerHTML = '<div class="individual-dice-wrapper"></div><div class="dice-sum-display"></div>';
        const wrapper = diceContainer.querySelector('.individual-dice-wrapper');
        const sumDisplay = diceContainer.querySelector('.dice-sum-display');

        const promises = Array.from({ length: count }, () => new Promise(resolve => {
            const die = document.createElement('div');
            die.className = 'dice rolling';
            wrapper.appendChild(die);
            let rollCount = 0;
            const animate = () => {
                const val = Math.floor(Math.random() * sides) + 1;
                die.textContent = val;
                if (++rollCount > 20) {
                    die.classList.remove('rolling');
                    die.classList.add('finalized');
                    resolve(val);
                } else {
                    setTimeout(animate, 50);
                }
            };
            animate();
        }));

        Promise.all(promises).then(results => {
            if (results.length > 1) {
                sumDisplay.textContent = results.reduce((a, b) => a + b, 0);
                sumDisplay.classList.add('show');
            }
        });
    });

    window.overlay.onclick = () => {
        window.players.forEach(p => {
            p.elements.area.classList.remove('dice-rolling');
            p.elements.diceContainer.style.display = 'none';
        });
        hideAllOverlays();
        window.overlay.onclick = hideAllOverlays;
    };
}