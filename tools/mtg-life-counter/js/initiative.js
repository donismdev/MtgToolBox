import { DungeonOverlay } from './DungeonOverlay.js';

const dungeonOverlayInstance = new DungeonOverlay();

export const initiativeManager = {
	showDungeon: function(playerId) {
		dungeonOverlayInstance.show(playerId);
	},

    resetAll: function() {
        dungeonOverlayInstance.resetAll();
    }
};