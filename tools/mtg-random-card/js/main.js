function showToast(msg) {
	const toast = document.getElementById("toastBox");
	toast.textContent = msg;
	toast.classList.add("show");
	setTimeout(() => toast.classList.remove("show"), 3000);
}

document.getElementById("filterForm").addEventListener("submit", async function (e) {
	e.preventDefault();

	if (document.getElementById("wifiConfirm")?.checked !== true) {
		showToast("데이터 사용 동의가 필요합니다. Wi-Fi 연결을 권장합니다.");
		return;
	}

	const cardResultDiv = document.getElementById("cardResult");
	cardResultDiv.innerHTML = '<div class="loader"></div>';
	cardResultDiv.querySelector('.loader').style.display = 'block';

	const form = e.target;
	const query = [];

	// Types
	const typeList = Array.from(form.querySelectorAll("input[name='type']:checked")).map(cb => cb.value);
	if (typeList.length > 0) {
		query.push(`(${typeList.map(t => `type:${t}`).join(" or ")})`);
	}

	// Colors
	const colorList = Array.from(form.querySelectorAll("input[name='color']:checked")).map(cb => cb.value);
	if (colorList.length > 0) {
		query.push(`color>=${colorList.join("")}`);
	}

	// Rarity
	const rarityList = Array.from(form.querySelectorAll("input[name='rarity']:checked")).map(cb => cb.value);
	if (rarityList.length > 0) {
		query.push(`(${rarityList.map(r => `rarity:${r}`).join(" or ")})`);
	}

	// Properties
	if (form.querySelector("#excludeBasic")?.checked === true) {
		query.push("-type:basic");
	}

	// CMC
	const cmcRaw = form.querySelector("#cmcValue")?.value.trim() ?? "";
	if (cmcRaw !== "") {
		const cmcOp = form.querySelector("#cmcOperator")?.value ?? "=";
		query.push(`cmc${cmcOp}${cmcRaw}`);
	}

	// ✅ Power (분리 UI)
	const powerOp = form.querySelector("#powerOperator")?.value ?? "";
	const powerVal = (form.querySelector("#powerValue")?.value ?? "").trim();

	// ✅ Toughness (분리 UI)
	const toughOp = form.querySelector("#toughnessOperator")?.value ?? "";
	const toughVal = (form.querySelector("#toughnessValue")?.value ?? "").trim();

	const numericPTOnly = form.querySelector("#numericPTOnly")?.checked === true;

	let usedPT = false;
	if (powerOp !== "" && powerVal !== "") {
		query.push(`pow${powerOp}${powerVal}`);
		usedPT = true;
	}
	if (toughOp !== "" && toughVal !== "") {
		query.push(`tou${toughOp}${toughVal}`);
		usedPT = true;
	}

	// P/T 사용 시 creature 자동 보정 및 숫자형 제한
	if (usedPT) {
		const userSelectedCreature = typeList.includes("Creature");
		if (!userSelectedCreature) {
			query.push("t:creature");
			showToast("P/T 필터 사용으로 creature 타입을 자동 추가했습니다.");
		}
		if (numericPTOnly === true) {
			query.push("-pow=*", "-tou=*", "-oracletag:fractional-power-toughness");
		}
	}

	// Build API URL
	const finalQuery = query.length > 0 ? `?q=${encodeURIComponent(query.join(" "))}` : "";
	const apiURL = `https://api.scryfall.com/cards/random${finalQuery}`;

	try {
		const res = await fetch(apiURL);
		if (!res.ok) {
			let details = "";
			try {
				const errorData = await res.json();
				details = errorData?.details || "";
			} catch (_) {}
			throw new Error(details || `HTTP error! Status: ${res.status}`);
		}

		const card = await res.json();

		// 이미지 URL
		let imgURL = card.image_uris?.normal || (card.card_faces ? card.card_faces[0]?.image_uris?.normal : "");
		if (!imgURL) {
			throw new Error("No image available for this card.");
		}

		// 표시용 face 선택 (DFC 등에서 생물 면 우선)
		function pickDisplayFace(c) {
			if (c.card_faces && Array.isArray(c.card_faces) && c.card_faces.length > 0) {
				const creatureFace = c.card_faces.find(f => String(f.type_line || "").includes("Creature"));
				return creatureFace || c.card_faces[0];
			}
			return c;
		}
		const face = pickDisplayFace(card);

		// 실제 P/T, 타입, 마나비용
		const displayPower = (face.power ?? card.power) ?? null;
		const displayToughness = (face.toughness ?? card.toughness) ?? null;
		const displayTypeLine = (face.type_line ?? card.type_line) || "";
		const displayManaCost = (face.mana_cost ?? card.mana_cost) || "";

		const img = new Image();
		img.src = imgURL;
		img.className = "card-img";
		img.alt = card.name;

		// 필터 요약
		const summary = [];
		if (typeList.length > 0) summary.push(`<strong>Types:</strong> ${typeList.join(", ")}`);
		if (colorList.length > 0) summary.push(`<strong>Colors:</strong> ${colorList.join(", ")}`);
		if (rarityList.length > 0) summary.push(`<strong>Rarity:</strong> ${rarityList.join(", ")}`);
		if (form.querySelector("#excludeBasic")?.checked === true) summary.push("<strong>Exclude Basic Lands</strong>");
		if (cmcRaw !== "") summary.push(`<strong>CMC:</strong> ${form.querySelector("#cmcOperator")?.value} ${cmcRaw}`);
		if (powerOp && powerVal) summary.push(`<strong>Power:</strong> ${powerOp} ${powerVal}`);
		if (toughOp && toughVal) summary.push(`<strong>Toughness:</strong> ${toughOp} ${toughVal}`);
		if (usedPT && numericPTOnly) summary.push(`<strong>P/T:</strong> 숫자형만`);

		img.onload = () => {
			let html = `<h3>${card.name}</h3>`;

			// 카드 메타(타입/코스트/실제 P&T)
			html += `<div class="card-meta">`;
			if (displayTypeLine) html += `<div class="type-line">${displayTypeLine}</div>`;
			if (displayManaCost) html += `<div class="mana-cost">${displayManaCost}</div>`;
			if (displayPower !== null && displayToughness !== null) {
				html += `<div class="pt-line"><strong>P/T:</strong> ${displayPower}/${displayToughness}</div>`;
			}
			html += `</div>`;

			html += `<div class="card-container">${img.outerHTML}</div>`;

			if (summary.length > 0) {
				html += `<div class="filter-summary">${summary.join("<br>")}</div>`;
			}
			cardResultDiv.innerHTML = html;

			setTimeout(() => {
				cardResultDiv.querySelector('.card-img')?.classList.add('loaded');
			}, 50);

			cardResultDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });
		};

		img.onerror = () => { throw new Error("Failed to load card image."); };
	} catch (err) {
		cardResultDiv.innerHTML = `<p style="color:#ff5555;">Error: ${err.message}</p>`;
		console.error(err);
	}
});

window.addEventListener("DOMContentLoaded", () => {
	const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
	const wifiCheckbox = document.getElementById("wifiConfirm");
	if (!isMobile && wifiCheckbox) {
		wifiCheckbox.checked = true;
	}
});
