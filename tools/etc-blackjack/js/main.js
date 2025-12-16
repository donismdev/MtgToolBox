window.i18n.initPromise.then(() => {
        const suits = ['♠', '♥', '♦', '♣'];
        const values = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
        let deck = [], playerHand = [], dealerHand = [], isPlayerTurn = false;
        const startBtn = document.getElementById('startBtn'), hitBtn = document.getElementById('hitBtn'), standBtn = document.getElementById('standBtn');
        const messageEl = document.getElementById('message'), playerCardsEl = document.getElementById('player-cards'), dealerCardsEl = document.getElementById('dealer-cards');
        const playerScoreEl = document.getElementById('player-score'), dealerScoreEl = document.getElementById('dealer-score');

        function createDeck() { deck = suits.flatMap(suit => values.map(value => ({ suit, value }))).sort(() => Math.random() - 0.5); }
        function getCardValue(card) { if (['J', 'Q', 'K'].includes(card.value)) return 10; if (card.value === 'A') return 11; return parseInt(card.value); }
        function calculateScore(hand) { let score = hand.reduce((sum, card) => sum + getCardValue(card), 0); let aceCount = hand.filter(card => card.value === 'A').length; while (score > 21 && aceCount > 0) { score -= 10; aceCount--; } return score; }
        
        function dealCard(hand, element, reveal = true) {
            const card = deck.pop();
            hand.push(card);
            const cardEl = document.createElement('div');
            
            const suitColor = (card.suit === '♠' || card.suit === '♣') ? 'text-gray-800' : 'text-red-600';
            cardEl.className = `card w-20 h-32 m-1 rounded-lg relative transition-all duration-500 ease-in-out opacity-0 transform scale-0 ${suitColor}`;
            
            const front = document.createElement('div');
            front.className = 'front w-full h-full absolute rounded-lg shadow-md flex justify-center items-center text-4xl font-bold bg-white dark:bg-gray-200';
            front.style.backfaceVisibility = 'hidden';
            front.textContent = `${card.value}${card.suit}`;
            
            const back = document.createElement('div');
            back.className = 'back w-full h-full absolute rounded-lg shadow-md';
            back.style.backfaceVisibility = 'hidden';
            back.style.transform = 'rotateY(180deg)';
            back.style.backgroundColor = '#e74c3c';
            back.style.backgroundImage = 'linear-gradient(45deg, #c0392b 25%, transparent 25%, transparent 75%, #c0392b 75%), linear-gradient(45deg, #c0392b 25%, transparent 25%, transparent 75%, #c0392b 75%)';
            back.style.backgroundSize = '16px 16px';
            back.style.backgroundPosition = '0 0, 8px 8px';

            cardEl.appendChild(front);
            cardEl.appendChild(back);
            element.appendChild(cardEl);

            if (reveal) {
                setTimeout(() => {
                    cardEl.classList.add('opacity-100', 'scale-100');
                    setTimeout(() => cardEl.style.transform = 'rotateY(0deg)', 100);
                }, 100);
            } else {
                cardEl.classList.add('opacity-100', 'scale-100');
                 setTimeout(() => cardEl.style.transform = 'rotateY(180deg)', 100);
            }
            return cardEl;
        }

        function updateScores() {
            playerScoreEl.textContent = `${window.i18n.t("score")} ${calculateScore(playerHand)}`;
            const dealerFirstCard = dealerCardsEl.children[0];
            if (dealerFirstCard && !dealerFirstCard.classList.contains('is-flipped')) {
                if (dealerHand.length > 1) {
                    dealerScoreEl.textContent = `${window.i18n.t("score")} ${getCardValue(dealerHand[1])}`;
                } else {
                     dealerScoreEl.textContent = `${window.i18n.t("score")} 0`;
                }
            } else {
                dealerScoreEl.textContent = `${window.i18n.t("score")} ${calculateScore(dealerHand)}`;
            }
        }
        
        async function startGame() {
            startBtn.disabled = true;
            hitBtn.disabled = false;
            standBtn.disabled = false;
            createDeck();
            playerHand = [];
            dealerHand = [];
            playerCardsEl.innerHTML = '';
            dealerCardsEl.innerHTML = '';
            messageEl.textContent = window.i18n.t("dealingCards");
            updateScores();
            dealCard(dealerHand, dealerCardsEl, false);
            await new Promise(res => setTimeout(res, 500));
            dealCard(playerHand, playerCardsEl, true);
            await new Promise(res => setTimeout(res, 500));
            dealCard(dealerHand, dealerCardsEl, true);
            await new Promise(res => setTimeout(res, 500));
            dealCard(playerHand, playerCardsEl, true);
            await new Promise(res => setTimeout(res, 500));
            updateScores();
            isPlayerTurn = true;
            messageEl.textContent = window.i18n.t("yourTurn");
            if (calculateScore(playerHand) === 21) {
                messageEl.textContent = window.i18n.t("blackjackDealerTurn");
                stand();
            }
        }

        async function stand() {
            if (!isPlayerTurn) return;
            isPlayerTurn = false;
            hitBtn.disabled = true;
            standBtn.disabled = true;
            const hiddenCard = dealerCardsEl.children[0];
            if (hiddenCard) {
                hiddenCard.classList.add('is-flipped');
                hiddenCard.classList.remove('facedown');
            }
            await new Promise(res => setTimeout(res, 500));
            updateScores();
            await new Promise(res => setTimeout(res, 800));
            while (calculateScore(dealerHand) < 17) {
                messageEl.textContent = window.i18n.t("dealerDraws");
                await new Promise(res => setTimeout(res, 800));
                dealCard(dealerHand, dealerCardsEl);
                updateScores();
            }
            const playerScore = calculateScore(playerHand);
            const dealerScore = calculateScore(dealerHand);
            let resultMessage = '';
            if (playerScore > 21) resultMessage = window.i18n.t("playerBust");
            else if (dealerScore > 21) resultMessage = window.i18n.t("dealerBustPlayerWin");
            else if (playerScore > dealerScore) resultMessage = window.i18n.t("playerWin");
            else if (playerScore < dealerScore) resultMessage = window.i18n.t("playerLose");
            else resultMessage = window.i18n.t("tie");
            endGame(resultMessage);
        }
        
        function endGame(message) {
            messageEl.textContent = message;
            isPlayerTurn = false;
            hitBtn.disabled = true;
            standBtn.disabled = true;
            startBtn.disabled = false;
        }

        startBtn.addEventListener('click', startGame);
        hitBtn.addEventListener('click', () => {
            if (!isPlayerTurn) return;
            dealCard(playerHand, playerCardsEl);
            setTimeout(updateScores, 300);
            setTimeout(() => {
                if (calculateScore(playerHand) > 21) {
                    endGame(window.i18n.t("playerBust"));
                }
            }, 500);
        });
        standBtn.addEventListener('click', stand);
});
