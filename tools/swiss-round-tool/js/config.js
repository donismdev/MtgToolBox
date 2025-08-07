let state = {
    players: [],
    rounds: 3,
    bestOf: 3, // 3전 2선승제
    timerMinutes: 50,
    currentRound: 1,
    history: [], // 각 라운드의 결과와 대진표를 저장
};

export function setState(newState) {
    Object.assign(state, newState);
}

export function getState() {
    return state;
}

export function saveRoundResult(pairings, results) {
    state.history[state.currentRound - 1] = {
        pairings: JSON.parse(JSON.stringify(pairings)),
        results: JSON.parse(JSON.stringify(results)),
    };
}

export function getRoundData(roundNumber) {
    return state.history[roundNumber - 1];
}