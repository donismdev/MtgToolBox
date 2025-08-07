const uiText = {
    dungeonTitle: "Undercity",
    enterRoomButton: "Enter",
    confirmEntryButton: "Enter Dungeon",
    completeButton: "Complete!",
    backButton: "Go Back",
    playerMeta: "Player {playerIndex} - Floor {floor}",
};
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

export class DungeonOverlay {
    constructor() {
        this.dungeonOverlay = null;
        this.roomElements = null;
        this.infoContainer = null;
        this.enterButton = null;
        this.backButton = null;
        this.mapContainer = null;
        this.isInitialized = false;
        this.activePlayerId = null;
        this.initialHistoryState = {};
        this.positionHandler = null;
    }

    getPlayerDungeonData(playerId) {
        if (!window.dataSpace.dungeonState) window.dataSpace.dungeonState = {};
        if (!window.dataSpace.dungeonState[playerId]) {
            window.dataSpace.dungeonState[playerId] = { history: [], completions: 0 };
        }
        return window.dataSpace.dungeonState[playerId];
    }

    getCurrentRoomIndex(playerData) {
        const history = playerData.history;
        return history.length > 0 ? history[history.length - 1] : null;
    }

    hideDungeon() {
        if (this.dungeonOverlay) {
            if (this.positionHandler) {
                window.removeEventListener('resize', this.positionHandler);
                if (this.mapContainer) this.mapContainer.removeEventListener('scroll', this.positionHandler);
                this.positionHandler = null;
            }
            this.dungeonOverlay.style.display = 'none';
            const player = window.players.find(p => p.id === this.activePlayerId);
            if (player) {
                const pData = this.getPlayerDungeonData(this.activePlayerId);
                if (pData.history.length > (this.initialHistoryState[this.activePlayerId]?.length || 0) ) {
                    window.dataSpace.settings.initiativeIndex = player.getPlayerIndex();
                    window.updateAllPlayerIcons();
                }
            }
            this.activePlayerId = null;
        }
    }

    renderMapOnce(container) {
        const elements = {};
        const floors = undercity.rooms.reduce((acc, room) => {
            (acc[room.floor] = acc[room.floor] || []).push(room); return acc;
        }, {});
        Object.values(floors).forEach(floorRooms => {
            const floorDiv = document.createElement('div');
            floorDiv.className = 'dungeon-floor';
            floorRooms.forEach(room => {
                const roomEl = document.createElement('div');
                roomEl.id = `dungeon-room-${room.index}`;
                roomEl.className = 'dungeon-room';
                roomEl.dataset.roomIndex = room.index;
                roomEl.innerHTML = `<div class="room-name">${room.name}</div><div class="room-floor">F${room.floor}</div>`;
                floorDiv.appendChild(roomEl);
                elements[room.index] = roomEl;
            });
            container.appendChild(floorDiv);
        });
        return elements;
    }

    updateDungeonView(player) {
        const pData = this.getPlayerDungeonData(player.id);
        const fullHistory = pData.history;
        const allHistories = window.dataSpace.dungeonState;

        const lastRunStartIndex = fullHistory.lastIndexOf(0);
        const currentRunHistory = lastRunStartIndex === -1 ? fullHistory : fullHistory.slice(lastRunStartIndex);

        let selectedRoomIndex = parseInt(document.querySelector('.current-selection')?.dataset.roomIndex, 10);
        if (isNaN(selectedRoomIndex)) {
            selectedRoomIndex = this.getCurrentRoomIndex(pData) ?? 0;
        }

        document.querySelectorAll('.next-choice').forEach(el => el.classList.remove('next-choice'));

        for (const index in this.roomElements) {
            const roomEl = this.roomElements[index];
            roomEl.classList.remove('visited', 'current-player-location');
            if (currentRunHistory.includes(parseInt(index, 10))) {
                roomEl.classList.add('visited');
            }
        }

        const currentRoomIndex = this.getCurrentRoomIndex(pData);
        const currentRoomEl = this.roomElements[currentRoomIndex];

        if (currentRoomIndex === null) {
            if(this.roomElements[0]) this.roomElements[0].classList.add('next-choice');
        } else {
            if (currentRoomEl) {
                currentRoomEl.classList.add('current-player-location');
                const currentRoomData = undercity.rooms.find(r => r.index === currentRoomIndex);
                if (currentRoomData) {
                    currentRoomData.nextRoomIndex.forEach(nextIndex => {
                        if(this.roomElements[nextIndex]) this.roomElements[nextIndex].classList.add('next-choice');
                    });
                }
            }
        }
        
        if(this.roomElements[selectedRoomIndex]) {
            document.querySelectorAll('.current-selection').forEach(el => el.classList.remove('current-selection'));
            this.roomElements[selectedRoomIndex].classList.add('current-selection');
        }

        document.querySelectorAll('.player-marker').forEach(marker => marker.remove());
        document.querySelectorAll('.dungeon-room').forEach(room => {
            const occupantClasses = Array.from(room.classList).filter(cls => cls.startsWith('occupant-count-'));
            room.classList.remove(...occupantClasses);
        });
        const roomOccupants = {};
        for (const pId in allHistories) {
            const roomIndex = this.getCurrentRoomIndex(allHistories[pId]);
            if (roomIndex !== null) {
                if (!roomOccupants[roomIndex]) roomOccupants[roomIndex] = [];
                roomOccupants[roomIndex].push(pId);
            }
        }
        for (const roomIndex in roomOccupants) {
            const occupants = roomOccupants[roomIndex];
            const roomEl = this.roomElements[roomIndex];
            if (roomEl) {
                roomEl.classList.add(`occupant-count-${occupants.length}`);
                occupants.forEach((pId, i) => {
                    const p = window.players.find(pl => pl.id === pId);
                    if (p) {
                        const marker = document.createElement('div');
                        const pIndex = p.getPlayerIndex() + 1;
                        marker.className = `player-marker marker-p${pIndex} marker-pos-${i}`;
                        marker.textContent = `P${pIndex}`;
                        roomEl.appendChild(marker);
                    }
                });
            }
        }
        
        this.updateInfoPanel(player, selectedRoomIndex);

        if (currentRoomEl) {
            requestAnimationFrame(() => {
                currentRoomEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
            });
        }
    }

