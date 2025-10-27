import json
import os
from datetime import datetime
from colorama import init, Fore, Style

# ====== 초기화 ======
init(autoreset=True)

print("ability_data 빌드 시작")

# ====== 경로 설정 (최상단에 모아두기) ======
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
RESOURCE_DIR = os.path.join(BASE_DIR, "resources")
OUTPUT_DIR = os.path.join(BASE_DIR, "assets")

OUTPUT_JSON_PATH = os.path.join(OUTPUT_DIR, "ability_data.json")

# ====== 설명 정의 (리소스 모듈에서만 가져옴; 외부 JSON 없음) ======
from resources.keyword_descriptions import (
	keywordTexts, keywordActions, abilityWords, specialWords, specialCounters, specialTokens,
	deckbuildingKeywords, history, role
)

# ====== 통합 / 정규화 유틸 ======
def _norm_key(s: str) -> str:
	return s.strip().lower()

def _mk_entry(text: str, type_: str, image=None) -> dict:
	return {"text": text, "type": type_, "image": image}

# ====== 에버그린 / 아레나-온리 정의 ======
EVERGREEN_SET = {
	"deathtouch","defender","double strike","enchant","equip","first strike","flash","flying",
	"haste","hexproof","indestructible","lifelink","menace","reach","shroud","trample",
	"vigilance","ward","surveil","scry"
}

# Arena only 키워드: (요청 반영) heist 포함
ARENA_ONLY_SET = {
	"seek", "conjure", "perpetual", "spellbook", "intensity", "materialize", "heist"
}

# ====== 컨테이너 ======
abilities = {}     # 일반 키워드: keywordAbility / keywordAction / abilityWord
arena_only = {}    # 아레나 전용
not_found = []     # 선언됐는데 설명이 없을 때만 추가

# ====== 등록 로직 ======
# 타입 우선순위: abilityWord > keywordAction > keywordAbility
TYPE_PRIORITY = {"abilityWord": 3, "keywordAction": 2, "keywordAbility": 1}

def register_map(src_map: dict, as_type: str):
	for k, v in src_map.items():
		key = _norm_key(k)
		text = v if isinstance(v, str) else str(v)

		# 텍스트가 비어있으면 not_found로
		if not text or text.strip() == "":
			not_found.append(k.strip())
			continue

		# 아레나 전용이면 arena에 수납
		if key in ARENA_ONLY_SET:
			arena_only[key] = _mk_entry(text, "arenaOnly")
			continue

		# 이미 abilities에 있으면 타입 우선순위로 교체 여부 판단
		if key in abilities:
			prev = abilities[key]
			if TYPE_PRIORITY.get(as_type, 0) > TYPE_PRIORITY.get(prev.get("type",""), 0):
				abilities[key] = _mk_entry(text, as_type)
		else:
			abilities[key] = _mk_entry(text, as_type)

# 각 딕셔너리를 타입에 맞게 흡수
register_map(keywordTexts, "keywordAbility")
register_map(keywordActions, "keywordAction")
register_map(abilityWords, "abilityWord")

# ====== Evergreen 정리 (설명 없으면 not_found에 기록) ======
evergreen = {}
for kw in sorted(EVERGREEN_SET):
	key = _norm_key(kw)
	text = None
	if key in abilities:
		text = abilities[key]["text"]
	elif key in arena_only:
		# 에버그린이 아레나 전용일 리는 거의 없지만 혹시
		text = arena_only[key]["text"]
	else:
		# 원문 사전에서 직접 찾아보기
		text = keywordTexts.get(key) or abilityWords.get(key) or keywordActions.get(key)
		if text is None:
			not_found.append(kw)
			text = f"{kw} (no description)"
	evergreen[key] = _mk_entry(text, "keywordAbility")

# ====== 특수/토큰/카운터/덱빌딩/롤 ======
special = { _norm_key(k): v.strip() for k, v in specialWords.items() }
special_counters = { _norm_key(k): v.strip() for k, v in specialCounters.items() }
special_tokens = { _norm_key(k): v.strip() for k, v in specialTokens.items() }
deckbuilding = { _norm_key(k): v.strip() for k, v in deckbuildingKeywords.items() }
roles = sorted({ _norm_key(r) for r in role })

# ====== Arena 전용 중 설명 누락 검사 -> not_found에 추가 ======
for key in sorted(ARENA_ONLY_SET):
	if key not in arena_only:
		# 설명이 원본문서에 없으면 not_found로
		src = keywordTexts.get(key) or abilityWords.get(key) or keywordActions.get(key)
		if src:
			arena_only[key] = _mk_entry(src, "arenaOnly")
		else:
			not_found.append(key)

# ====== 메타 ======
def _derive_version():
	# history의 가장 최신 release_date 기반 간단 버전 문자열
	try:
		if history:
			latest = max(history, key=lambda h: h.get("release_date","0000-00-00"))
			return f"{latest.get('code','unknown')}-{latest.get('release_date','unknown')}"
	except Exception:
		pass
	return datetime.now().strftime("local-%Y.%m.%d")

meta = {
	"date": datetime.now().strftime("%Y-%m-%d"),
	"version": _derive_version(),
	"source": "local resources/keyword_descriptions.py"
}

# ====== 최종 구조 ======
final_output = {
	"meta": meta,
	"abilities": abilities,
	"arena": arena_only,
	"special": special,
	"special_counters": special_counters,
	"special_tokens": special_tokens,
	"evergreen": evergreen,
	"deckbuilding": deckbuilding,   # (신규) 덱빌딩 키워드
	"roles": roles,                 # (신규) 롤 토큰 목록(정렬본)
	"history": history,             # (신규) 세트 히스토리 원본 그대로
	"not_found": sorted(set(not_found))
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

print(f"\n{Style.BRIGHT}[+] 저장 완료: {OUTPUT_JSON_PATH}")
print(f"[+] 능력 수: 일반={len(abilities)}, Arena={len(arena_only)}, 미발견={len(final_output['not_found'])}, Special={len(special)}, Evergreen={len(evergreen)}")

if previous_output:
	print_diff("abilities", previous_output.get("abilities", {}), abilities)
	print_diff("arena", previous_output.get("arena", {}), arena_only)
	print_diff("special", previous_output.get("special", {}), special)
	print_diff("special_counters", previous_output.get("special_counters", {}), special_counters)
	print_diff("special_tokens", previous_output.get("special_tokens", {}), special_tokens)
	print_diff("evergreen", previous_output.get("evergreen", {}), evergreen)
	print_diff("deckbuilding", previous_output.get("deckbuilding", {}), deckbuilding)
	print_diff("roles", {k:True for k in previous_output.get("roles", [])}, {k:True for k in roles})

input("ability_data 빌드 종료. press enter")
