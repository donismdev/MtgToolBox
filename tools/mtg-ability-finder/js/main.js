window.i18n.initPromise.then(() => {
    // 페이지 기본 유틸
    function version(){ return "1.0.0"; }
    function printVersion(){ console.log(window.i18n.t("toolVersionPrefix") + version()); }
    printVersion();

    let abilityList = document.getElementById("abilityList"),
        abilityInput = document.getElementById("abilityInput"),
        abilityDetails = document.getElementById("abilityDetails"),
        selectedAbility = document.getElementById("selectedAbility"),
        abilityText = document.getElementById("abilityText"),
        scrollableContent = document.getElementById("scrollableContent"),
        lastUpdateText = document.getElementById("lastUpdateText"),
        suggestionBox = document.createElement("ul");

    suggestionBox.id = "customSuggestions";
    suggestionBox.style.position = "absolute";
    suggestionBox.style.display = "none";
    abilityInput.parentNode.style.position = "relative";
    abilityInput.parentNode.appendChild(suggestionBox);

    let abilities = {}; // 병합 데이터(History 제외) - 검색 및 상세보기를 위해 여전히 필요

    // --- ⬇ [신규] 헬퍼 함수 ⬇ ---

    /**
     * 개별 능력 배지(뱃지) 엘리먼트를 생성합니다.
     * @param {string} name - 능력의 이름.
     * @returns {HTMLElement} 배지 엘리먼트.
     */
            function createBadge(name) {
                const chip = document.createElement("div");
                chip.className = "inline-block px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-full cursor-pointer font-semibold whitespace-nowrap text-center shadow-md border border-gray-300 dark:border-gray-600 min-w-[120px] capitalize hover:bg-gray-300 dark:hover:bg-gray-600 hover:scale-105 transition";
                chip.innerText = name;
                chip.onclick = () => showAbility(name);
                return chip;
            }
    /**
     * 카테고리 섹션 전체(헤더 + 배지 컨테이너)를 생성합니다.
     * @param {string} title - 카테고리 제목.
     * @param {object|Array} items - 배지로 만들 아이템 (객체 키 또는 배열 요소).
     * @param {boolean} [isArray=false] - items가 배열인지 여부.
     * @returns {HTMLElement|null} 완성된 섹션 엘리먼트 또는 아이템이 없으면 null.
     */
            function createCategorySection(title, items, isArray = false) {
                const hasItems = items && (isArray ? items.length > 0 : Object.keys(items).length > 0);
                if (!hasItems) {
                    return null;
                }
    
                const section = document.createElement("div");
                section.style.width = "100%";
                
                const header = document.createElement("h3");
                header.className = "text-2xl font-semibold text-gray-800 dark:text-gray-200 mt-6 mb-3 w-full text-left px-4 border-b-2 border-gray-200 dark:border-gray-700 pb-1";
                header.innerText = title;
                section.appendChild(header);
    
                const container = document.createElement("div");
                container.className = "flex flex-wrap gap-2 justify-center p-0 w-full";
                
                const keys = isArray ? items.map(item => item.toLowerCase()) : Object.keys(items);
                keys.sort().forEach(name => {
                    container.appendChild(createBadge(name));
                });
                
                section.appendChild(container);
                return section;
            }
    // --- ⬆ [신규] 헬퍼 함수 ⬆ ---

    // --- ⬇ [수정] 카테고리별 렌더링 함수 ⬇ ---

    function renderAbilityList(){
        abilityList.innerHTML = ""; // 목록 비우기
        
        // mtgData가 로드되었는지 확인
        if (!window.mtgData || !window.mtgData.abilities) {
            console.warn(window.i18n.t("mtgDataNotLoadedWarning"));
            return; 
        }

        const data = window.mtgData;

        // 기본 카테고리 정의
        const categories = [
            { title: window.i18n.t("categoryEvergreen"), data: data.evergreen },
            { title: window.i18n.t("categoryArenaOnly"), data: data.arena },
            { title: window.i18n.t("categoryDeckbuilding"), data: data.deckbuilding },
            { title: window.i18n.t("categorySpecialTokens"), data: data.special_tokens },
            { title: window.i18n.t("categorySpecialCounters"), data: data.special_counters },
            { title: window.i18n.t("categoryRoles"), data: data.roles },
            { title: window.i18n.t("categorySpecial"), data: data.special }
        ];

        // 메인 'abilities' 객체를 타입별로 분리
        const keywordAbilities = {};
        const keywordActions = {};
        const abilityWords = {};

        if (data.abilities) {
            for (const key in data.abilities) {
                const item = data.abilities[key];
                if (item.type === "keywordAbility") {
                    keywordAbilities[key] = item;
                } else if (item.type === "keywordAction") {
                    keywordActions[key] = item;
                } else if (item.type === "abilityWord") {
                    abilityWords[key] = item;
                }
            }
        }
        
        // 분리된 카테고리를 목록의 두 번째 위치에 삽입
        categories.splice(1, 0, 
            { title: window.i18n.t("categoryKeywordAbilities"), data: keywordAbilities },
            { title: window.i18n.t("categoryKeywordActions"), data: keywordActions },
            { title: window.i18n.t("categoryAbilityWords"), data: abilityWords }
        );

        // 모든 카테고리 섹션을 생성하고 추가
        categories.forEach(cat => {
            const section = createCategorySection(cat.title, cat.data, cat.isArray || false);
            if (section) { // null이 아닌(비어있지 않은) 섹션만 추가
                abilityList.appendChild(section);
            }
        });
    }

    // --- ⬇ [이하 함수는 변경 없음] ⬇ ---

    function formatText(text){
        return text.replace(/\{\{([^}]+)\}\}/g, (m, p1) => {
            const key = p1.toLowerCase();
            // 툴팁 조회는 병합된 'abilities' 객체를 사용 (정상)
            const ref = abilities[key] || (mtgData.abilities && mtgData.abilities[key]); 
            return (ref && ref.text)
                ? `<span title="${ref.text}" style="text-decoration: underline dotted; cursor: help;">${p1}</span>`
                : p1;
        });
    }

            function showAbility(name){
                // 상세 보기는 병합된 'abilities' 객체를 사용 (정상)
                let entry = abilities[name]; 
                if(entry === undefined){
                    console.warn(window.i18n.t("noInfoFoundWarningPrefix") + name + window.i18n.t("noInfoFoundWarningSuffix"));
                    return;
                }
                if(typeof entry === "string") entry = { text: entry };
    
                selectedAbility.innerText = name;
    
                let badge = "";
                // 배지 타입 분류는 원본 'mtgData'를 사용 (정상)
                if(mtgData.evergreen?.[name]){
                    badge = `<span class='inline-block px-2 py-1 text-xs font-semibold rounded-md bg-green-100 text-green-800 dark:bg-green-700 dark:text-green-100 ml-2'>${window.i18n.t("badgeEvergreen")}</span>`;
                } else if(mtgData.arena?.[name]){
                    badge = `<span class='inline-block px-2 py-1 text-xs font-semibold rounded-md bg-yellow-100 text-yellow-800 dark:bg-yellow-700 dark:text-yellow-100 ml-2'>${window.i18n.t("badgeArenaOnly")}</span>`;
                } else if(entry.type === "abilityWord"){
                    badge = `<span class='inline-block px-2 py-1 text-xs font-semibold rounded-md bg-blue-100 text-blue-800 dark:bg-blue-700 dark:text-blue-100 ml-2'>${window.i18n.t("badgeAbilityWord")}</span>`;
                } else if(entry.type === "keywordAction"){
                    badge = `<span class='inline-block px-2 py-1 text-xs font-semibold rounded-md bg-sky-100 text-sky-800 dark:bg-sky-700 dark:text-sky-100 ml-2'>${window.i18n.t("badgeKeywordAction")}</span>`;
                } else if(entry.type === "keywordAbility"){
                    badge = `<span class='inline-block px-2 py-1 text-xs font-semibold rounded-md bg-gray-200 text-gray-800 dark:bg-gray-600 dark:text-gray-100 ml-2'>${window.i18n.t("badgeKeywordAbility")}</span>`;
                } else if(entry.type === "deckbuilding"){
                    badge = `<span class='inline-block px-2 py-1 text-xs font-semibold rounded-md bg-gray-800 text-white dark:bg-gray-900 dark:text-gray-200 ml-2'>${window.i18n.t("badgeDeckbuilding")}</span>`;
                } else if(entry.type === "role"){
                    badge = `<span class='inline-block px-2 py-1 text-xs font-semibold rounded-md bg-gray-800 text-white dark:bg-gray-900 dark:text-gray-200 ml-2'>${window.i18n.t("badgeRole")}</span>`;
                } else if(mtgData.special?.[name]){
                    badge = `<span class='inline-block px-2 py-1 text-xs font-semibold rounded-md bg-gray-800 text-white dark:bg-gray-900 dark:text-gray-200 ml-2'>${window.i18n.t("badgeSpecial")}</span>`;
                } else if(mtgData.special_counters?.[name]){
                    badge = `<span class='inline-block px-2 py-1 text-xs font-semibold rounded-md bg-red-100 text-red-800 dark:bg-red-700 dark:text-red-100 ml-2'>${window.i18n.t("badgeSpecialCounter")}</span>`;
                } else if(mtgData.special_tokens?.[name]){
                    badge = `<span class='inline-block px-2 py-1 text-xs font-semibold rounded-md bg-blue-100 text-blue-800 dark:bg-blue-700 dark:text-blue-100 ml-2'>${window.i18n.t("badgeSpecialToken")}</span>`;
                }
    
                const img = entry.image ? `<br><img src="${entry.image}" style="max-width: 200px; margin-top: 1rem;" />` : "";
                abilityText.innerHTML = formatText(`<p>${entry.text}</p>`) + badge + img;
    
                abilityList.style.display = "none";
                abilityDetails.style.display = "block";
                suggestionBox.style.display = "none";
                scrollableContent.scrollTop = 0;
            }
    function resetView(){
        abilityInput.value = "";
        abilityDetails.style.display = "none";
        abilityList.style.display = "flex";
        suggestionBox.style.display = "none";
        scrollableContent.scrollTop = 0;
    }

    function adjustContentHeight(){
        if(window.visualViewport){
            const headerH = document.getElementById("searchSection").offsetHeight;
            const h = window.visualViewport.height - headerH;
            scrollableContent.style.height = Math.max(0, h) + "px";
            if(document.activeElement === abilityInput){
                setTimeout(() => {
                    abilityInput.scrollIntoView({behavior:"smooth", block:"start", inline:"nearest"});
                }, 50);
            }
        }else{
            console.warn("Visual Viewport API not supported. Dynamic height adjustment may not work.");
        }
    }

    function positionSuggestionBox(){
        const a = abilityInput.getBoundingClientRect();
        const p = abilityInput.parentElement.getBoundingClientRect();
        const top = a.bottom - p.top;
        suggestionBox.style.top = top + "px";
        suggestionBox.style.left = "0px";
        suggestionBox.style.right = "0px"; 
        suggestionBox.style.width = "100%";
    }

            function filterAbilities(){
                const q = abilityInput.value.toLowerCase();
                suggestionBox.innerHTML = "";
    
                if(q === ""){
                    suggestionBox.style.display = "none";
                    return;
                }
    
                // 검색은 병합된 'abilities' 객체를 사용 (정상)
                const matches = Object.keys(abilities).filter(n => n.toLowerCase().startsWith(q));
                const exact = matches.find(n => n.toLowerCase() === q);
    
                if(exact && matches.length === 1){
                    showAbility(exact);
                    suggestionBox.style.display = "none";
                    return;
                }
    
                matches.forEach(n => {
                    const li = document.createElement("li");
                    li.className = "block bg-gray-200 dark:bg-gray-700 rounded-md p-3 my-1 cursor-pointer font-medium whitespace-nowrap text-left shadow-sm border border-gray-300 dark:border-gray-600 transition hover:bg-blue-500 hover:text-white dark:hover:bg-blue-600";
                    li.innerText = n;
                    li.onclick = () => {
                        abilityInput.value = n;
                        showAbility(n);
                        suggestionBox.style.display = "none";
                    };
                    suggestionBox.appendChild(li);
                });
                positionSuggestionBox();
                suggestionBox.style.display = "block";
            }
    window.mtgData = {};
    fetch("./assets/ability_data.json")
        .then(r => r.json())
        .then(data => {
            window.mtgData = data; // 원본 데이터 저장 (카테고리 렌더링용)

            lastUpdateText.textContent = (data.meta && data.meta.version) ? data.meta.version : window.i18n.t("lastUpdatedDefault");

            // (중요) 검색과 상세보기를 위한 데이터 병합 로직은 그대로 유지
            const merged = {
                ...data.abilities,
                ...data.evergreen,
                ...data.arena,
                ...data.special,
                ...data.special_counters,
                ...data.special_tokens
            };

            if(data.deckbuilding){
                for(const k of Object.keys(data.deckbuilding)){
                    const key = k.toLowerCase();
                    merged[key] = {
                        text: data.deckbuilding[k],
                        type: "deckbuilding",
                        image: null
                    };
                }
            }

            if (data.roles && typeof data.roles === "object" && !Array.isArray(data.roles)) {
                for (const [k, v] of Object.entries(data.roles)) {
                    const key = k.toLowerCase();
                    const text = (typeof v === "string") ? v : (v?.text || "");
                    const image = (typeof v === "object" && v) ? (v.image ?? null) : null;

                    merged[key] = {
                        text: text,
                        type: "role",
                        image: image
                    };
                }
            }

            abilities = merged; // 검색/조회용 병합 데이터 설정
            
            // [수정] 카테고리 목록 렌더링 함수 호출
            renderAbilityList(); 
            
            adjustContentHeight();
        });

    if(window.visualViewport){
        window.visualViewport.addEventListener("resize", adjustContentHeight);
        window.visualViewport.addEventListener("scroll", adjustContentHeight);
    }else{
        window.addEventListener("resize", adjustContentHeight);
    }
    document.addEventListener("DOMContentLoaded", adjustContentHeight);

    abilityInput.addEventListener("keydown", function(e){
        const items = suggestionBox.querySelectorAll("li");
        let idx = Array.from(items).findIndex(el => el.classList.contains("selected"));

        if(e.key === "ArrowDown"){
            if(items.length > 0){
                e.preventDefault();
                if(idx >= 0) items[idx].classList.remove("selected");
                idx = (idx + 1) % items.length;
                items[idx].classList.add("selected");
                items[idx].scrollIntoView({behavior:"smooth", block:"nearest"});
            }
        }else if(e.key === "ArrowUp"){
            if(items.length > 0){
                e.preventDefault();
                if(idx >= 0) items[idx].classList.remove("selected");
                idx = (idx - 1 + items.length) % items.length;
                items[idx].classList.add("selected");
                items[idx].scrollIntoView({behavior:"smooth", block:"nearest"});
            }
        }else if(e.key === "Enter"){
            if(idx >= 0){
                e.preventDefault();
                items[idx].click();
            }else{
                const q = abilityInput.value.toLowerCase();
                // Enter키 조회는 병합된 'abilities' 객체 사용 (정상)
                const exact = Object.keys(abilities).filter(n => n.toLowerCase() === q);
                if(exact.length === 1){
                    showAbility(exact[0]);
                    suggestionBox.style.display = "none";
                }
            }
        }
    });
});
