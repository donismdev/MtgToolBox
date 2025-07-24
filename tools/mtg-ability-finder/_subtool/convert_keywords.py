import json
import os
from datetime import datetime

# ====== 경로 설정 ======
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ABILITY_JSON_PATH = os.path.join(BASE_DIR, "abilities.json")
OUTPUT_JSON_PATH = os.path.join(BASE_DIR, "converted_keywords.json")

# ====== 설명 정의 (분리된 세트에서 병합) ======
from keyword_descriptions import keywordTexts, keywordActions, abilityWords, specialWords

# KEYWORD_TEXTS로 통합 (전부 소문자 정규화)
KEYWORD_TEXTS = {}
KEYWORD_TEXTS.update({k.strip().lower(): v for k, v in keywordTexts.items()})
KEYWORD_TEXTS.update({k.strip().lower(): v for k, v in keywordActions.items()})
KEYWORD_TEXTS.update({k.strip().lower(): v for k, v in abilityWords.items()})

# ====== 에버그린 키워드 정의 ======
EVERGREEN_SET = {
	"deathtouch", "defender", "double strike", "enchant", "equip", "first strike",
	"flash", "flying", "haste", "hexproof", "indestructible", "lifelink",
	"menace", "reach", "shroud", "trample", "vigilance", "ward", "protection"
}

# ====== Arena 전용 키워드 정의 ======
ARENA_ONLY_SET = {
	"seek", "conjure", "perpetual", "spellbook", "intensity", "materialize",
}

# ====== Arena JSON 누락 키워드 정의 (하드코딩된 보정용) ======
arena_missing_in_json = [
	"perpetual", "spellbook", "intensity", "materialize"
]

# ====== abilities.json 불러오기 ======
with open(ABILITY_JSON_PATH, encoding="utf-8") as f:
	raw = json.load(f)
	data = raw["data"]
	meta = raw.get("meta", {})

# ====== abilities / not_found 분리 저장 ======
abilities = {}
arena_only = {}
not_found = []

def register_keywords(keywords: list, category: str):
	for keyword in keywords:
		lower = keyword.strip().lower()
		entry = {
			"text": KEYWORD_TEXTS.get(lower, f"{keyword} (no description)"),
			"type": category,
			"image": None
		}
		if lower in KEYWORD_TEXTS:
			if lower in ARENA_ONLY_SET:
				arena_only[lower] = entry
			else:
				abilities[lower] = entry
		else:
			not_found.append(keyword.strip())

# ====== 등록 처리 ======
register_keywords(data.get("abilityWords", []), "abilityWord")
register_keywords(data.get("keywordAbilities", []), "keywordAbility")
register_keywords(data.get("keywordActions", []), "keywordAction")

# ====== Arena JSON 누락 키워드 강제 등록 ======
for keyword in arena_missing_in_json:
	lower = keyword.strip().lower()
	if lower in KEYWORD_TEXTS:
		entry = {
			"text": KEYWORD_TEXTS[lower],
			"type": "arenaOnly",
			"image": None
		}
		arena_only[lower] = entry
	else:
		not_found.append(keyword.strip())

# ====== special 항목 정리 ======
special = {}
for key, desc in specialWords.items():
	lower = key.strip().lower()
	special[lower] = desc.strip()

# ====== evergreen 키워드 정리 ======
evergreen = {}
for kw in sorted(EVERGREEN_SET):
	entry = {
		"text": KEYWORD_TEXTS.get(kw, f"{kw} (no description)"),
		"type": "keywordAbility",
		"image": None
	}
	evergreen[kw] = entry

# ====== 최종 구조 생성 ======
final_output = {
	"meta": {
		"date": datetime.now().strftime("%Y-%m-%d"),
		"version": meta.get("version", "unknown"),
		"source": "https://mtgjson.com/"
	},
	"abilities": abilities,
	"not_found": sorted(set(not_found)),
	"special": special,
	"evergreen": evergreen,
	"arena": arena_only
}

# ====== 저장 ======
with open(OUTPUT_JSON_PATH, "w", encoding="utf-8") as f:
	json.dump(final_output, f, indent=2, ensure_ascii=False)

print(f"[+] {len(abilities)} abilities, {len(arena_only)} arena-only, {len(not_found)} not-found, {len(special)} special entries, {len(evergreen)} evergreen saved to {OUTPUT_JSON_PATH}")
