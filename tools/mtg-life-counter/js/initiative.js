// js/initiative.js (라이브러리 제거, 자체 SVG 화살표 엔진 및 신규 기능 탑재)

// --- UI Text Map ---
const uiText = {
    dungeonTitle: "Undercity",
    enterRoomButton: "Enter",
    confirmEntryButton: "Enter Dungeon",
    completeButton: "Complete!", // [신규] 완료 버튼 텍스트
    backButton: "Go Back",
    playerMeta: "Player {playerIndex} - Floor {floor}",
};

// --- Dungeon Data ---
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
let roomElements = null;
let isInitialized = false;
let activePlayerId = null; // 현재 던전을 보고 있는 플레이어 ID
let initialHistoryState = {}; // 던전 입장 시점의 기록을 저장
let activeLines = []; 
let positionHandler = null;

// [신규] 자주 사용하는 DOM 요소를 저장할 변수
let enterButton = null;
let backButton = null;
let infoContainer = null;
let mapContainer = null;

// --- Helper Functions ---
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
        document.querySelectorAll('.leader-line').forEach(el => el.remove());
        activeLines = [];
        dungeonOverlay.style.display = 'none';
    }
}

// [핵심 신규] 자체 SVG 화살표 렌더링 엔진
function drawArrowsSVG() {
    const svg = document.getElementById('dungeon-arrow-svg');
    const mapContainer = document.getElementById('dungeon-map-container');
    if (!svg || !mapContainer) return;
    svg.innerHTML = ''; // 기존 화살표 초기화

    undercity.rooms.forEach(startRoom => {
        if (startRoom.nextRoomIndex.length > 0) {
            const startEl = roomElements[startRoom.index];
            startRoom.nextRoomIndex.forEach(endRoomIndex => {
                const endEl = roomElements[endRoomIndex];
                if (startEl && endEl) {
                    const x1 = startEl.offsetLeft + startEl.offsetWidth / 2;
                    const y1 = startEl.offsetTop + startEl.offsetHeight;
                    const x2 = endEl.offsetLeft + endEl.offsetWidth / 2;
                    const y2 = endEl.offsetTop;

                    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                    path.setAttribute('d', `M${x1},${y1} C${x1},${y1 + 30} ${x2},${y2 - 30} ${x2},${y2}`);
                    path.setAttribute('stroke', 'rgba(255, 215, 0, 0.6)');
                    path.setAttribute('stroke-width', '4');
                    path.setAttribute('fill', 'none');
                    path.setAttribute('marker-end', 'url(#arrowhead)');
                    svg.appendChild(path);
                }
            });
        }
    });
}


function renderMapOnce(container) {
    // ... (이 함수는 변경 없음) ...
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
    let selectedRoomIndex = getCurrentRoomIndex(pData) ?? 0;

    // ... (마커 생성 및 룸 클래스 업데이트 로직은 이전과 동일하게 완벽) ...
    
    updateInfoPanel(player, selectedRoomIndex);
    requestAnimationFrame(() => drawArrowsSVG()); // 자체 엔진 호출
}

