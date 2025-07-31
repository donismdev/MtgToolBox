
function showToast(msg) {
    const toast = document.getElementById("toastBox");
    toast.textContent = msg;
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 3000);
}

document.getElementById("filterForm").addEventListener("submit", async function (e) {
    e.preventDefault();

    if (!document.getElementById("wifiConfirm").checked) {
        showToast("데이터 사용 동의가 필요합니다. Wi-Fi 연결을 권장합니다.");
        return;
    }

    const cardResultDiv = document.getElementById("cardResult");
    cardResultDiv.innerHTML = '<div class="loader"></div>';
    cardResultDiv.querySelector('.loader').style.display = 'block';

    let query = [];
    const form = e.target;

    const typeList = Array.from(form.querySelectorAll("input[name='type']:checked")).map(cb => cb.value);
    if (typeList.length) query.push(`(${typeList.map(t => `type:${t}`).join(" or ")})`);

    const colorList = Array.from(form.querySelectorAll("input[name='color']:checked")).map(cb => cb.value);
    if (colorList.length) query.push(`color>=${colorList.join("")}`);

    const rarityList = Array.from(form.querySelectorAll("input[name='rarity']:checked")).map(cb => cb.value);
    if (rarityList.length) query.push(`(${rarityList.map(r => `rarity:${r}`).join(" or ")})`);

    if (form.querySelector("#legendaryOnly").checked) query.push("is:legendary");
    if (form.querySelector("#excludeBasic").checked) query.push("-type:basic");

    const cmcRaw = form.querySelector("#cmcValue").value.trim();
    if (cmcRaw !== "") {
        const cmcOp = form.querySelector("#cmcOperator").value;
        query.push(`cmc${cmcOp}${cmcRaw}`);
    }

    const finalQuery = query.length ? `?q=${encodeURIComponent(query.join(" "))}` : "";
    const apiURL = `https://api.scryfall.com/cards/random${finalQuery}`;

    try {
        const res = await fetch(apiURL);
        if (!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.details || `HTTP error! Status: ${res.status}`);
        }
        const card = await res.json();

        let imgURL = card.image_uris?.normal || (card.card_faces ? card.card_faces[0].image_uris.normal : "");

        if (!imgURL) {
            throw new Error("No image available for this card.");
        }

        let summary = [];
        if (typeList.length) summary.push(`<strong>Types:</strong> ${typeList.join(", ")}`);
        if (colorList.length) summary.push(`<strong>Colors:</strong> ${colorList.join(", ")}`);
        if (rarityList.length) summary.push(`<strong>Rarity:</strong> ${rarityList.join(", ")}`);
        if (form.querySelector("#legendaryOnly").checked) summary.push("<strong>Legendary Only</strong>");
        if (form.querySelector("#excludeBasic").checked) summary.push("<strong>Exclude Basic Lands</strong>");
        if (cmcRaw !== "") summary.push(`<strong>CMC:</strong> ${form.querySelector("#cmcOperator").value} ${cmcRaw}`);

        const img = new Image();
        img.src = imgURL;
        img.className = "card-img";
        img.alt = card.name;

        img.onload = () => {
            let html = `<h3>${card.name}</h3>`;
            html += `<div class="card-container">${img.outerHTML}</div>`;

            if (summary.length > 0) {
                html += `<div class="filter-summary">${summary.join("<br>")}</div>`;
            }

            cardResultDiv.innerHTML = html;
            // Add loaded class after a short delay to trigger transition
            setTimeout(() => {
                cardResultDiv.querySelector('.card-img').classList.add('loaded');
            }, 50);

            document.querySelector('.container').scrollIntoView({ behavior: 'smooth', block: 'start' });
        };

        img.onerror = () => {
            throw new Error("Failed to load card image.");
        }

    } catch (err) {
        cardResultDiv.innerHTML = `<p style="color: #ff5555;">Error: ${err.message}</p>`;
        console.error(err);
    }
});

window.addEventListener("DOMContentLoaded", () => {
	const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
	if (!isMobile) {
		const wifiCheckbox = document.getElementById("wifiConfirm");
		if (wifiCheckbox) {
			wifiCheckbox.checked = true;
		}
	}
});