    updateInfoPanel(player, selectedRoomIndex) {
        this.backButton.textContent = uiText.backButton;
        const roomData = undercity.rooms.find(r => r.index === selectedRoomIndex);
        const pData = this.getPlayerDungeonData(player.id);
        const history = pData.history;
        const playerIndex = player.getPlayerIndex() + 1;
        const currentRoomIndex = this.getCurrentRoomIndex(pData);

        if (!roomData) return;

        const scrollWrapper = document.getElementById('info-scroll-wrapper');
        if (scrollWrapper) {
            scrollWrapper.innerHTML = `
                <div class="room-info-header">
                    <span class="room-info-title">${roomData.name}</span>
                    <span class="room-info-meta">(Player ${playerIndex} - Floor ${roomData.floor})</span>
                </div>
                <div class="room-info-ability"><p>${roomData.roomAbility}</p></div>
            `;
        }
        
        this.backButton.disabled = history.length <= 1;

        if (currentRoomIndex === null) {
            this.enterButton.textContent = uiText.confirmEntryButton;
            this.enterButton.disabled = selectedRoomIndex !== 0;
        } else {
            const currentRoom = undercity.rooms.find(r => r.index === currentRoomIndex);
            if (currentRoom.nextRoomIndex.length === 0) {
                this.enterButton.textContent = uiText.completeButton;
                this.enterButton.disabled = (selectedRoomIndex !== currentRoomIndex);
            } else {
                this.enterButton.textContent = uiText.enterRoomButton;
                this.enterButton.disabled = !currentRoom.nextRoomIndex.includes(selectedRoomIndex);
            }
        }
    }

    show(playerId) {
        this.activePlayerId = playerId;
        const pData = this.getPlayerDungeonData(playerId);
        this.initialHistoryState[playerId] = [...pData.history];

        if (!this.isInitialized) {
            this.isInitialized = true;
            this.dungeonOverlay = document.getElementById('dungeon-overlay');
            
            this.dungeonOverlay.innerHTML = `
                <div class="dungeon-modal" onclick="event.stopPropagation()">
                    <button id="dungeon-close-btn" class="dungeon-modal-close-btn">&times;</button>
                    <div class="dungeon-map-panel">
                        <h3 class="dungeon-title">${uiText.dungeonTitle}</h3>
                        <div id="dungeon-map-container" class="dungeon-map-container"></div>
                    </div>
                    <div class="dungeon-info-panel">
                        <div id="info-scroll-wrapper"></div>
                        <div class="button-group">
                            <button id="dungeon-enter-btn" class="dungeon-action-button"></button>
                            <button id="dungeon-back-btn" class="dungeon-back-button"></button>
                        </div>
                    </div>
                </div>
            `;
            
            this.mapContainer = document.getElementById('dungeon-map-container');
            this.enterButton = document.getElementById('dungeon-enter-btn');
            this.backButton = document.getElementById('dungeon-back-btn');
            this.roomElements = this.renderMapOnce(this.mapContainer);

            Object.values(this.roomElements).forEach(roomEl => {
                roomEl.addEventListener('click', () => {
                    const p = window.players.find(pl => pl.id === this.activePlayerId);
                    if (!p) return;
                    document.querySelectorAll('.current-selection').forEach(el => el.classList.remove('current-selection'));
                    roomEl.classList.add('current-selection');
                    this.updateInfoPanel(p, parseInt(roomEl.dataset.roomIndex, 10));
                });
            });

            this.enterButton.addEventListener('click', (e) => {
                if(e.target.disabled) return;
                const p = window.players.find(pl => pl.id === this.activePlayerId);
                const pData = this.getPlayerDungeonData(p.id);
                const selectedRoomEl = document.querySelector('.current-selection');
                if (!selectedRoomEl) return;
                const selectedRoomIndex = parseInt(selectedRoomEl.dataset.roomIndex, 10);
                
                const currentRoomIndex = this.getCurrentRoomIndex(pData);
                const currentRoom = undercity.rooms.find(r => r.index === currentRoomIndex);
                
                if (currentRoom && currentRoom.nextRoomIndex.length === 0) {
                    pData.completions = (pData.completions || 0) + 1;
                    pData.history.push(0);
                } else {
                    pData.history.push(selectedRoomIndex);
                }
                this.updateDungeonView(p);
            });

            this.backButton.addEventListener('click', (e) => {
                if(e.target.disabled) return;
                const p = window.players.find(pl => pl.id === this.activePlayerId);
                const pData = this.getPlayerDungeonData(p.id);
                if (pData.history.length > 1) pData.history.pop();
                this.updateDungeonView(p);
            });

            this.dungeonOverlay.addEventListener('click', (e) => {
                if (e.target === this.dungeonOverlay) this.hideDungeon();
            });

            document.getElementById('dungeon-close-btn').addEventListener('click', () => this.hideDungeon());
        }
        
        const p = window.players.find(pl => pl.id === this.activePlayerId);
        if(p) this.updateDungeonView(p);
        this.dungeonOverlay.style.display = 'flex';
    }

    resetAll() {
        if (window.dataSpace.dungeonState) window.dataSpace.dungeonState = {};
    }
}
