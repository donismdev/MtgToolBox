// js/initiative.js

// --- UI Text Map ---
// This object holds all user-facing strings for easy localization.
const uiText = {
    dungeonTitle: "Undercity",
    initialPrompt: "Select a room to enter from the map.",
    confirmEntryButton: "Enter Dungeon",
    nextRoomPrompt: "Select the next room from the map.",
    dungeonComplete: "Dungeon Complete!",
    closeButton: "Close",
    playerMeta: "Player {playerIndex} - Floor {floor}", // Using placeholders
};

// --- Dungeon Data (English only) ---
const undercity = {
    dungeonName: "Undercity",
    rooms: [
        { index: 0, floor: 1, nextRoomIndex: [1, 2], name: "Secret Entrance", roomAbility: "Search your library for a basic land card, put it onto the battlefield tapped, then shuffle." },
        { index: 1, floor: 2, nextRoomIndex: [3, 4], name: "Forge", roomAbility: "Put two +1/+1 counters on target creature." },
        { index: 2, floor: 2, nextRoomIndex: [4, 5], name: "Lost Well", roomAbility: "Scry 2." },
        { index: 3, floor: 3, nextRoomIndex: [6], name: "Trap!", roomAbility: "Target player loses 5 life." },
        { index: 4, floor: 3, nextRoomIndex: [6, 7], name: "Arena", roomAbility: "Goad target creature." },
        { index: 5, floor: 3, nextRoomIndex: [7], name: "Stash", roomAbility: "Create a Treasure token." },
        { index: 6, floor: 4, nextRoomIndex: [8], name: "Archives", roomAbility: "Draw a card." },
        { index: 7, floor: 4, nextRoomIndex: [8], name: "Catacombs", roomAbility: "Create a 4/1 black Skeleton creature token with menace." },
        { index: 8, floor: 5, nextRoomIndex: [], name: "Throne of the Dead Three", roomAbility: "Reveal the top ten cards of your library. Choose a creature card from among them. Put it onto the battlefield with three +1/+1 counters on it. It gains hexproof until your next turn. Then shuffle." },
    ],
};

// --- State and DOM Elements ---
let dungeonOverlay;

// --- Helper Functions ---

/** Gets the player's dungeon history (array of room indices). */
function getPlayerHistory(playerId) {
    return window.dataSpace.dungeonState?.[playerId] || [];
}

/** Gets the player's current room index. Returns null if not in a dungeon. */
function getCurrentRoomIndex(history) {
    return history.length > 0 ? history[history.length - 1] : null;
}

/** Hides the dungeon UI. */
function hideDungeon() {
    if (dungeonOverlay) {
        dungeonOverlay.style.display = 'none';
        dungeonOverlay.innerHTML = ''; // Clear for memory efficiency
    }
}

// --- Rendering and Logic Functions ---

/** Renders the dungeon map UI. */
function renderMap(container, allPlayerHistories) {
    container.innerHTML = '';
    const roomElements = {};

    const floors = undercity.rooms.reduce((acc, room) => {
        (acc[room.floor] = acc[room.floor] || []).push(room);
        return acc;
    }, {});

    Object.values(floors).forEach(floorRooms => {
        const floorDiv = document.createElement('div');
        floorDiv.className = 'dungeon-floor';
        floorRooms.forEach(room => {
            const roomEl = document.createElement('div');
            roomEl.id = `dungeon-room-${room.index}`;
            roomEl.className = 'dungeon-room';
            roomEl.innerHTML = `<div class="room-name">${room.name}</div><div class="room-floor">Floor ${room.floor}</div>`;
            floorDiv.appendChild(roomEl);
            roomElements[room.index] = roomEl;
        });
        container.appendChild(floorDiv);
    });

    // Add player markers
    for (const playerId in allPlayerHistories) {
        const history = allPlayerHistories[playerId];
        const roomIndex = getCurrentRoomIndex(history);
        if (roomIndex !== null) {
            const player = window.players.find(p => p.id === playerId);
            const roomEl = roomElements[roomIndex];
            if (player && roomEl) {
                const playerIndex = player.getPlayerIndex() + 1;
                roomEl.classList.add(`current-p${playerIndex}`);
                const marker = document.createElement('div');
                marker.className = `player-marker marker-p${playerIndex}`;
                marker.textContent = `P${playerIndex}`;
                roomEl.appendChild(marker);
            }
        }
    }
}

