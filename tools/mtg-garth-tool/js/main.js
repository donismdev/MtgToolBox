window.i18n.initPromise.then(() => {
		/* 필수: 버전 로깅 */
		function version(){ return "1.0.0"; }
		function printVersion(){ console.log(window.i18n.t("toolVersionPrefix") + version()); }
		printVersion();

		/* 이미지 매핑 (경로는 필요한 대로 수정) */
		const CARD_IMAGES = {
			"Disenchant": "assets/disenchant.jpg",
			"Braingeyser": "assets/braingeyser.jpg",
			"Terror": "assets/terror.jpg",
			"Shivan Dragon": "assets/shivan-dragon.jpg",
			"Regrowth": "assets/regrowth.jpg",
			"Black Lotus": "assets/black-lotus.jpg"
		};

		const CARD_NAMES = [
			"Disenchant",
			"Braingeyser",
			"Terror",
			"Shivan Dragon",
			"Regrowth",
			"Black Lotus"
		];

		const chosen = new Set();
		const grid = document.getElementById("cardGrid");
		const resetBtn = document.getElementById("resetBtn");

		/* 라이트박스 */
		const lightbox = document.getElementById('lightbox');
		const lbImg = lightbox.querySelector('img');
		const lbClose = lightbox.querySelector('.close-btn');

		function openLightbox(src){
			lbImg.src = src || "";
			lightbox.classList.add('flex');
            lightbox.classList.remove('hidden');
			lightbox.setAttribute('aria-hidden', 'false');
		}
		function closeLightbox(){
			lightbox.classList.remove('flex');
            lightbox.classList.add('hidden');
			lightbox.setAttribute('aria-hidden', 'true');
			lbImg.src = "";
		}
		lightbox.addEventListener('click', e=>{
			if(e.target === lightbox || e.target === lbClose){ closeLightbox(); }
		}, { passive:true });
		document.addEventListener('keydown', e=>{
			if(e.key === 'Escape'){ closeLightbox(); }
		});

		/* 헤더의 View 버튼: Garth 원본 이미지 전체화면 */
		document.getElementById('viewGarthBtn').addEventListener('click', ()=>{
			openLightbox('./assets/garth-one-eye.jpg');
		});

		/* 유틸 */
		function el(tag, cls, text){
			const e = document.createElement(tag);
			if(cls) e.className = cls;
			if(text != null) e.textContent = text;
			return e;
		}
		function showCardImage(cardName){
			const src = CARD_IMAGES[cardName];
			if(!src){ alert(window.i18n.t("noImageMapping") + cardName); return; }
			openLightbox(src);
		}

		/* 카드 행 만들기 */
		function makeRow(cardName){
			const row = el("div", "flex items-center gap-2 bg-transparent rounded-2xl p-1");

			const mainBtn = el("button", "flex-auto inline-flex items-center justify-between gap-3 p-3 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-700 dark:text-gray-300 cursor-pointer select-none transition active:translate-y-px hover:bg-gray-200 dark:hover:bg-gray-600");
			mainBtn.dataset.state = chosen.has(cardName) ? "chosen" : "idle";
			mainBtn.title = window.i18n.t("selectCardTitle");
			mainBtn.addEventListener("click", () => {
				if(chosen.has(cardName)){ return; }
				chosen.add(cardName);
				mainBtn.dataset.state = "chosen";
			});

			const nameSpan = el("span", "font-semibold tracking-wide", cardName);
			const dot = el("span", "w-3 h-3 rounded-full bg-gray-400 dark:bg-gray-500 flex-shrink-0 shadow-inner");
			mainBtn.appendChild(nameSpan);
			mainBtn.appendChild(dot);
            
            const style = document.createElement('style');
            style.innerHTML = `
                [data-state="chosen"] { 
                    background-color: #1c3d2e !important;
                    border-color: #38533f !important;
                    color: #e8ffe8 !important;
                    cursor: not-allowed !important;
                }
                [data-state="chosen"] .dot {
                    background-color: #30d158 !important;
                }
            `;
            mainBtn.appendChild(style);


			const viewBtn = el("button", "view-btn flex-shrink-0 px-3 py-2 rounded-xl bg-gray-200 dark:bg-gray-600 border border-gray-300 dark:border-gray-700 text-blue-700 dark:text-blue-300 cursor-pointer hover:brightness-110 active:translate-y-px", window.i18n.t("viewButton"));
			viewBtn.title = window.i18n.t("fullscreenImageTitle");
			viewBtn.addEventListener("click", () => showCardImage(cardName));

			row.appendChild(mainBtn);
			row.appendChild(viewBtn);
			return row;
		}

		function render(){
			grid.innerHTML = "";
			CARD_NAMES.forEach((name) => grid.appendChild(makeRow(name)));
		}

		/* Reset: 선택 상태만 초기화 (View 상태는 유지할 필요 없음) */
		resetBtn.addEventListener("click", () => {
			chosen.clear();
			grid.querySelectorAll(".card-name-btn").forEach(btn => btn.dataset.state = "idle");
		});

		render();

		/* 임베디드/모달 훅 */
		window.onModalOpen = () => {};
		window.onEmbeddedOpen = () => {};
});
