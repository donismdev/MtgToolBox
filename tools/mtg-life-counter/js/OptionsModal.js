export class OptionsModal {
    constructor(player) {
        this.player = player;
        this.elements = {}; // 모달 내부 요소들을 저장
        this.createDOM();
    }

    createDOM() {
        this.elements.optionsModalOverlay = document.createElement('div');
        this.elements.optionsModalOverlay.className = 'player-options-overlay';
        
        const modal = document.createElement('div');
        modal.className = 'player-options-modal';
        modal.addEventListener('pointerdown', e => e.stopPropagation());

        const modalHeader = document.createElement('div');
        modalHeader.className = 'modal-header-fixed';
        
        const playerIdNumber = this.player.id.split('-')[1];
        modalHeader.innerHTML = `<h2 class="modal-title-fixed">Options (P${playerIdNumber})</h2>`;
        
        const closeButtonText = document.createElement('button');
        closeButtonText.className = 'close-button-text';
        closeButtonText.textContent = 'Close';
        closeButtonText.onclick = () => this.hide();
        modalHeader.appendChild(closeButtonText);

        const tabContainer = document.createElement('div');
        tabContainer.className = 'options-tab-container';

        const counterTabBtn = document.createElement('button');
        counterTabBtn.className = 'options-tab-button';
        counterTabBtn.textContent = 'Counters';

        const buttonsTabBtn = document.createElement('button');
        buttonsTabBtn.className = 'options-tab-button active';
        buttonsTabBtn.textContent = `Buttons`;

        const modalContentWrapper = document.createElement('div');
        modalContentWrapper.className = 'modal-content-scrollable';
        
        const contentContainer = document.createElement('div');
        contentContainer.className = 'options-content-container';
        
        const counterContent = document.createElement('div');
        counterContent.className = 'options-tab-content';
        this.elements.counterSettingsList = document.createElement('ul');
        this.elements.counterSettingsList.className = 'button-settings-list';
        counterContent.appendChild(this.elements.counterSettingsList);

        const buttonsContent = document.createElement('div');
        buttonsContent.className = 'options-tab-content active';
        this.elements.buttonSettingsList = document.createElement('ul');
        this.elements.buttonSettingsList.className = 'button-settings-list';
        buttonsContent.appendChild(this.elements.buttonSettingsList);
        
        counterTabBtn.onclick = () => {
            counterTabBtn.classList.add('active');
            buttonsTabBtn.classList.remove('active');
            counterContent.classList.add('active');
            buttonsContent.classList.remove('active');
        };
        buttonsTabBtn.onclick = () => {
            buttonsTabBtn.classList.add('active');
            counterTabBtn.classList.remove('active');
            buttonsContent.classList.add('active');
            counterContent.classList.remove('active');
        };

        tabContainer.append(buttonsTabBtn, counterTabBtn);
        contentContainer.append(counterContent, buttonsContent);

        modalContentWrapper.append(tabContainer, contentContainer);
        modal.append(modalHeader, modalContentWrapper);
        
        this.elements.optionsModalOverlay.appendChild(modal);

        this.elements.optionsModalOverlay.addEventListener('click', (e) => {
            if (e.target === this.elements.optionsModalOverlay) {
                this.hide();
            }
        });

        this.renderCounterSettingsList();
        this.renderButtonSettingsList();

        this.setupDragAndDrop(this.elements.counterSettingsList, this.player.counterSettings);
        this.setupDragAndDrop(this.elements.buttonSettingsList, this.player.buttonSettings);
    }

    renderCounterSettingsList() {
    const list = this.elements.counterSettingsList;
    list.innerHTML = '';

    this.player.counterSettings.forEach(setting => {
        const item = document.createElement('li');
        item.className = 'counter-item';
        item.dataset.id = setting.id;
        item.draggable = true;

        // --- 기존 요소들 (변경 없음) ---
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'counter-item-checkbox';
        checkbox.checked = setting.enabled;
        checkbox.id = `${this.player.id}-counter-check-${setting.id}`;
        checkbox.onchange = () => {
            const totalEnabled = this.player.counterSettings.filter(s => s.enabled).length +
                                 this.player.buttonSettings.filter(s => s.enabled && s.id !== 'initiative' && s.id !== 'monarch').length;
            if (checkbox.checked && totalEnabled >= 4) {
                alert('일반 버튼과 카운터는 최대 4개까지만 선택할 수 있습니다.');
                checkbox.checked = false;
                return;
            }
            setting.enabled = checkbox.checked;
            this.player.rebuildPlayerButtons();
        };

        const dragHandle = document.createElement('span');
        dragHandle.className = 'drag-handle';
        dragHandle.innerHTML = '&#x2630;';

        const btnDecrease = document.createElement('button');
        btnDecrease.className = 'counter-change-btn';
        btnDecrease.textContent = '<';
        btnDecrease.onclick = () => this.player.updateCounterValue(setting, 'decrement');

        const iconArea = document.createElement('div');
        iconArea.className = 'counter-icon-area';
        iconArea.style.backgroundImage = `url(./assets/board_icon/${setting.imageName}.png)`;

        const countText = document.createElement('span');
        countText.className = 'counter-icon-count';
        countText.textContent = setting.count;

        const labelText = document.createElement('span');
        labelText.className = 'counter-icon-label';
        labelText.textContent = setting.label;
        
        iconArea.append(countText, labelText);

        const btnIncrease = document.createElement('button');
        btnIncrease.className = 'counter-change-btn';
        btnIncrease.textContent = '>';
        btnIncrease.onclick = () => this.player.updateCounterValue(setting, 'increment');
        
        const btnSetLabel = document.createElement('button');
        btnSetLabel.className = 'counter-label-btn';
        btnSetLabel.textContent = 'Aa';
        btnSetLabel.onclick = () => {
            const newLabel = prompt('이 카운터의 라벨을 입력하세요:', setting.label);
            if (newLabel !== null) {
                setting.label = newLabel.trim();
                this.player.updateCounterValue(setting); // 라벨만 업데이트
            }
        };
        
        // --- [신규] 분할 화면 제어를 위한 오른쪽 체크박스 ---
        const splitViewCheckbox = document.createElement('input');
        splitViewCheckbox.type = 'checkbox';
        splitViewCheckbox.title = '분할 화면에 표시/숨기기'; // 마우스를 올렸을 때 툴팁 표시
        splitViewCheckbox.className = 'split-view-checkbox'; // CSS 스타일링을 위한 클래스
        
        // 현재 카운터가 분할 화면 목록에 포함되어 있는지 확인하여 checked 상태 결정
        splitViewCheckbox.checked = this.player.splitViewCounters.includes(setting.id);

        // 4개 제한 로직: 이미 4개가 찼고, 현재 항목이 선택되지 않았다면 비활성화
        if (this.player.splitViewCounters.length >= 4 && !splitViewCheckbox.checked) {
            splitViewCheckbox.disabled = true;
        }

        // 체크박스 상태 변경 시 Player의 메서드 호출
        splitViewCheckbox.onchange = (e) => {

			console.log("Split view checkbox changed:", e.target.checked);
            // Player의 핵심 로직을 호출하여 상태 변경 및 뷰 전환
            this.player.toggleCounterForSplitView(setting.id, e.target.checked);
            
            // 다른 체크박스들의 활성화/비활성화 상태를 즉시 갱신하기 위해 목록을 다시 렌더링
            this.renderCounterSettingsList();
        };

        // --- 최종적으로 모든 요소를 li에 추가 ---
        // 순서: 왼쪽 체크박스, 드래그 핸들, 감소, 아이콘, 증가, 라벨설정, [신규]오른쪽 체크박스
        item.append(checkbox, dragHandle, btnDecrease, iconArea, btnIncrease, btnSetLabel, splitViewCheckbox);
        list.appendChild(item);
    });
}

    renderButtonSettingsList() {
        const list = this.elements.buttonSettingsList;
        list.innerHTML = '';

        this.player.buttonSettings.forEach(setting => {
            const item = document.createElement('li');
            item.className = 'button-setting-item';
            item.dataset.id = setting.id;
            item.draggable = true;

            const dragHandle = document.createElement('span');
            dragHandle.className = 'drag-handle';
            dragHandle.innerHTML = '&#x2630;';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = setting.enabled;
            checkbox.id = `${this.player.id}-btn-check-${setting.id}`;
            checkbox.onchange = () => {
                if (setting.id !== 'initiative' && setting.id !== 'monarch') {
                    const enabledCounters = this.player.counterSettings.filter(s => s.enabled).length;
                    const enabledNormalButtons = this.player.buttonSettings.filter(s => s.enabled && s.id !== 'initiative' && s.id !== 'monarch').length;
                    const totalNormalEnabled = enabledCounters + enabledNormalButtons;

                    if (checkbox.checked && totalNormalEnabled >= 4) {
                        alert('일반 버튼과 카운터는 최대 4개까지만 선택할 수 있습니다.');
                        checkbox.checked = false;
                        return;
                    }
                }

                setting.enabled = checkbox.checked;
                this.player.rebuildPlayerButtons();
            };

            const labelButton = document.createElement('button');
            labelButton.className = 'label-button';
            labelButton.textContent = setting.label;
            labelButton.onclick = () => {
                this.hide();
                this.player.executeButtonAction(setting.id);
            };

            item.append(dragHandle, checkbox, labelButton);
            list.appendChild(item);
        });

        this.setupDragAndDrop(list, this.player.buttonSettings);
    }

    setupDragAndDrop(list, settingsArray) {
        let draggedItem = null;

        list.addEventListener('dragstart', (e) => {
            draggedItem = e.target.closest('.button-setting-item');
            if (draggedItem) {
                setTimeout(() => draggedItem.classList.add('dragging'), 0);
            }
        });

        list.addEventListener('dragend', () => {
            if (draggedItem) {
                draggedItem.classList.remove('dragging');
                draggedItem = null;
            }
        });

        list.addEventListener('dragover', (e) => {
            e.preventDefault();
            const afterElement = this.getDragAfterElement(list, e.clientY);
            if (draggedItem) {
                if (afterElement == null) {
                    list.appendChild(draggedItem);
                } else {
                    list.insertBefore(draggedItem, afterElement);
                }
            }
        });

        list.addEventListener('drop', (e) => {
            e.preventDefault();
            if (!draggedItem) return;

            const newOrderIds = [...list.querySelectorAll('.button-setting-item')].map(item => item.dataset.id);
            
            settingsArray.sort((a, b) => newOrderIds.indexOf(a.id) - newOrderIds.indexOf(b.id));
            
            this.player.rebuildPlayerButtons();
        });
    }

    getDragAfterElement(container, y) {
        const draggableElements = [...container.querySelectorAll('.button-setting-item:not(.dragging)')];
        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            if (offset < 0 && offset > closest.offset) {    
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }

    show() {
        this.renderButtonSettingsList();
        this.renderCounterSettingsList();
        this.elements.optionsModalOverlay.style.display = 'flex';
        window.activeUI = this.player;
    }

    hide() {
        this.elements.optionsModalOverlay.style.display = 'none';
        window.activeUI = null;
    }
}
