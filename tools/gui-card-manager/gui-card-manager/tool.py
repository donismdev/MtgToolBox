import tkinter as tk
from tkinter import ttk

class ToolApp:
	def __init__(self, root):
		self.root = root
		self.root.title("Account / Card Tool")
		self.root.geometry("400x300")

		# 탭 컨트롤
		tabs = ttk.Notebook(root)
		tabs.pack(fill="both", expand=True)

		# 계정 탭
		self.account_frame = tk.Frame(tabs)
		self.card_frame = tk.Frame(tabs)

		tabs.add(self.account_frame, text="계정")
		tabs.add(self.card_frame, text="카드")

		# 각 프레임 안에 위젯 구성
		self.setup_account_frame()
		self.setup_card_frame()

	def setup_account_frame(self):
		label = tk.Label(self.account_frame, text="계정 정보 탭입니다.", font=("Arial", 14))
		label.pack(pady=100)

	def setup_card_frame(self):
		label = tk.Label(self.card_frame, text="카드 정보 탭입니다.", font=("Arial", 14))
		label.pack(pady=100)

if __name__ == "__main__":
	root = tk.Tk()
	app = ToolApp(root)
	root.mainloop()
