// js/initiative.js (화살표 제거, 애니메이션 기반 UI로 최종 변경)

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

let dungeonOverlay, roomElements, infoContainer, enterButton, backButton, mapContainer;
let isInitialized = false;
let activePlayerId = null;
let initialHistoryState = {};
let positionHandler = null;

function getPlayerDungeonData(playerId) {
    if (!window.dataSpace.dungeonState[playerId]) {
        window.dataSpace.dungeonState[playerId] = { history: [], completions: 0 };
    }
    return window.dataSpace.dungeonState[playerId];
}
function getCurrentRoomIndex(playerData) {
    const history = playerData.history;
    return history.length > 0 ? history[history.length - 1] : null;
}

function hideDungeon() {
    if (dungeonOverlay) {
        if (positionHandler) {
            window.removeEventListener('resize', positionHandler);
            if (mapContainer) mapContainer.removeEventListener('scroll', positionHandler);
            positionHandler = null;
        }
        dungeonOverlay.style.display = 'none';
        const player = window.players.find(p => p.id === activePlayerId);
        if (player) {
            const pData = getPlayerDungeonData(activePlayerId);
            if (pData.history.length > (initialHistoryState[activePlayerId]?.length || 0) ) {
                window.dataSpace.settings.initiativeIndex = player.getPlayerIndex();
                window.updateAllPlayerIcons();
            }
        }
        activePlayerId = null;
    }
}
function renderMapOnce(container) {
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
            roomEl.innerHTML = `<div class="room-name">${room.name}</div><div class="room-floor">Floor ${room.floor}</div>`;
            floorDiv.appendChild(roomEl);
            elements[room.index] = roomEl;
        });
        container.appendChild(floorDiv);
    });
    return elements;
}

