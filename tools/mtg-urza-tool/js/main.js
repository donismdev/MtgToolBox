
const abilities = {
    plus_one: [
        "Until end of turn, you may cast a legendary spell from your hand without paying its mana cost.",
        "Draw two cards. You lose 2 life.",
        "Create two 1/1 colorless Thopter creature tokens with flying.",
        "You get an emblem with 'You may activate loyalty abilities of planeswalkers you control on any player's turn any time you could cast an instant.'",
        "Target player exiles the top two cards of their library. You may play those cards. You may spend mana as though it were mana of any color to cast them.",
        "Create a 0/0 colorless Construct artifact creature token with 'This creature gets +1/+1 for each artifact you control.'",
        "You gain 1 life for each artifact you control.",
        "Urza, Academy Headmaster deals 3 damage to any target.",
        "Create a token that's a copy of target artifact you control.",
        "Return target artifact or creature to its owner's hand.",
        "Until your next turn, target noncreature artifact becomes a 5/5 artifact creature.",
        "Search your library for a nonland artifact card, reveal it, put it into your hand, then shuffle.",
        "Destroy target creature.",
        "Create a Treasure token.",
        "Create a Food token.",
        "Amass 2.",
        "Scry 3.",
        "Target player mills four cards.",
        "Exile target player's graveyard.",
        "Target creature gets -4/-0 until your next turn."
    ],
    minus_one: [
        "Urza, Academy Headmaster deals 5 damage to target creature.",
        "Draw three cards, then discard a card.",
        "Create three 1/1 colorless Servo artifact creature tokens.",
        "Exile target permanent.",
        "Search your graveyard, hand, and library for a card named Karn, Scion of Urza and exile it. Then shuffle your library. You may put a card you own from exile into your hand.",
        "You get an emblem with 'Artifact spells you cast cost {1} less to cast.'",
        "Target player gets an emblem with 'At the beginning of your upkeep, you lose 1 life.'",
        "Create a 2/2 black Zombie creature token for each creature in your graveyard.",
        "Destroy all nonland permanents.",
        "Target creature gains indestructible until your next turn.",
        "You get an emblem with 'Whenever you cast a historic spell, draw a card.' (Artifacts, legendaries, and Sagas are historic.)",
        "Put a +1/+1 counter on each creature you control.",
        "Target player reveals their hand. You choose a nonland card from it. That player discards that card.",
        "Tap up to two target permanents. They don't untap during their controller's next untap step.",
        "Create a 4/4 colorless Juggernaut artifact creature token.",
        "Create two Treasure tokens.",
        "Reveal the top five cards of your library. An opponent separates them into two piles. Put one pile into your hand and the other on the bottom of your library in any order.",
        "Target creature you control fights target creature you don't control.",
        "Return up to two target creatures to their owners' hands.",
        "Exile up to two target nonland permanents. For each of those permanents, its controller creates a 2/2 colorless Drone artifact creature token."
    ],
    minus_six: [
        "You get an emblem with 'Artifacts, instants, and sorceries you control have affinity for artifacts.'",
        "You get an emblem with 'You may play cards from your graveyard.'",
        "You get an emblem with 'Whenever you cast a spell, you may create a token that's a copy of a permanent you control.'",
        "You get an emblem with 'At the beginning of each end step, search your library for a permanent card, put it onto the battlefield, then shuffle your library.'",
        "You get an emblem with 'You can't lose the game and your opponents can't win the game.'",
        "You get an emblem with 'Whenever an artifact is put into your graveyard from the battlefield, return it to the battlefield at the beginning of the next end step.'",
        "You get an emblem with 'You may cast nonland cards from your hand without paying their mana costs.'",
        "You get an emblem with 'You may have an unlimited number of cards in your hand.'",
        "You get an emblem with 'You may take an extra turn after this one.'",
        "You get an emblem with 'You get an emblem with 'You may activate loyalty abilities of planeswalkers you control twice each turn rather than only once.''",
        "You get an emblem with 'You may pay {0} rather than pay the mana cost for artifact spells you cast.'",
        "You get an emblem with 'Whenever you draw a card, you may create a 1/1 colorless Thopter artifact creature token with flying.'",
        "You get an emblem with 'Creatures you control get +2/+2.'",
        "You get an emblem with 'Whenever a source deals damage to you, you gain that much life.'",
        "You get an emblem with 'Whenever you cast a spell, copy it. You may choose new targets for the copy.'",
        "You get an emblem with 'You control your opponents.'",
        "You get an emblem with 'You win the game.'",
        "You get an emblem with 'At the beginning of your upkeep, you may search your library for a card, put it into your hand, then shuffle your library.'",
        "You get an emblem with 'Whenever you cast a historic spell, take an extra turn after this one.'",
        "You get an emblem with 'Artifacts you control have indestructible.'"
    ],
    fun_house: [
        "Ask a friend to choose a number between 1 and 10. You gain that much life.",
        "Roll a six-sided die. Create that many 1/1 colorless Servo artifact creature tokens.",
        "Target player chosen at random exiles the top card of their library. Until end of turn, you may cast that card.",
        "Choose a color. Create a 3/3 creature token of that color.",
        "Until your next turn, whenever a player casts a spell, that player gains 2 life.",
        "Create a token that's a copy of target permanent chosen at random.",
        "Target player chosen at random draws a card.",
        "Each player may return a card from their graveyard to their hand.",
        "Choose a card type. Reveal the top five cards of your library. Put all cards of the chosen type from among them into your hand and the rest on the bottom of your library in a random order.",
        "Roll two six-sided dice. If the total is 7, you win the game. Otherwise, you lose the game.",
        "You become the monarch.",
        "Until your next turn, creatures you control get +1/+0 and have haste.",
        "Exile your hand, then draw that many cards.",
        "Return a random permanent card from your graveyard to the battlefield.",
        "Scry X, where X is the number of players in the game.",
        "Each player sacrifices a creature.",
        "Create a Gold token.",
        "Until end of turn, you may cast spells from the top of your library.",
        "You get an emblem with 'Spells you cast cost {1} less to cast.'",
        "Choose target opponent. You control that player during their next turn."
    ]
};

