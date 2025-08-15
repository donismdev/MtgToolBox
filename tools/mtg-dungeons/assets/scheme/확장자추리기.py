import os

# ===== 설정 =====
TARGET_FOLDER = ""  # 비워두면 현재 스크립트가 있는 폴더로 설정됨
EXTENSIONS = [".jpg", ".webp"]  # 소문자 확장자 목록

# ===== 실행 =====
def list_files_with_extensions(folder_path, extensions):
	print(f"📂 폴더: {folder_path}")
	files_found = []

	for root, _, files in os.walk(folder_path):
		for file in files:
			if os.path.splitext(file)[1].lower() in extensions:
				files_found.append(file)

	return sorted(files_found)

if __name__ == "__main__":
	# 폴더 경로 결정
	if not TARGET_FOLDER.strip():
		TARGET_FOLDER = os.path.dirname(os.path.abspath(__file__))

	files = list_files_with_extensions(TARGET_FOLDER, EXTENSIONS)
	if files:
		print("🔍 찾은 파일:")
		for f in files:
			print(f)
	else:
		print("⚠️ 해당 확장자의 파일이 없습니다.")
	input("\n작업 종료. press enter")
