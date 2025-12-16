
import { Player } from '../player.js';
import { getSettings, setPlayers, getLifeData, getRotationData, getThemeData, updateSetting } from '../state.js';
import { allThemes } from '../themes.js';

function getGameContainer() {
    return document.getElementById('game-container');
}

export function initializePlayersUI(count) {
    const gameContainer = getGameContainer();
    gameContainer.innerHTML = '';

    document.body.classList.remove(
        'buttons-raised',
        'buttons-left',
        'buttons-right'
    );
    gameContainer.classList.remove(
        'game-layout-3-top',
        'game-layout-3-bottom'
    );

    const newPlayers = [];
    const settings = getSettings();
    let lifeData = getLifeData();
    let rotationData = getRotationData();
    let themeData = getThemeData();

    if (parseInt(settings.playerCount, 10) !== parseInt(count, 10)) {
        lifeData = {};
        rotationData = {};
        themeData = {};
    }

    updateSetting('playerCount', count);

    const defaultThemeNames = [
        allThemes.dark[0].name,
        allThemes.light[0].name,
        allThemes.dark[1].name,
        allThemes.light[1].name
    ];

    if (count === 3) {
        const layout = settings.threePlayerLayout;

        const p1 = new Player('player-1', lifeData['player-1'] ?? settings.lifeMax, rotationData['player-1'] ?? 0, themeData['player-1'] ?? 0);
        const p2 = new Player('player-2', lifeData['player-2'] ?? settings.lifeMax, rotationData['player-2'] ?? 0, themeData['player-2'] ?? 1);
        const p3 = new Player('player-3', lifeData['player-3'] ?? settings.lifeMax, rotationData['player-3'] ?? 0, themeData['player-3'] ?? 2);
        
        p1.logEvent('start', { lifeAfter: p1.life });
        p2.logEvent('start', { lifeAfter: p2.life });
        p3.logEvent('start', { lifeAfter: p3.life });

        newPlayers.push(p1, p2, p3);

        if (layout === 'left' || layout === 'right') {
            document.body.classList.add(layout === 'left' ? 'buttons-right' : 'buttons-left');

            const column = document.createElement('div');
            column.style.cssText = 'display:flex; flex-direction:column; width:50%; height:100%;';
            p2.elements.area.style.cssText = 'height:50%; width:100%;';
            p3.elements.area.style.cssText = 'height:50%; width:100%;';
            column.appendChild(p2.elements.area);
            column.appendChild(p3.elements.area);
            p1.elements.area.style.cssText = 'width:50%; height:100%;';

            if (layout === 'left') {
                gameContainer.appendChild(p1.elements.area);
                gameContainer.appendChild(column);
            } else {
                gameContainer.appendChild(column);
                gameContainer.appendChild(p1.elements.area);
            }
        } else {
            gameContainer.classList.add(`game-layout-3-${layout}`);
            newPlayers.forEach(p => gameContainer.appendChild(p.elements.area));
        }
    } else {
        for (let i = 0; i < count; i++) {
           const playerId = `player-${i + 1}`;
            let rotation;
            if (count === 2) {
                rotation = (i === 0) ? 180 : 0;
            } else if (count === 4) {
                rotation = (i < 2) ? 180 : 0;
            } else {
                rotation = rotationData[playerId] ?? 0;
            }

            const player = new Player(playerId, lifeData[playerId] ?? settings.lifeMax, rotation, defaultThemeNames[i] ?? i);
            player.logEvent('start', { lifeAfter: player.life });
            player.elements.area.classList.add(`player-count-${count}`);
            newPlayers.push(player);
            gameContainer.appendChild(player.elements.area);
        }
    }
    
    setPlayers(newPlayers);

    requestAnimationFrame(() => {
        newPlayers.forEach(p => p.updateRotationClass());
    });
}
