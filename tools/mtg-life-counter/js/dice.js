import { hideAllOverlays } from './ui.js';

// 플레이어 한 명의 주사위를 굴리고 애니메이션을 처리하는 비동기 함수
async function animateAndRollForPlayer(player, count, sides) {
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

    const results = await Promise.all(promises);
    const sum = results.reduce((a, b) => a + b, 0);

    return { sum, results, sumDisplay };
}

export function rollDiceVisual(count, sides) {
    hideAllOverlays();
    window.centerButtons.style.display = 'none';
    window.overlay.style.display = 'block';
    window.activeUI = 'diceRolling';

    (async () => {
        const resolvedSums = new Set();
        
        const playerPromises = window.players.map(async player => {
            player.elements.area.classList.add('dice-rolling');
            
            let result;
            let isUnique = false;

            while (!isUnique) {
                result = await animateAndRollForPlayer(player, count, sides);
                if (!resolvedSums.has(result.sum)) {
                    isUnique = true;
                    resolvedSums.add(result.sum);
                }
            }

            if (result.results.length > 1) {
                result.sumDisplay.textContent = result.sum;
                result.sumDisplay.classList.add('show');
            }
        });
        
        await Promise.all(playerPromises);
    })();

    // --- 수정된 부분 ---
    // 클릭 핸들러를 안정적인 형태로 수정합니다.
    window.overlay.onclick = () => {
        // 1. 플레이어 관련 UI를 항상 정리하고
        window.players.forEach(p => {
            p.elements.area.classList.remove('dice-rolling');
            p.elements.diceContainer.style.display = 'none';
        });
        // 2. 오버레이를 닫습니다.
        hideAllOverlays();
        // 3. 더 이상 불필요한 핸들러 재할당 코드는 삭제합니다.
    };
}