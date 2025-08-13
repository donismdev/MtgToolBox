// config.js

// 1. 새로운 state 구조 정의
let state = {
    // --- 앱 전체 상태 ---
    isSignedIn: false,      // 구글 로그인 여부
    spreadsheetId: null,    // 연결된 스프레드시트 ID
    meta: null,             // 시트에서 불러온 meta 정보 (last_player_id 등)
    allPlayers: [],         // 시트에서 불러온 전체 플레이어 마스터 목록

    // --- 현재 진행중인 토너먼트 정보 ---
    currentEvent: null,     // 이 객체가 null이 아니면 토너먼트가 진행 중임을 의미
    /*
    currentEvent 객체 구조 예시:
    {
        id: 123, // 또는 'temp_12345'
        date: '2025-08-13',
        format: 'Modern',
        players: [ {player_id: 1, name: '...'}, ... ], // 이번 이벤트 참가자
        settings: {
            rounds: 3,
            bestOf: 3,
            timerMinutes: 50
        },
        history: [ 
            // 각 라운드 결과가 여기에 저장됨
            // { pairings: [...], results: [...] }, ... 
        ]
    }
    */
   
    // --- UI 편의를 위한 상태 ---
    currentRound: 1,        // 현재 진행 중인 라운드 번호
};

/**
 * 전역 상태(state)를 업데이트합니다.
 * @param {object} newState - 병합할 새로운 상태 객체
 */
export function setState(newState) {
    // 깊은 객체(currentEvent)의 일부만 업데이트할 경우를 대비해 병합 로직을 좀 더 견고하게 만듭니다.
    if (newState.currentEvent) {
        state.currentEvent = { ...state.currentEvent, ...newState.currentEvent };
        delete newState.currentEvent; // 병합했으므로 최상위 속성은 삭제
    }
    Object.assign(state, newState);
    console.log('State updated:', state);
}

/**
 * 현재 전역 상태를 반환합니다.
 * @returns {object}
 */
export function getState() {
    return state;
}

/**
 * 현재 진행중인 이벤트의 라운드 결과를 history에 임시 저장합니다.
 * @param {Array} pairings - 현재 라운드의 대진표
 * @param {Array} results - 현재 라운드의 경기 결과
 */
export function saveRoundResult(pairings, results) {
    if (!state.currentEvent) {
        console.error("저장할 이벤트가 없습니다.");
        return;
    }
    // currentEvent의 history 배열에 저장
    state.currentEvent.history[state.currentRound - 1] = {
        pairings: JSON.parse(JSON.stringify(pairings)),
        results: JSON.parse(JSON.stringify(results)),
    };
}

/**
 * 현재 진행중인 이벤트의 특정 라운드 데이터를 가져옵니다.
 * @param {number} roundNumber - 가져올 라운드 번호
 * @returns {object | undefined} 해당 라운드의 데이터
 */
export function getRoundData(roundNumber) {
    if (!state.currentEvent || !state.currentEvent.history) {
        return undefined;
    }
    return state.currentEvent.history[roundNumber - 1];
}