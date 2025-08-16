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
    window.overlay.style.display = 'block';

    const globalDiceContainer = document.getElementById('global-dice-container');
    globalDiceContainer.innerHTML = '';

    // 유틸
    const rand1to = (n) => Math.floor(Math.random() * n) + 1;
    const sum = (arr) => arr.reduce((a, b) => a + b, 0);

    // 플레이어별 결과 생성
    const resultsByPlayer = window.players.map(() =>
        (predefinedResults && Array.isArray(predefinedResults))
            ? predefinedResults.slice()
            : Array.from({ length: count }, () => rand1to(sides))
    );

    // ✅ 총합이 플레이어 간 서로 달라지도록 보정 (predefinedResults가 없을 때만)
    if (!predefinedResults && sides > 1 && count > 0) {
        const usedSums = new Set();
        for (let i = 0; i < resultsByPlayer.length; i++) {
            const row = resultsByPlayer[i];
            let s = sum(row);

            // 같은 합이면, 행의 임의 주사위를 다른 값으로 바꿔가며 합을 틀리게 만든다
            let guard = 0;
            while (usedSums.has(s) && guard < 200) {
                const j = (row.length - 1) - (guard % row.length); // 뒤에서부터 돌며 조정
                const cur = row[j];
                let next = cur;
                // 현재 값과 다른 랜덤 값으로 교체
                for (let t = 0; t < 20 && next === cur; t++) next = rand1to(sides);
                if (next === cur) break; // sides==1 같은 불가능 케이스 안전 탈출
                row[j] = next;
                s = sum(row);
                guard++;
            }
            usedSums.add(s);
        }
    }

    // 각 플레이어에 대한 행 생성 + 배경 흐림
    const rows = window.players.map(p => {
        const row = document.createElement('div');
        row.className = `dice-row ${p.elements.area.className}`;
        globalDiceContainer.appendChild(row);
        p.elements.area.classList.add('dice-rolling');
        return row;
    });

    // 행별로 주사위 표시 및 합계
    rows.forEach((row, playerIdx) => {
        const rowResults = resultsByPlayer[playerIdx];
        const rowSum = rowResults.reduce((a, b) => a + b, 0);

        rowResults.forEach((result, i) => {
            const dice = document.createElement('div');
            dice.className = 'dice';

            // 굴러가는 효과
            const tumbleInterval = setInterval(() => {
                dice.textContent = rand1to(sides);
            }, 70);

            // 멈추고 결과 확정
            setTimeout(() => {
                clearInterval(tumbleInterval);
                dice.textContent = result;
                dice.classList.add('landed');
            }, 800 + i * 200);

            row.appendChild(dice);
        });

        // 마지막 주사위가 멈춘 뒤 합계 표시
        const showSumAt = 800 + (rowResults.length - 1) * 200 + 200;
        setTimeout(() => {
            const sumEl = document.createElement('div');
            sumEl.className = 'dice-sum-display';
            sumEl.textContent = rowSum;
            row.appendChild(sumEl);
            requestAnimationFrame(() => sumEl.classList.add('show'));
        }, showSumAt);
    });
}