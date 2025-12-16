window.i18n.initPromise.then(() => {
        const dealBtn = document.getElementById('dealBtn');
        const cardsEl = document.getElementById('cards');
        const resultEl = document.getElementById('result');

        const suits = ['♠', '♥', '♦', '♣'];
        const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

        function createDeck() {
            return suits.flatMap(suit => ranks.map(rank => ({ suit, rank })));
        }

        function evaluateHand(hand) {
            const rankCounts = {};
            const suitCounts = {};
            const rankOrder = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

            hand.forEach(card => {
                rankCounts[card.rank] = (rankCounts[card.rank] || 0) + 1;
                suitCounts[card.suit] = (suitCounts[card.suit] || 0) + 1;
            });

            const counts = Object.values(rankCounts).sort((a, b) => b - a);
            const isFlush = Object.values(suitCounts).some(count => count === 5);
            
            const sortedRankIndices = [...new Set(hand.map(card => rankOrder.indexOf(card.rank)))].sort((a, b) => a - b);
            
            const isAceLowStraight = JSON.stringify(sortedRankIndices) === JSON.stringify([0, 1, 2, 3, 12]);
            
            let isStraight = false;
            if (isAceLowStraight) {
                isStraight = true;
            } else if (sortedRankIndices.length === 5 && sortedRankIndices[4] - sortedRankIndices[0] === 4) {
                isStraight = true;
            }

            const isRoyal = isFlush && isStraight && sortedRankIndices[4] === 12;

            if (isRoyal) return window.i18n.t("royalStraightFlush");
            if (isFlush && isStraight) return window.i18n.t("straightFlush");
            if (counts[0] === 4) return window.i18n.t("fourOfAKind");
            if (counts[0] === 3 && counts[1] === 2) return window.i18n.t("fullHouse");
            if (isFlush) return window.i18n.t("flush");
            if (isStraight) return window.i18n.t("straight");
            if (counts[0] === 3) return window.i18n.t("threeOfAKind");
            if (counts[0] === 2 && counts[1] === 2) return window.i18n.t("twoPair");
            if (counts[0] === 2) return window.i18n.t("onePair");
            
            return window.i18n.t("highCard");
        }

        function getResultMessage(handResult) {
            const messages = {
                [window.i18n.t("royalStraightFlush")]: window.i18n.t("royalStraightFlushMsg"),
                [window.i18n.t("straightFlush")]: window.i18n.t("straightFlushMsg"),
                [window.i18n.t("fourOfAKind")]: window.i18n.t("fourOfAKindMsg"),
                [window.i18n.t("fullHouse")]: window.i18n.t("fullHouseMsg"),
                [window.i18n.t("flush")]: window.i18n.t("flushMsg"),
                [window.i18n.t("straight")]: window.i18n.t("straightMsg"),
                [window.i18n.t("threeOfAKind")]: window.i18n.t("threeOfAKindMsg"),
                [window.i18n.t("twoPair")]: window.i18n.t("twoPairMsg"),
                [window.i18n.t("onePair")]: window.i18n.t("onePairMsg"),
                [window.i18n.t("highCard")]: window.i18n.t("highCardMsg")
            };
            return messages[handResult];
        }

        dealBtn.addEventListener('click', () => {
            dealBtn.disabled = true;
            cardsEl.innerHTML = '';
            resultEl.classList.remove('opacity-100');
            resultEl.classList.add('opacity-0');

            const deck = createDeck();
            deck.sort(() => Math.random() - 0.5);

            const hand = deck.slice(0, 5);

            hand.forEach((card, index) => {
                const cardEl = document.createElement('div');
                const suitColor = (card.suit === '♠' || card.suit === '♣') ? 'text-gray-800' : 'text-red-600';
                cardEl.className = `card w-24 h-36 m-2 rounded-lg relative transition-all duration-700 ease-in-out opacity-0 transform translate-y-24 ${suitColor}`;
                
                const front = document.createElement('div');
                front.className = 'front w-full h-full absolute rounded-lg shadow-md flex justify-center items-center text-5xl font-bold bg-white dark:bg-gray-200';
                front.style.backfaceVisibility = 'hidden';
                front.textContent = `${card.rank}${card.suit}`;
                
                const back = document.createElement('div');
                back.className = 'back w-full h-full absolute rounded-lg shadow-md';
                back.style.backfaceVisibility = 'hidden';
                back.style.transform = 'rotateY(180deg)';
                back.style.backgroundColor = '#5cb85c';
                back.style.backgroundImage = 'linear-gradient(45deg, #4cae4c 25%, transparent 25%, transparent 75%, #4cae4c 75%), linear-gradient(45deg, #4cae4c 25%, transparent 25%, transparent 75%, #4cae4c 75%)';
                back.style.backgroundSize = '20px 20px';
                back.style.backgroundPosition = '0 0, 10px 10px';

                cardEl.appendChild(front);
                cardEl.appendChild(back);
                cardsEl.appendChild(cardEl);

                setTimeout(() => {
                    cardEl.classList.add('opacity-100', 'translate-y-0', 'deal');
                    setTimeout(() => cardEl.classList.add('is-flipped'), 200);
                }, 150 * (index + 1));
            });

            setTimeout(() => {
                const handRank = evaluateHand(hand);
                const resultMessage = getResultMessage(handRank);
                resultEl.innerHTML = `<span id="result-rank" class="block text-yellow-400 mb-1">${handRank}</span><span id="result-message" class="text-gray-300 text-xl">${resultMessage}</span>`;
                resultEl.classList.add('opacity-100');
                dealBtn.disabled = false;
            }, 1500);
        });
});