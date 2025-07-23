import zipfile
import os

# 설정
TOOL_NAME = "gui-card-manager"
TOOL_FOLDER = f"tools/{TOOL_NAME}"
ZIP_NAME = f"{TOOL_NAME}.zip"
ZIP_PATH = os.path.join(TOOL_FOLDER, ZIP_NAME)

# 1. 기존 zip 제거
if os.path.exists(ZIP_PATH):
	print(f"기존 ZIP 삭제: {ZIP_PATH}")
	os.remove(ZIP_PATH)

# 2. 새로운 zip 생성
with zipfile.ZipFile(ZIP_PATH, 'w', zipfile.ZIP_DEFLATED) as zipf:
	for root, dirs, files in os.walk(TOOL_FOLDER):
		for file in files:
			if file == ZIP_NAME:
				continue  # 자신은 제외
			full_path = os.path.join(root, file)
			relative_path = os.path.relpath(full_path, TOOL_FOLDER)
			zipf.write(full_path, arcname=relative_path)

print(f"✅ {ZIP_NAME} 생성 완료!")
