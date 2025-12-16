
import { createDefaultNote } from './secretNotes.js';

export class Player {
    constructor(id, initialLife, initialRotation, themeName) {
        this.id = id;
        this.life = initialLife;
        this.rotation = initialRotation;
        this.themeName = themeName;
        this.lifeLog = [];
        this.isNight = false;

        this.buttonSettings = [
			{ id: 'timer',		label: 'Timer',			enabled: false, backgroundSize: '85%' },
			{ id: 'initiative',	label: 'Initiative',	enabled: false, backgroundSize: '85%' },
			{ id: 'monarch',	label: 'Monarch',		enabled: false, backgroundSize: '85%' },
			{ id: 'log',		label: 'Life Log',		enabled: false, backgroundSize: '95%' },
			{ id: 'theme',		label: 'Theme',			enabled: false, backgroundSize: '85%' },
			{ id: 'note',		label: 'Secret Notes',	enabled: false, backgroundSize: '85%' },
			{ id: 'daynight',	label: 'Day / Night',	enabled: false, backgroundSize: '85%' },
			{ id: 'counter',	label: 'Ex Counters',	enabled: false, backgroundSize: '85%' },
    	];

		this.counterSettings = [
            { id: 'plain',    imageName: 'plain',    enabled: false, count : 0, label: '', backgroundSize: '120%' },
            { id: 'island',   imageName: 'island',   enabled: false, count : 0, label: '', backgroundSize: '120%' },
            { id: 'swamp',    imageName: 'swamp',    enabled: false, count : 0, label: '', backgroundSize: '120%' },
            { id: 'mountain', imageName: 'mountain', enabled: false, count : 0, label: '', backgroundSize: '120%' },
            { id: 'forest',   imageName: 'forest',   enabled: false, count : 0, label: '', backgroundSize: '120%' },
            { id: 'tax',      imageName: 'tax',      enabled: false, count : 0, label: '', backgroundSize: '85%' },
            { id: 'mana',     imageName: 'mana',     enabled: false, count : 0, label: '', backgroundSize: '100%' },
            { id: 'book',     imageName: 'book',     enabled: false, count : 0, label: '', backgroundSize: '85%' },
            { id: 'card',     imageName: 'card',     enabled: false, count : 0, label: '', backgroundSize: '85%' },
            { id: 'cross',    imageName: 'cross',    enabled: false, count : 0, label: '', backgroundSize: '100%' },
            { id: 'weapon',   imageName: 'weapon',   enabled: false, count : 0, label: '', backgroundSize: '85%' },
        ];
        
        this.secretNotes = Array(4).fill(null).map(() => createDefaultNote());
    }

    changeLife(amount) {
        this.life += amount;
        this.logEvent('lifeChange', { amount: amount, lifeAfter: this.life });
    }

    resetLife(newLife) {
        this.life = newLife;
        this.isNight = false;
        this.lifeLog = [];
        this.counterSettings.forEach(s => s.count = 0);
        this.logEvent('reset', { lifeAfter: this.life });
    }

    logEvent(type, details = {}) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            type: type,
            ...details
        };
        this.lifeLog.push(logEntry);
    }

    updateCounterValue(counterId, action) {
        const setting = this.counterSettings.find(s => s.id === counterId);
        if (setting) {
            if (action === 'increment') setting.count++;
            else if (action === 'decrement') setting.count--;
            else if (action === 'reset') setting.count = 0;
        }
    }

    toggleDayNight() {
        this.isNight = !this.isNight;
    }
}
