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

    menu.classList.add('menu-above');

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
    custom: { label: 'Custom Note', type: 'textarea', default: '' },
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

function renderSecretNoteEditor(player, noteIndex)
{
		const modal = player.elements.noteEditorOverlay.querySelector('.note-editor-modal');
		const note = player.secretNotes[noteIndex];
		let tempSelections = JSON.parse(JSON.stringify(note.selections));

		// ✅ 요약 텍스트 생성 로직 개선 (문자열 타입 처리 추가)
		const getSummaryText = (category) => {
			const selection = tempSelections[category];
			if (Array.isArray(selection)) {
				return selection.length > 0 ? `(${selection.join(', ')})` : '';
			}
			if (typeof selection === 'string' && selection.trim() !== '') {
				// 텍스트가 길 경우 일부만 표시
				const truncated = selection.length > 15 ? selection.substring(0, 15) + '...' : selection;
				return `(${truncated})`;
			}
			return `(${selection})`;
		};

		modal.innerHTML = `
			<div class="note-editor-header">
				<h2 class="note-modal-title">Edit Note ${noteIndex + 1}</h2>
				<div class="note-editor-buttons">
					<button class="note-editor-save btn">Save</button>
					<button class="note-editor-cancel btn">Cancel</button>
				</div>
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
				controlHTML = `<div class="editor-slider-group">
					<span>${config.min}</span>
					<input type="range" min="${config.min}" max="${config.max}" value="${value}">
					<output>${value}</output>
					<span>${config.max}</span>
				</div>`;
			// ✅ 'textarea' 타입 처리 로직 추가
			} else if (config.type === 'textarea') {
				controlHTML = `<textarea class="editor-textarea" placeholder="자유롭게 메모를 입력하세요...">${tempSelections[key]}</textarea>`;
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

		// --- Event Handlers ---
		modal.querySelector('.note-editor-cancel').onclick = () => hideSecretNoteEditor(player);

		modal.querySelector('.note-editor-save').onclick = () => {
			player.secretNotes[noteIndex].selections = tempSelections;
			const isDefault = Object.keys(noteCategories).every(key =>
				JSON.stringify(tempSelections[key]) === JSON.stringify(noteCategories[key].default)
			);
			player.secretNotes[noteIndex].isFilled = !isDefault;
			hideSecretNoteEditor(player);
			renderSecretNotesHub(player);
		};
		
		// --- 이벤트 핸들러 통합 (input과 click) ---
		contentArea.addEventListener('input', (e) => {
			const target = e.target;
			const wrapper = target.closest('.editor-category');
			if (!wrapper) return;
			
			const category = wrapper.dataset.categoryWrapper;

			// ✅ Textarea 입력 처리
			if (target.matches('.editor-textarea')) {
				tempSelections[category] = target.value;
			}
			// ✅ Slider 입력 처리 (기존 로직)
			else if (target.matches('input[type="range"]')) {
				const output = wrapper.querySelector('output');
				output.textContent = target.value;
				tempSelections[category] = parseInt(target.value, 10);
			}
			
			wrapper.querySelector('.editor-category-summary').textContent = getSummaryText(category);
		});

		contentArea.addEventListener('click', (e) => {
			const target = e.target;
			const wrapper = target.closest('.editor-category');
			if (!wrapper) return;

			const category = wrapper.dataset.categoryWrapper;

			// ✅ 버튼 클릭 처리
			if (target.matches('.editor-btn')) {
				const value = target.dataset.value;
				const index = tempSelections[category].indexOf(value);
				if (index > -1) {
					tempSelections[category].splice(index, 1);
				} else {
					tempSelections[category].push(value);
				}
				target.classList.toggle('active');
			}
			// ✅ 리셋 버튼 클릭 처리
			else if (target.matches('.editor-category-reset')) {
				const defaultValue = noteCategories[category].default;
				tempSelections[category] = JSON.parse(JSON.stringify(defaultValue));
				
				// UI 초기화
				if (noteCategories[category].type === 'buttons') {
					wrapper.querySelectorAll('.editor-btn').forEach(btn => btn.classList.remove('active'));
				} else if (noteCategories[category].type === 'slider') {
					wrapper.querySelector('input[type="range"]').value = defaultValue;
					wrapper.querySelector('output').textContent = defaultValue;
				} else if (noteCategories[category].type === 'textarea') {
					wrapper.querySelector('.editor-textarea').value = defaultValue;
				}
			}

			wrapper.querySelector('.editor-category-summary').textContent = getSummaryText(category);
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
    let contentString = ``;
    
    for (const [key, config] of Object.entries(noteCategories)) {
        const value = note.selections[key];
        const defaultValue = config.default;
        
        if (JSON.stringify(value) !== JSON.stringify(defaultValue)) {
             if (Array.isArray(value) && value.length > 0) {
                 contentString += `<li><strong>${config.label}:</strong> ${value.join(', ')}</li>`;
             } else if (!Array.isArray(value)) {
                 contentString += `<li><strong>${config.label}:</strong> ${value}</li>`;
             }
        }
    }

    if (contentString === ``) {
        contentString = '<li>(No specific information was noted.)</li>';
    }

    const revealOverlay = document.createElement('div');
    revealOverlay.className = 'reveal-overlay';
    revealOverlay.innerHTML = `
        <div class="reveal-parchment">
            <div class="parchment-header">Player ${player.id}'s Note</div>
            <ul class="parchment-content">
                ${contentString}
            </ul>
        </div>
    `;

    player.elements.area.appendChild(revealOverlay);

    revealOverlay.addEventListener('click', () => {
        revealOverlay.classList.add('fade-out');
        revealOverlay.addEventListener('transitionend', () => {
            revealOverlay.remove();
        });
    });
}