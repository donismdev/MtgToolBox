
const defaultSettings = {
    lifeMax: 20,
    diceSides: 6,
    playerCount: 2,
    initiativeIndex: -1,
    monarchIndex: -1,
    threePlayerLayout: 'top',
    lifeFontSize: 'large',
    lifeAdjustDirection: 'horizontal'
};

let state = {
    players: [],
    settings: { ...defaultSettings },
    activeUI: null
};

// Connect to the parent window's session_data or create it
const parentWindow = window.parent || window;
if (!parentWindow.session_data) {
    parentWindow.session_data = {};
}
const dataSpace = parentWindow.session_data;

function loadState() {
    if (dataSpace.settings) {
        state.settings = JSON.parse(JSON.stringify(dataSpace.settings));
    } else {
        dataSpace.settings = { ...defaultSettings };
    }

    if (!dataSpace.lifeCounter) dataSpace.lifeCounter = {};
    if (!dataSpace.playerRotations) dataSpace.playerRotations = {};
    if (!dataSpace.themeData) dataSpace.themeData = {};

    // For any other state properties you want to persist
}

function saveState() {
    const lifeTotalsToSave = {};
    const rotationsToSave = {};
    const themesToSave = {};

    state.players.forEach(p => {
        lifeTotalsToSave[p.id] = p.life;
        rotationsToSave[p.id] = p.rotation;
        themesToSave[p.id] = p.themeName;
    });

    dataSpace.lifeCounter = lifeTotalsToSave;
    dataSpace.playerRotations = rotationsToSave;
    dataSpace.themeData = themesToSave;
    dataSpace.settings = state.settings;
}

function getSettings() {
    return state.settings;
}

function updateSetting(key, value) {
    state.settings[key] = value;
    saveState();
}

function getPlayers() {
    return state.players;
}

function setPlayers(players) {
    state.players = players;
}

function getPlayer(id) {
    return state.players.find(p => p.id === id);
}

function getActiveUI() {
    return state.activeUI;
}

function setActiveUI(ui) {
    state.activeUI = ui;
}

function getLifeData() {
    return dataSpace.lifeCounter || {};
}

function getRotationData() {
    return dataSpace.playerRotations || {};
}

function getThemeData() {
    return dataSpace.themeData || {};
}


export {
    loadState,
    saveState,
    getSettings,
    updateSetting,
    getPlayers,
    setPlayers,
    getPlayer,
    getActiveUI,
    setActiveUI,
    getLifeData,
    getRotationData,
    getThemeData
};
