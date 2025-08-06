// js/secretNotes.js

// --- "비공개" 헬퍼 함수들 ---

function hideSecretNotesHub(player) {
    if (player.elements.secretNotesHubOverlay) {
        player.elements.secretNotesHubOverlay.style.display = 'none';
    }
    window.activeUI = null;
}

function hideSecretNoteEditor(player) {
    if (player.elements.noteEditorOverlay) {
        player.elements.noteEditorOverlay.style.display = 'none';
    }
    window.activeUI = player; 
}

function showSecretNoteEditor(player, noteIndex) {
    renderSecretNoteEditor(player, noteIndex);
    player.elements.noteEditorOverlay.style.display = 'flex';
}

function showNoteActions(player, buttonElement, noteIndex) {
    const oldMenu = player.elements.area.querySelector('.note-action-menu');
    if (oldMenu) oldMenu.remove();

    const menu = document.createElement('div');
    menu.className = 'note-action-menu';

    const btnEdit = document.createElement('button');
    btnEdit.textContent = '수정';
    btnEdit.onclick = (e) => {
        e.stopPropagation();
        menu.remove();
        showSecretNoteEditor(player, noteIndex);
    };

    const btnReveal = document.createElement('button');
    btnReveal.textContent = '공개';
    btnReveal.onclick = (e) => {
        e.stopPropagation();
        menu.remove();
        revealNote(player, noteIndex);
    };
    
    menu.append(btnEdit, btnReveal);
    buttonElement.appendChild(menu);

    setTimeout(() => {
        const closeMenu = (e) => {
            if (!menu.contains(e.target)) {
                menu.remove();
                document.removeEventListener('click', closeMenu);
            }
        };
        document.addEventListener('click', closeMenu);
    }, 0);
}

function renderSecretNotesHub(player) {
    const container = player.elements.secretNotesHubOverlay.querySelector('.note-slots-container');
    container.innerHTML = '';
    player.secretNotes.forEach((note, index) => {
        const slot = document.createElement('button');
        slot.className = `note-slot ${note.isFilled ? 'filled' : 'empty'}`;
        slot.textContent = `Note ${index + 1}`;
        
        slot.onclick = () => {
            const existingMenu = player.elements.area.querySelector('.note-action-menu');
            if (existingMenu) existingMenu.remove();

            if (note.isFilled) {
                showNoteActions(player, slot, index);
            } else {
                showSecretNoteEditor(player, index);
            }
        };
        container.appendChild(slot);
    });
}

// ==================================================================
// ▼▼▼ 핵심 수정 영역: renderSecretNoteEditor 함수 ▼▼▼
// ==================================================================

// [개선 1] 카테고리 설정을 객체로 분리하여 관리 용이성 및 확장성 증대
const noteCategories = {
    player: { label: 'Player', type: 'buttons', items: ['P1', 'P2', 'P3', 'P4'], default: [] },
    color: { label: 'Color', type: 'buttons', items: ['White', 'Blue', 'Black', 'Red', 'Green'], default: [] },
    cost: { label: 'Cost', type: 'slider', min: 1, max: 15, default: 8 },
    number: { label: 'Number', type: 'buttons', items: ['1','2','3','4','5','6','7','8','9','Other'], default: [] },
    type: { label: 'Type', type: 'buttons', items: ['Permanent', 'Creature', 'Planeswalker', 'Artifact', 'Enchantment', 'Land', 'Battle', 'Instant', 'Sorcery'], default: [] },
    char: { label: 'Char', type: 'slider', min: 'A', max: 'Z', default: 'M' },
};

export function createDefaultNote() {
    const selections = {};
    for (const key in noteCategories) {
        selections[key] = JSON.parse(JSON.stringify(noteCategories[key].default));
    }
    return {
        isFilled: false,
        selections: selections
    };
}