function updateInfoPanel(player, selectedRoomIndex) {
    backButton.textContent = uiText.backButton;

    const roomData = undercity.rooms.find(r => r.index === selectedRoomIndex);
    const pData = getPlayerDungeonData(player.id);
    const history = pData.history;
    const playerIndex = player.getPlayerIndex() + 1;
    const currentRoomIndex = getCurrentRoomIndex(pData);

    if (!roomData) return;

    const metaText = uiText.playerMeta.replace('{playerIndex}', playerIndex).replace('{floor}', roomData.floor);
    infoContainer.innerHTML = `
        <h3 class="room-info-title">${roomData.name}</h3>
        <p class="room-info-meta">${metaText}</p>
        <div class="room-info-ability"><p>${roomData.roomAbility}</p></div>
    `;
    
    backButton.disabled = history.length === 0;

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
            dungeonOverlay.innerHTML = `
                <div class="dungeon-modal" onclick="event.stopPropagation()">
                    <div class="dungeon-map-panel">
                        <h3 class="dungeon-title">${uiText.dungeonTitle}</h3>
                        <div id="dungeon-map-container" class="dungeon-map-container">
                            <svg id="dungeon-arrow-svg" class="dungeon-arrow-svg">
                                <defs>
                                    <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="0" refY="3.5" orient="auto">
                                        <polygon points="0 0, 10 3.5, 0 7" fill="rgba(255, 215, 0, 0.6)"/>
                                    </marker>
                                </defs>
                            </svg>
                        </div>
                    </div>
                    <div class="dungeon-info-panel">
                        <div id="info-content-wrapper" class="info-content-wrapper">
                            <div id="dungeon-room-info"></div>
                        </div>
                        <div class="button-group">
                            <button id="dungeon-enter-btn" class="dungeon-action-button"></button>
                            <button id="dungeon-back-btn" class="dungeon-back-button"></button>
                        </div>
                    </div>
                </div>
            `;
            
            // [신규] DOM 요소를 한 번만 찾아 변수에 저장
            mapContainer = document.getElementById('dungeon-map-container');
            enterButton = document.getElementById('dungeon-enter-btn');
            backButton = document.getElementById('dungeon-back-btn');
            infoContainer = document.getElementById('dungeon-room-info');

            roomElements = renderMapOnce(mapContainer);

            // 이벤트 리스너 설정
            Object.values(roomElements).forEach(roomEl => {
                roomEl.addEventListener('click', () => {
                    const p = window.players.find(pl => pl.id === activePlayerId);
                    if (!p) return;
                    const selectedIndex = parseInt(roomEl.dataset.roomIndex, 10);
                    document.querySelectorAll('.current-selection').forEach(el => el.classList.remove('current-selection'));
                    roomEl.classList.add('current-selection');
                    updateInfoPanel(p, selectedIndex);
                });
            });

            enterButton.addEventListener('click', (e) => {
                if(e.target.disabled) return;
                const p = window.players.find(pl => pl.id === activePlayerId);
                const pData = getPlayerDungeonData(p.id);
                const selectedRoomIndex = parseInt(document.querySelector('.current-selection').dataset.roomIndex, 10);
                const currentRoomIndex = getCurrentRoomIndex(pData);
                const currentRoom = undercity.rooms.find(r => r.index === currentRoomIndex);
                
                if (currentRoom && currentRoom.nextRoomIndex.length === 0) {
                    pData.completions = (pData.completions || 0) + 1;
                    pData.history = [0]; 
                } else {
                    pData.history.push(selectedRoomIndex);
                }
                updateDungeonView(p);
            });

            backButton.addEventListener('click', (e) => {
                if(e.target.disabled) return;
                const p = window.players.find(pl => pl.id === activePlayerId);
                const pData = getPlayerDungeonData(p.id);
                pData.history.pop();
                updateDungeonView(p);
            });

            dungeonOverlay.addEventListener('click', (e) => {
                if (e.target === dungeonOverlay) hideDungeon();
            });
        }
        
        activePlayerId = playerId; // [수정] showDungeon 호출 시마다 activePlayerId 갱신
        updateDungeonView(player);
        dungeonOverlay.style.display = 'flex';
        
        if (positionHandler) {
            window.removeEventListener('resize', positionHandler);
            if (mapContainer) mapContainer.removeEventListener('scroll', positionHandler);
        }
        positionHandler = () => requestAnimationFrame(drawArrowsSVG);
        window.addEventListener('resize', positionHandler);
        if (mapContainer) mapContainer.addEventListener('scroll', positionHandler);
    },

    resetAll: function() {
        if (window.dataSpace.dungeonState) window.dataSpace.dungeonState = {};
    }
};