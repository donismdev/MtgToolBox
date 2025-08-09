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

export function rollDiceVisual(count, sides, predefinedResults = null) {

	hideAllOverlays();

    window.activeUI = 'dice';
    // 암막(overlay)을 먼저 표시합니다.
    window.overlay.style.display = 'block';

    const globalDiceContainer = document.getElementById('global-dice-container');
    globalDiceContainer.innerHTML = ''; // 이전 주사위 초기화

    let totalSum = 0;
    const results = predefinedResults || Array.from({ length: count }, () => Math.floor(Math.random() * sides) + 1);

    // 각 플레이어의 위치에 맞춰 주사위가 표시될 '행'을 만듭니다.
    window.players.forEach(p => {
        const diceRow = document.createElement('div');
        diceRow.className = `dice-row ${p.elements.area.className}`; // 플레이어 영역의 클래스를 복사해 위치를 잡습니다.
        globalDiceContainer.appendChild(diceRow);
        
        // 배경을 흐릿하게 만듭니다.
        p.elements.area.classList.add('dice-rolling');
    });

    const allDiceElements = [];

    // 주사위 생성
    results.forEach((result, i) => {
        totalSum += result;
        const diceRows = document.querySelectorAll('.dice-row');
        diceRows.forEach(row => {
            const dice = document.createElement('div');
            dice.className = 'dice';
            // tumbling 애니메이션 시작
            const tumbleInterval = setInterval(() => {
                dice.textContent = Math.floor(Math.random() * sides) + 1;
            }, 70);

            // 0.8초 후에 멈추고 결과를 표시
            setTimeout(() => {
                clearInterval(tumbleInterval);
                dice.textContent = result;
                dice.classList.add('landed'); // 착지 애니메이션
            }, 800 + i * 200); // 주사위마다 약간의 시간차

            row.appendChild(dice);
            allDiceElements.push(dice);
        });
    });

    // 모든 주사위가 멈춘 후 합계 표시
    setTimeout(() => {
        const sumDisplay = document.createElement('div');
        sumDisplay.className = 'dice-sum-display';
        sumDisplay.textContent = totalSum;

        const diceRows = document.querySelectorAll('.dice-row');
        diceRows.forEach(row => {
            const sumClone = sumDisplay.cloneNode(true);
            row.appendChild(sumClone);
            requestAnimationFrame(() => sumClone.classList.add('show'));
        });
    }, 1000 + count * 200);
}