/** Updates the content of the right-side info panel. */
function renderRoomInfo(container, player, room, mode) {
    const playerIndex = player.getPlayerIndex() + 1;
    let content = '';

    if (mode === 'initial') {
        content = `
            <h3 class="room-info-title">${uiText.dungeonTitle}</h3>
            <p class="room-info-ability">${uiText.initialPrompt}</p>`;
    } else {
        const metaText = uiText.playerMeta
            .replace('{playerIndex}', playerIndex)
            .replace('{floor}', room.floor);

        content = `
            <h3 class="room-info-title">${room.name}</h3>
            <p class="room-info-meta">${metaText}</p>
            <div class="room-info-ability">
                <p>${room.roomAbility}</p>
            </div>`;

        if (mode === 'confirm_entry') {
            content += `<button id="confirm-entry-btn" class="dungeon-action-button">${uiText.confirmEntryButton}</button>`;
        } else if (mode === 'next_room' && room.nextRoomIndex.length > 0) {
            content += `<p class="room-info-prompt">${uiText.nextRoomPrompt}</p>`;
        } else {
            content += `<p class="room-info-complete">${uiText.dungeonComplete}</p>`;
        }
    }
    container.innerHTML = content;

    // Add event listener for the "Enter Dungeon" button
    if (mode === 'confirm_entry') {
        document.getElementById('confirm-entry-btn').addEventListener('click', () => {
            window.dataSpace.dungeonState[player.id] = [room.index]; // Add first entry to history
            hideDungeon();
        });
    }
}

/** Sets up the interaction logic (room selection). */
function setupInteraction(player, history) {
    const infoPanel = document.getElementById('dungeon-room-info');
    const currentRoomIndex = getCurrentRoomIndex(history);

    if (currentRoomIndex === null) { // First-time entry flow
        renderRoomInfo(infoPanel, player, null, 'initial');
        const entryRoomEl = document.getElementById('dungeon-room-0');
        entryRoomEl.classList.add('next-choice');
        entryRoomEl.addEventListener('click', () => {
            document.querySelectorAll('.next-choice').forEach(el => el.classList.remove('next-choice'));
            entryRoomEl.classList.add('current-selection'); 
            renderRoomInfo(infoPanel, player, undercity.rooms[0], 'confirm_entry');
        }, { once: true });
    } else { // Subsequent progression flow
        const currentRoom = undercity.rooms.find(r => r.index === currentRoomIndex);
        renderRoomInfo(infoPanel, player, currentRoom, 'next_room');
        currentRoom.nextRoomIndex.forEach(nextIndex => {
            const nextRoomEl = document.getElementById(`dungeon-room-${nextIndex}`);
            if (nextRoomEl) {
                nextRoomEl.classList.add('next-choice');
                nextRoomEl.addEventListener('click', () => {
                    window.dataSpace.dungeonState[player.id].push(nextIndex); // Add new room to history
                    hideDungeon();
                });
            }
        });
    }
}

/** Main function to render and display the dungeon UI for a player. */
function showDungeonForPlayer(player) {
    if (!dungeonOverlay) {
        dungeonOverlay = document.getElementById('dungeon-overlay');
        if (!dungeonOverlay) return console.error("Dungeon overlay not found!");
    }
    
    if (!window.dataSpace.dungeonState) window.dataSpace.dungeonState = {};
    if (!window.dataSpace.dungeonState[player.id]) window.dataSpace.dungeonState[player.id] = [];

    const playerHistory = getPlayerHistory(player.id);
    const allHistories = window.dataSpace.dungeonState;

    dungeonOverlay.innerHTML = `
        <div class="dungeon-modal">
            <div class="dungeon-map-panel">
                <h3 class="dungeon-title">${uiText.dungeonTitle}</h3>
                <div id="dungeon-map-container" class="dungeon-map-container"></div>
            </div>
            <div class="dungeon-info-panel">
                <div id="dungeon-room-info"></div>
                <button id="close-dungeon-btn" class="dungeon-close-button">${uiText.closeButton}</button>
            </div>
        </div>
    `;

    renderMap(dungeonOverlay.querySelector('#dungeon-map-container'), allHistories);
    setupInteraction(player, playerHistory);
    
    dungeonOverlay.querySelector('#close-dungeon-btn').addEventListener('click', hideDungeon);
    dungeonOverlay.addEventListener('click', (e) => {
        if (e.target === dungeonOverlay) hideDungeon();
    });

    dungeonOverlay.style.display = 'flex';
}

// --- Public API ---
export const initiativeManager = {
    /**
     * Called when a player clicks the Initiative button.
     * @param {string} playerId - The ID of the player who gained the initiative.
     */
    showDungeon: function(playerId) {
        const player = window.players.find(p => p.id === playerId);
        if (player) {
            showDungeonForPlayer(player);
        } else {
            console.error(`Initiative Manager: Player with ID "${playerId}" not found.`);
        }
    }
};
