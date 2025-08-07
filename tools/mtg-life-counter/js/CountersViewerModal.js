export class CountersViewerModal {
    constructor(player) {
        this.player = player;
        this.elements = {};
        this.createDOM();
    }

    createDOM() {
        this.elements.countersViewerOverlay = document.createElement('div');
        this.elements.countersViewerOverlay.className = 'counters-viewer-overlay';

        const modal = document.createElement('div');
        modal.className = 'counters-viewer-modal';
        modal.addEventListener('pointerdown', e => e.stopPropagation());

        const modalHeader = document.createElement('div');
        modalHeader.className = 'modal-header-fixed';
        modalHeader.innerHTML = `<h2 class="modal-title-fixed">Counters</h2>`;

        const closeButtonText = document.createElement('button');
        closeButtonText.className = 'close-button-text';
        closeButtonText.textContent = 'Close';
        closeButtonText.onclick = () => this.hide();
        modalHeader.appendChild(closeButtonText);

        const scrollContainer = document.createElement('div');
        scrollContainer.className = 'modal-content-scrollable';

        const listContainer = document.createElement('ul');
        listContainer.className = 'counters-list';
        this.elements.countersList = listContainer;

        scrollContainer.appendChild(listContainer);

        modal.append(modalHeader, scrollContainer);
        this.elements.countersViewerOverlay.appendChild(modal);

        this.elements.countersViewerOverlay.addEventListener('click', (e) => {
            if (e.target === this.elements.countersViewerOverlay) {
                this.hide();
            }
        });
    }

    renderCountersViewer() {
        const list = this.elements.countersList;
        list.innerHTML = '';

        this.player.genericCounters.forEach(setting => {
            const item = document.createElement('li');
            item.className = 'counter-item';
            item.dataset.id = setting.id;
            item.draggable = true;

            const dragHandle = document.createElement('span');
            dragHandle.className = 'drag-handle';
            dragHandle.innerHTML = '&#x2630;';

            const btnDecrease = document.createElement('button');
            btnDecrease.className = 'counter-change-btn';
            btnDecrease.textContent = '<';
            btnDecrease.onclick = () => {
                setting.count--;
                this.renderCountersViewer();
            };

            const iconArea = document.createElement('div');
            iconArea.className = 'counter-icon-area';
            iconArea.style.backgroundImage = `url(./assets/counter/${setting.imageName}.png)`;

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
            btnIncrease.onclick = () => {
                setting.count++;
                this.renderCountersViewer();
            };
            
            const btnSetLabel = document.createElement('button');
            btnSetLabel.className = 'counter-label-btn';
            btnSetLabel.textContent = 'Aa';
            btnSetLabel.onclick = () => {
                const newLabel = prompt('이 카운터의 라벨을 입력하세요:', setting.label);
                if (newLabel !== null) {
                    setting.label = newLabel.trim();
                    this.renderCountersViewer();
                }
            };

            item.append(dragHandle, btnDecrease, iconArea, btnIncrease, btnSetLabel);
            list.appendChild(item);
        });
        
        this.setupDragAndDrop(list, this.player.genericCounters);
    }

    setupDragAndDrop(list, settingsArray) {
        let draggedItem = null;

        list.addEventListener('dragstart', (e) => {
            draggedItem = e.target.closest('.counter-item');
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

            const newOrderIds = [...list.querySelectorAll('.counter-item')].map(item => item.dataset.id);
            
            settingsArray.sort((a, b) => newOrderIds.indexOf(a.id) - newOrderIds.indexOf(b.id));
            
            // 카운터 뷰어는 별도의 rebuildPlayerButtons가 필요 없으므로 UI만 다시 렌더링
            this.renderCountersViewer();
        });
    }

    getDragAfterElement(container, y) {
        const draggableElements = [...container.querySelectorAll('.counter-item:not(.dragging)')];
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
        this.renderCountersViewer();
        this.elements.countersViewerOverlay.style.display = 'flex';
        this.player.elements.area.appendChild(this.elements.countersViewerOverlay); // 플레이어 영역에 추가
        window.activeUI = this.player; // 플레이어 UI 활성화 상태 유지
    }

    hide() {
        this.elements.countersViewerOverlay.style.display = 'none';
        window.activeUI = null;
    }
}