function updateDungeonView(player) {
    const pData = getPlayerDungeonData(player.id);
    const history = pData.history;
    const allHistories = window.dataSpace.dungeonState;
    let selectedRoomIndex = parseInt(document.querySelector('.current-selection')?.dataset.roomIndex, 10);
    if (isNaN(selectedRoomIndex)) {
        selectedRoomIndex = getCurrentRoomIndex(pData) ?? 0;
    }

    document.querySelectorAll('.next-choice').forEach(el => el.classList.remove('next-choice'));

    for (const index in roomElements) {
        const roomEl = roomElements[index];
        roomEl.classList.remove('visited', 'current-player-location');
        if (history.includes(parseInt(index, 10))) roomEl.classList.add('visited');
    }

    const currentRoomIndex = getCurrentRoomIndex(pData);
    const currentRoomEl = roomElements[currentRoomIndex];

    if (currentRoomIndex === null) {
        if(roomElements[0]) roomElements[0].classList.add('next-choice');
    } else {
        if (currentRoomEl) {
            currentRoomEl.classList.add('current-player-location');
            const currentRoomData = undercity.rooms.find(r => r.index === currentRoomIndex);
            if (currentRoomData) {
                currentRoomData.nextRoomIndex.forEach(nextIndex => {
                    if(roomElements[nextIndex]) roomElements[nextIndex].classList.add('next-choice');
                });
            }
        }
    }
    

	if(roomElements[selectedRoomIndex]) {
        document.querySelectorAll('.current-selection').forEach(el => el.classList.remove('current-selection'));
        roomElements[selectedRoomIndex].classList.add('current-selection');
    }

    document.querySelectorAll('.player-marker').forEach(marker => marker.remove());
    document.querySelectorAll('.dungeon-room').forEach(room => {
        const occupantClasses = Array.from(room.classList).filter(cls => cls.startsWith('occupant-count-'));
        room.classList.remove(...occupantClasses);
    });
    const roomOccupants = {};
    for (const pId in allHistories) {
        const roomIndex = getCurrentRoomIndex(allHistories[pId]);
        if (roomIndex !== null) {
            if (!roomOccupants[roomIndex]) roomOccupants[roomIndex] = [];
            roomOccupants[roomIndex].push(pId);
        }
    }
    for (const roomIndex in roomOccupants) {
        const occupants = roomOccupants[roomIndex];
        const roomEl = roomElements[roomIndex];
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
    
    updateInfoPanel(player, selectedRoomIndex);

	// 현재 방 위치로 스크롤
	if (currentRoomEl) {
        // requestAnimationFrame을 사용해 렌더링 후 스크롤
        requestAnimationFrame(() => {
            currentRoomEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
    }
}


function updateInfoPanel(player, selectedRoomIndex) {
    backButton.textContent = uiText.backButton;
    const roomData = undercity.rooms.find(r => r.index === selectedRoomIndex);
    const pData = getPlayerDungeonData(player.id);
    const history = pData.history;
    const playerIndex = player.getPlayerIndex() + 1;
    const currentRoomIndex = getCurrentRoomIndex(pData);

    if (!roomData) return;

    // [핵심 수정] 스크롤될 컨텐츠를 새로운 헤더 구조로 변경
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
    
    backButton.disabled = history.length <= 1;

    if (currentRoomIndex === null) {
        enterButton.textContent = uiText.confirmEntryButton;
        enterButton.disabled = selectedRoomIndex !== 0;
    } else {
        const currentRoom = undercity.rooms.find(r => r.index === currentRoomIndex);
        if (currentRoom.nextRoomIndex.length === 0) {
            enterButton.textContent = uiText.completeButton;
            enterButton.disabled = (selectedRoomIndex !== currentRoomIndex);
        } else {
            enterButton.textContent = uiText.enterRoomButton;
            enterButton.disabled = !currentRoom.nextRoomIndex.includes(selectedRoomIndex);
        }
    }
}

export const initiativeManager = {
	showDungeon: function(playerId) {
		if (!window.dataSpace.dungeonState) window.dataSpace.dungeonState = {};
		const player = window.players.find(p => p.id === playerId);
		if (!player) return;

		activePlayerId = playerId;
		const pData = getPlayerDungeonData(playerId);
		initialHistoryState[playerId] = [...pData.history];

		if (!isInitialized) {
			isInitialized = true;
			dungeonOverlay = document.getElementById('dungeon-overlay');
			
			// [수정] 닫기 버튼 HTML 추가
			dungeonOverlay.innerHTML = `
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
			
			mapContainer = document.getElementById('dungeon-map-container');
			enterButton = document.getElementById('dungeon-enter-btn');
			backButton = document.getElementById('dungeon-back-btn');
			infoContainer = document.getElementById('dungeon-room-info'); // 이 변수는 현재 updateInfoPanel에서 직접 사용되지 않음
			roomElements = renderMapOnce(mapContainer);

			// 이벤트 리스너 설정
			Object.values(roomElements).forEach(roomEl => {
				roomEl.addEventListener('click', () => {
					const p = window.players.find(pl => pl.id === activePlayerId);
					if (!p) return;
					document.querySelectorAll('.current-selection').forEach(el => el.classList.remove('current-selection'));
					roomEl.classList.add('current-selection');
					updateInfoPanel(p, parseInt(roomEl.dataset.roomIndex, 10));
				});
			});

			enterButton.addEventListener('click', (e) => {
				if(e.target.disabled) return;
				const p = window.players.find(pl => pl.id === activePlayerId);
				const pData = getPlayerDungeonData(p.id);
				const selectedRoomEl = document.querySelector('.current-selection');
				if (!selectedRoomEl) return;
				const selectedRoomIndex = parseInt(selectedRoomEl.dataset.roomIndex, 10);
				
				const currentRoomIndex = getCurrentRoomIndex(pData);
				const currentRoom = undercity.rooms.find(r => r.index === currentRoomIndex);
				
				if (currentRoom && currentRoom.nextRoomIndex.length === 0) {
					pData.completions = (pData.completions || 0) + 1;
					pData.history.push(0);
				} else {
					pData.history.push(selectedRoomIndex);
				}
				updateDungeonView(p);
			});

			backButton.addEventListener('click', (e) => {
				if(e.target.disabled) return;
				const p = window.players.find(pl => pl.id === activePlayerId);
				const pData = getPlayerDungeonData(p.id);
				if (pData.history.length > 1) pData.history.pop();
				updateDungeonView(p);
			});

			dungeonOverlay.addEventListener('click', (e) => {
				if (e.target === dungeonOverlay) hideDungeon();
			});

			// [수정] 새로 추가된 닫기 버튼에 이벤트 리스너 추가
			document.getElementById('dungeon-close-btn').addEventListener('click', hideDungeon);
		}
		
		const p = window.players.find(pl => pl.id === activePlayerId);
		if(p) updateDungeonView(p);
		dungeonOverlay.style.display = 'flex';
	},

    resetAll: function() {
        if (window.dataSpace.dungeonState) window.dataSpace.dungeonState = {};
    }
};