import * as GoogleApi from './api/google.js'; // API 모듈 임포트
import { setState, getState } from './config.js'; // 상태 관리 모듈 임포트

import PlayerView from './views/playerview.js';
import MatchSettingsView from './views/matchsettingsview.js';
import GameView from './views/gameview.js';
import ResultView from './views/resultview.js';

const app = document.getElementById('app');

const routes = {
    '/': PlayerView,
    '/match': MatchSettingsView,
    '/game': GameView,
    '/result': ResultView
};

function router() {
    const path = window.location.hash.slice(1) || '/';
    const view = routes[path];
    
    if (view) {
        app.innerHTML = '';
        app.appendChild(view());
    } else {
        window.location.hash = '/';
    }
}

// 앱의 전역 상태 변경을 감지하는 콜백 함수
function onGlobalStateChange(newState) {
    console.log("Global state changed:", newState);
    // 필요 시, 현재 뷰를 다시 렌더링 할 수 있습니다.
    // router(); // 상태가 바뀔 때마다 뷰를 강제로 새로고침하려면 이 줄의 주석을 해제하세요.
}

// Google 로그인 상태 변경 콜백
function onAuthChange(isSignedIn) {
    setState({ isSignedIn });
    if (!isSignedIn) {
        GoogleApi.setCurrentSpreadsheetId(null);
        setState({ spreadsheetId: null, players: [], meta: null });
        window.location.hash = '/';
    }
    router();
}

// --- 앱 시작 ---
async function main() {
    window.i18n.initPromise.then(async () => {
        window.addEventListener('hashchange', router);
        window.addEventListener('load', router);

        await GoogleApi.initGoogleClient(onAuthChange);

        // 로그인이 감지되면(토큰이 있으면), meta 데이터를 미리 로드
        if (GoogleApi.getCurrentToken()) {
            try {
                const meta = await GoogleApi.getConfigMap();
                setState({ meta });
                console.log("Meta data pre-loaded:", meta);
            } catch (err) {
                console.error("Failed to pre-load meta data:", err.message);
            }
        }
    });
}

main();