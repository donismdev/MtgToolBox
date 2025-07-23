import http.server
import socketserver
import sys
import webbrowser
import time

# 기본 포트 설정
DEFAULT_PORT = 8000

# 명령줄 인자에서 포트 추출
if len(sys.argv) >= 2:
	try:
		PORT = int(sys.argv[1])
	except ValueError:
		print("❌ 포트는 숫자여야 합니다. 예: python server_on.py 8000")
		sys.exit(1)
else:
	PORT = DEFAULT_PORT

Handler = http.server.SimpleHTTPRequestHandler

print(f"🌐 로컬 서버 시작 중... (http://localhost:{PORT})")

# 웹 브라우저 자동 실행 (약간의 지연 주기)
time.sleep(0.5)
webbrowser.open(f"http://localhost:{PORT}")

# 서버 실행
print("✅ 브라우저가 열렸습니다. 끄려면 Ctrl+C 를 누르세요.")
with socketserver.TCPServer(("", PORT), Handler) as httpd:
	httpd.serve_forever()
