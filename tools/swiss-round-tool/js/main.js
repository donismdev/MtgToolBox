import SetupView from './views/setupview.js';
import GameView from './views/gameview.js';
import ResultView from './views/resultview.js';

const app = document.getElementById('app');

const routes = {
    '/': SetupView,
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
        app.innerHTML = '<h1>404 Not Found</h1>';
        window.location.hash = '/';
    }
}

window.addEventListener('hashchange', router);
window.addEventListener('load', router);
