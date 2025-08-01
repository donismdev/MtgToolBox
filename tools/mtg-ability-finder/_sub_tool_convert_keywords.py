import json
import os
from datetime import datetime
from colorama import init, Fore, Style

# ====== 초기화 ======
init(autoreset=True)

# ====== 경로 설정 ======
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
RESOURCE_DIR = os.path.join(BASE_DIR, "resources")
OUTPUT_DIR = os.path.join(BASE_DIR, "assets")

ABILITY_JSON_PATH = os.path.join(RESOURCE_DIR, "abilities.json")
OUTPUT_JSON_PATH = os.path.join(OUTPUT_DIR, "ability_data.json")

# ====== 설명 정의 (분리된 세트에서 병합) ======
from resources.keyword_descriptions import (
	keywordTexts, keywordActions, abilityWords, specialWords, specialCounters, specialTokens
)

# ====== 통합 설명 맵 ======
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

# ====== 특수 항목들 정리 ======
special = {k.strip().lower(): v.strip() for k, v in specialWords.items()}
special_counters = {k.strip().lower(): v.strip() for k, v in specialCounters.items()}
special_tokens = {k.strip().lower(): v.strip() for k, v in specialTokens.items()}

# ====== Evergreen 정리 ======
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
	"special_counters": special_counters,
	"special_tokens": special_tokens,
	"evergreen": evergreen,
	"arena": arena_only
}

# ====== 기존 파일 로딩 (diff 비교용) ======
previous_output = {}
if os.path.exists(OUTPUT_JSON_PATH):
	with open(OUTPUT_JSON_PATH, "r", encoding="utf-8") as f:
		previous_output = json.load(f)

# ====== 저장 ======
os.makedirs(OUTPUT_DIR, exist_ok=True)
with open(OUTPUT_JSON_PATH, "w", encoding="utf-8") as f:
	json.dump(final_output, f, indent=2, ensure_ascii=False)

# ====== 변화 비교 및 출력 ======
def diff_keys(old: dict, new: dict):
	old_keys = set(old.keys())
	new_keys = set(new.keys())
	added = sorted(new_keys - old_keys)
	removed = sorted(old_keys - new_keys)
	return added, removed

def print_diff(name, old_dict, new_dict):
	added, removed = diff_keys(old_dict, new_dict)
	print(f"\n=== [{name}] 변화량 ===")
	for key in removed:
		print(f"  {Fore.RED}🔴 제거됨: {key}")
	for key in added:
		print(f"  {Fore.GREEN}🟢 추가됨: {key}")
	print(f"{Style.BRIGHT}  → 총 {len(added)} 추가 / {len(removed)} 제거{Style.RESET_ALL}")

# ====== 결과 출력 ======
print(f"\n{Style.BRIGHT}[+] 저장 완료: {OUTPUT_JSON_PATH}")
print(f"[+] 능력 수: 일반={len(abilities)}, Arena={len(arena_only)}, 미발견={len(not_found)}, Special={len(special)}, Evergreen={len(evergreen)}")

if previous_output:
	print_diff("abilities", previous_output.get("abilities", {}), abilities)
	print_diff("arena", previous_output.get("arena", {}), arena_only)
	print_diff("special", previous_output.get("special", {}), special)
	print_diff("special_counters", previous_output.get("special_counters", {}), special_counters)
	print_diff("special_tokens", previous_output.get("special_tokens", {}), special_tokens)
	print_diff("evergreen", previous_output.get("evergreen", {}), evergreen)
