import { initializePlayersUI } from './ui/renderer.js';
import { setupEventListeners } from './ui/events.js';
import { applyLifeFontSize } from './ui.js';
import { getSettings } from './state.js';

export function initializeApp() {
    const settings = getSettings();
    applyLifeFontSize(settings.lifeFontSize);
    initializePlayersUI(settings.playerCount);
    setupEventListeners();
}