function renderSecretNoteEditor(player, noteIndex) {
    const modal = player.elements.noteEditorOverlay.querySelector('.note-editor-modal');
    const note = player.secretNotes[noteIndex];
    let tempSelections = JSON.parse(JSON.stringify(note.selections));

    const getSummaryText = (category) => {
        const selection = tempSelections[category];
        if (Array.isArray(selection)) {
            return selection.length > 0 ? `(${selection.join(', ')})` : '';
        }
        return `(${selection})`;
    };

    modal.innerHTML = `
        <div class="note-editor-header">
            <h2 class="note-modal-title">Edit Note ${noteIndex + 1}</h2>
            <button class="close-button">&times;</button>
        </div>
        <div class="note-editor-content"></div>
    `;

    const contentArea = modal.querySelector('.note-editor-content');

    for (const [key, config] of Object.entries(noteCategories)) {
        const categoryWrapper = document.createElement('div');
        categoryWrapper.className = 'editor-category';
        categoryWrapper.dataset.categoryWrapper = key;

        let controlHTML = '';
        if (config.type === 'buttons') {
            const buttonsHTML = config.items.map(item => {
                const isActive = tempSelections[key]?.includes(item) ? 'active' : '';
                return `<button class="editor-btn ${isActive}" data-value="${item}">${item}</button>`;
            }).join('');
            controlHTML = `<div class="editor-btn-group">${buttonsHTML}</div>`;
        } else if (config.type === 'slider') {
            const value = tempSelections[key];
            const isChar = key === 'char';
            const min = isChar ? config.min.charCodeAt(0) : config.min;
            const max = isChar ? config.max.charCodeAt(0) : config.max;
            const sliderValue = isChar ? value.charCodeAt(0) : value;
            controlHTML = `<div class="editor-slider-group">
                <span>${config.min}</span>
                <input type="range" min="${min}" max="${max}" value="${sliderValue}">
                <output>${value}</output>
                <span>${config.max}</span>
            </div>`;
        }

        categoryWrapper.innerHTML = `
            <div class="editor-category-header">
                <h3>${config.label}</h3>
                <span class="editor-category-summary">${getSummaryText(key)}</span>
                <button class="editor-category-reset" data-category="${key}">Reset</button>
            </div>
            ${controlHTML}
        `;
        contentArea.appendChild(categoryWrapper);
    }

    const actionsWrapper = document.createElement('div');
    actionsWrapper.className = 'note-editor-actions';
    actionsWrapper.innerHTML = `
        <input type="text" class="note-title-input" placeholder="Enter note title...">
        <button class="note-editor-save">Save</button>
        <button class="note-editor-cancel">Cancel</button>
    `;
    contentArea.appendChild(actionsWrapper);

    // --- [개선 2] 이벤트 위임을 사용하여 이벤트 핸들러 최적화 ---

	modal.querySelector('.close-button').onclick = () => hideSecretNoteEditor(player);

    modal.querySelector('.note-editor-save').onclick = () => {
        const titleInput = modal.querySelector('.note-title-input');
        player.secretNotes[noteIndex].title = titleInput.value;
        player.secretNotes[noteIndex].selections = tempSelections;
        const isDefault = Object.keys(noteCategories).every(key =>
            JSON.stringify(tempSelections[key]) === JSON.stringify(noteCategories[key].default)
        );
        player.secretNotes[noteIndex].isFilled = !isDefault || titleInput.value.trim() !== '';
        hideSecretNoteEditor(player);
        renderSecretNotesHub(player);
    };

    contentArea.addEventListener('click', (e) => {
        const target = e.target;
        if (target.matches('.editor-btn')) {
            const wrapper = target.closest('.editor-category');
            const category = wrapper.dataset.categoryWrapper;
            const value = target.dataset.value;
            const index = tempSelections[category].indexOf(value);
            if (index > -1) {
                tempSelections[category].splice(index, 1);
            } else {
                tempSelections[category].push(value);
            }
            target.classList.toggle('active');
            wrapper.querySelector('.editor-category-summary').textContent = getSummaryText(category);
        }
        if (target.matches('.editor-category-reset')) {
            const category = target.dataset.category;
            const defaultValue = noteCategories[category].default;
            tempSelections[category] = JSON.parse(JSON.stringify(defaultValue));
            const wrapper = target.closest('.editor-category');
            if (noteCategories[category].type === 'buttons') {
                wrapper.querySelectorAll('.editor-btn').forEach(btn => btn.classList.remove('active'));
            } else if (noteCategories[category].type === 'slider') {
                const slider = wrapper.querySelector('input[type="range"]');
                const output = wrapper.querySelector('output');
                const isChar = category === 'char';
                const sliderValue = isChar ? defaultValue.charCodeAt(0) : defaultValue;
                slider.value = sliderValue;
                output.textContent = defaultValue;
            }
            wrapper.querySelector('.editor-category-summary').textContent = getSummaryText(category);
        }
    });

    contentArea.addEventListener('input', (e) => {
        if (e.target.matches('input[type="range"]')) {
            const wrapper = e.target.closest('.editor-category');
            const category = wrapper.dataset.categoryWrapper;
            const output = wrapper.querySelector('output');
            let value = e.target.value;
            if (category === 'char') {
                const charValue = String.fromCharCode(value);
                output.textContent = charValue;
                tempSelections[category] = charValue;
            } else {
                output.textContent = value;
                tempSelections[category] = parseInt(value, 10);
            }
            wrapper.querySelector('.editor-category-summary').textContent = getSummaryText(category);
        }
    });
}

