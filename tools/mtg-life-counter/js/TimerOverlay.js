export class TimerOverlay {
    constructor(player) {
        this.player = player;
        this.elements = {};
        this.createDOM();
    }

    /**
     * 모달에 필요한 모든 DOM 요소를 생성하고 이벤트 리스너를 설정합니다.
     * CountersViewerModal의 CSS 클래스를 재사용하여 디자인 일관성을 유지합니다.
     */
    createDOM() {
        // 1. 오버레이와 모달 기본 틀 생성 (CountersViewer와 동일한 클래스 사용)
        this.elements.overlay = document.createElement('div');
        this.elements.overlay.className = 'counters-viewer-overlay';

        const modal = document.createElement('div');
        modal.className = 'counters-viewer-modal timer-modal-compact';
        modal.addEventListener('pointerdown', e => e.stopPropagation());

        // 2. 고정 헤더 생성
        const modalHeader = document.createElement('div');
        modalHeader.className = 'modal-header-fixed';
        modalHeader.innerHTML = `<h2 class="modal-title-fixed">타이머 설정</h2>`;

        const closeButton = document.createElement('button');
        closeButton.className = 'close-button-text';
        closeButton.textContent = '닫기';
        closeButton.onclick = () => this.hide();
        modalHeader.appendChild(closeButton);

        // 3. 스크롤 가능한 콘텐츠 영역
        const scrollContainer = document.createElement('div');
        scrollContainer.className = 'modal-content-scrollable';

        // 4. 타이머 설정 폼
        const form = document.createElement('div');
        form.className = 'timer-form'; // 타이머 전용 스타일을 위한 클래스

        const inputRow = document.createElement('div');
        inputRow.className = 'timer-input-row';

        const minInput = document.createElement('input');
        minInput.type = 'number';
        minInput.min = '0';
        minInput.value = '50'; // 기본 50분
        minInput.placeholder = '분';

        const secInput = document.createElement('input');
        secInput.type = 'number';
        secInput.min = '0';
        secInput.max = '59';
        secInput.value = '0';
        secInput.placeholder = '초';

        // "분", "초" 텍스트 레이블 추가
        const minLabel = document.createElement('span');
        minLabel.textContent = '분';
        const secLabel = document.createElement('span');
        secLabel.textContent = '초';

        inputRow.append(minInput, minLabel, secInput, secLabel);

        // 5. 액션 버튼 (취소, 시작)
        const buttonRow = document.createElement('div');
        buttonRow.className = 'timer-button-row';

        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'modal-btn-secondary';
        cancelBtn.textContent = '취소';
        cancelBtn.onclick = () => this.hide();

        const startBtn = document.createElement('button');
        startBtn.className = 'modal-btn-primary';
        startBtn.textContent = '시작';
        startBtn.onclick = () => {
            const mins = parseInt(minInput.value || '0', 10);
            const secs = parseInt(secInput.value || '0', 10);
            const totalMs = Math.max(0, (mins * 60 + secs) * 1000);
            
            // player 객체에 startTimer 함수가 있는지 확인 후 호출
            if (this.player && typeof this.player.startTimer === 'function') {
                this.player.startTimer(totalMs);
            }
            this.hide();
        };

        buttonRow.append(cancelBtn, startBtn);
        form.append(inputRow, buttonRow);
        scrollContainer.appendChild(form);
        modal.append(modalHeader, scrollContainer);
        this.elements.overlay.appendChild(modal);

        // 오버레이 클릭 시 모달 닫기
        this.elements.overlay.addEventListener('click', (e) => {
            if (e.target === this.elements.overlay) {
                this.hide();
            }
        });
    }

    /**
     * 모달을 화면에 표시합니다.
     * key point: document.body가 아닌 player.elements.area에 추가합니다.
     */
    show() {
        // 이미 생성된 DOM을 숨기고 보여주기만 하므로, show 호출 시점에 append 합니다.
        if (!this.elements.overlay.parentNode) {
            this.player.elements.area.appendChild(this.elements.overlay);
        }
        this.elements.overlay.style.display = 'flex';
        window.activeUI = this.player; // 다른 UI와의 상호작용을 위해 활성 UI로 설정
    }

    /**
     * 모달을 화면에서 숨깁니다.
     * DOM에서 제거하는 대신 display 속성만 변경하여 성능 이점을 가집니다.
     */
    hide() {
        if (this.elements.overlay) {
            this.elements.overlay.style.display = 'none';
        }
        window.activeUI = null;
    }
}