document.addEventListener('DOMContentLoaded', () => {
    const backdrop = document.getElementById('modal-backdrop');
    const panel = document.getElementById('modal-panel');
    const titleEl = document.getElementById('modal-title');
    const textEl = document.getElementById('modal-text');
    const closeBtn = document.getElementById('modal-close-btn');

    function showModal(title, text) {
        titleEl.textContent = title;
        textEl.textContent = text;
        backdrop.classList.remove('hidden');
        panel.classList.remove('hidden');
    }

    function hideModal() {
        backdrop.classList.add('hidden');
        panel.classList.add('hidden');
    }

    function getRandomAbility(type) {
        const abilityList = abilities[type];
        const randomIndex = Math.floor(Math.random() * abilityList.length);
        return abilityList[randomIndex];
    }

    document.getElementById('plus-one-btn').addEventListener('click', () => {
        showModal('Urza, Academy Headmaster [+1]', getRandomAbility('plus_one'));
    });

    document.getElementById('minus-one-btn').addEventListener('click', () => {
        showModal('Urza, Academy Headmaster [-1]', getRandomAbility('minus_one'));
    });

    document.getElementById('minus-six-btn').addEventListener('click', () => {
        showModal('Urza, Academy Headmaster [-6]', getRandomAbility('minus_six'));
    });

    document.getElementById('fun-house-btn').addEventListener('click', () => {
        showModal("Urza's Fun House", getRandomAbility('fun_house'));
    });

    closeBtn.addEventListener('click', hideModal);
    backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) {
            hideModal();
        }
    });
});