// --- "공개" API 함수들 (player.js에서 호출할 함수들) ---

export function initialize(player) {
    player.elements.secretNotesHubOverlay = document.createElement('div');
    player.elements.secretNotesHubOverlay.className = 'note-overlay';
    player.elements.secretNotesHubOverlay.onclick = () => hideSecretNotesHub(player);

    const hubModal = document.createElement('div');
    hubModal.className = 'note-modal note-hub-modal';
    hubModal.innerHTML = `
        <div class="note-modal-header">
             <h2 class="note-modal-title">Secret Notes</h2>
             <button class="close-button">&times;</button>
        </div>
        <div class="note-slots-container"></div>
    `;
    hubModal.querySelector('.close-button').onclick = () => hideSecretNotesHub(player);
    hubModal.addEventListener('click', e => e.stopPropagation());
    player.elements.secretNotesHubOverlay.appendChild(hubModal);
    player.elements.area.appendChild(player.elements.secretNotesHubOverlay);

    player.elements.noteEditorOverlay = document.createElement('div');
    player.elements.noteEditorOverlay.className = 'note-overlay';
    player.elements.noteEditorOverlay.onclick = () => hideSecretNoteEditor(player);

    const editorModal = document.createElement('div');
    editorModal.className = 'note-modal note-editor-modal';
    editorModal.addEventListener('click', e => e.stopPropagation());
    player.elements.noteEditorOverlay.appendChild(editorModal);
    player.elements.area.appendChild(player.elements.noteEditorOverlay);
}

export function showHub(player) {
    renderSecretNotesHub(player);
    player.elements.secretNotesHubOverlay.style.display = 'flex';
    window.activeUI = player;
}

export function revealNote(player, noteIndex) {
    const note = player.secretNotes[noteIndex];
    let contentString = `--- Note ${noteIndex + 1} Revealed ---\n\n`;
    
    for (const [key, config] of Object.entries(noteCategories)) {
        const value = note.selections[key];
        const defaultValue = config.default;
        
        // 값이 기본값과 다를 때만 공개 내용에 포함
        if (JSON.stringify(value) !== JSON.stringify(defaultValue)) {
             if (Array.isArray(value) && value.length > 0) {
                 contentString += `${config.label}: ${value.join(', ')}\n`;
             } else if (!Array.isArray(value)) {
                 contentString += `${config.label}: ${value}\n`;
             }
        }
    }
    alert(contentString);
}