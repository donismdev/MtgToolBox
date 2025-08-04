import tkinter as tk
from tkinter import ttk, messagebox
import threading
import webbrowser
from PIL import Image, ImageTk
import image_cache_handler  # 이 모듈은 별도로 존재해야 함

class SelectedCardView(ttk.Frame):
	def __init__(self, master, added_list, discarded_list, on_back_to_main):
		super().__init__(master)
		self.master = master
		self.on_back_to_main = on_back_to_main
		self.added_list_data = added_list
		self.discarded_list_data = discarded_list
		self.proxy_list_data = []

		self.price_threshold_var = tk.DoubleVar(value=2.0)

		self.setup_ui()
		self.populate_lists()

	def setup_ui(self):
		self.grid_columnconfigure(0, weight=1)
		self.grid_columnconfigure(1, weight=2)
		self.grid_rowconfigure(0, weight=1)

		left_panel = ttk.Frame(self)
		left_panel.grid(row=0, column=0, sticky="nsew", padx=10, pady=10)
		left_panel.grid_rowconfigure(1, weight=2)
		left_panel.grid_rowconfigure(3, weight=1)
		left_panel.grid_rowconfigure(5, weight=1)

		ttk.Label(left_panel, text="Added Cards", font=("Helvetica", 12)).grid(row=0, column=0, sticky="w")
		self.added_listbox = tk.Listbox(left_panel)
		self.added_listbox.grid(row=1, column=0, sticky="nsew")
		self.added_listbox.bind("<<ListboxSelect>>", self.on_added_card_select)

		ttk.Label(left_panel, text="Discarded Cards", font=("Helvetica", 12)).grid(row=2, column=0, sticky="w", pady=(10, 0))
		self.discarded_listbox = tk.Listbox(left_panel)
		self.discarded_listbox.grid(row=3, column=0, sticky="nsew")
		self.discarded_listbox.bind("<<ListboxSelect>>", self.on_discarded_card_select)

		ttk.Label(left_panel, text="Proxy Cards", font=("Helvetica", 12)).grid(row=4, column=0, sticky="w", pady=(10, 0))
		self.proxy_listbox = tk.Listbox(left_panel)
		self.proxy_listbox.grid(row=5, column=0, sticky="nsew")
		self.proxy_listbox.bind("<<ListboxSelect>>", self.on_proxy_card_select)

		right_panel = ttk.Frame(self, relief="sunken", borderwidth=2)
		right_panel.grid(row=0, column=1, sticky="nsew", padx=10, pady=10)
		self.image_label = ttk.Label(right_panel)
		self.image_label.pack(expand=True)

		button_frame = ttk.Frame(self)
		button_frame.grid(row=1, column=0, columnspan=2, pady=10)

		ttk.Button(button_frame, text="Back to Sorter", command=self.on_back_to_main).pack(side=tk.LEFT, padx=10)
		ttk.Button(button_frame, text="Prepare for Card Kingdom", command=self.prepare_for_card_kingdom).pack(side=tk.LEFT, padx=10)
		ttk.Entry(button_frame, textvariable=self.price_threshold_var, width=5).pack(side=tk.LEFT, padx=5)
		ttk.Button(button_frame, text="Proxy 추리기", command=self.extract_proxies).pack(side=tk.LEFT, padx=5)
		ttk.Button(button_frame, text="프록시 리스트로 이동", command=self.open_proxy_site).pack(side=tk.LEFT, padx=10)

	def populate_lists(self):
		self.added_listbox.delete(0, tk.END)
		for entry in self.added_list_data:
			card = entry['card']
			border_color = card.get('border_color', 'N/A')
			text = f"{entry['quantity']}x {card['name']} [{border_color}] {'(Foil)' if entry['is_foil'] else ''}"
			self.added_listbox.insert(tk.END, text)

		self.discarded_listbox.delete(0, tk.END)
		for entry in self.discarded_list_data:
			card = entry['card']
			border_color = card.get('border_color', 'N/A')
			self.discarded_listbox.insert(tk.END, f"{card['name']} [{border_color}]")

		self.proxy_listbox.delete(0, tk.END)
		for entry in self.proxy_list_data:
			card = entry['card']
			self.proxy_listbox.insert(tk.END, f"{entry['quantity']}x {card['name']}")

	def prepare_for_card_kingdom(self):
		if not self.added_list_data:
			messagebox.showinfo("No Cards", "There are no cards in the 'Added' list to prepare.")
			return

		aggregated = {}
		for entry in self.added_list_data:
			name = entry['card']['name']
			aggregated[name] = aggregated.get(name, 0) + entry['quantity']

		text = "\n".join(f"{q}x {n}" for n, q in aggregated.items())

		self.master.clipboard_clear()
		self.master.clipboard_append(text)
		webbrowser.open("https://www.cardkingdom.com/builder")
		messagebox.showinfo("Copied", "Decklist copied. Paste it (Ctrl+V) on the opened Card Kingdom Deckbuilder.")

	def extract_proxies(self):
		threshold = self.price_threshold_var.get()
		remain = []
		proxies = []

		for entry in self.added_list_data:
			card = entry['card']
			price = 0.0
			try:
				price = float(card.get('prices', {}).get('usd') or 0.0)
			except:
				pass
			if price > threshold:
				proxies.append(entry)
			else:
				remain.append(entry)

		self.proxy_list_data = proxies
		self.added_list_data = remain
		self.populate_lists()

	def open_proxy_site(self):
		if not self.proxy_list_data:
			messagebox.showinfo("No Proxies", "No proxies to copy.")
			return

		text = "\n".join(f"{entry['quantity']}x {entry['card']['name']}" for entry in self.proxy_list_data)
		self.master.clipboard_clear()
		self.master.clipboard_append(text)
		webbrowser.open("https://www.printingproxies.com/card-printing/")
		messagebox.showinfo("Proxies Copied", "Proxy list copied.\nPaste it (Ctrl+V) on PrintingProxies.com")

	def on_added_card_select(self, event):
		self._select_card(self.added_listbox, self.added_list_data)
		self.discarded_listbox.selection_clear(0, tk.END)
		self.proxy_listbox.selection_clear(0, tk.END)

	def on_discarded_card_select(self, event):
		self._select_card(self.discarded_listbox, self.discarded_list_data)
		self.added_listbox.selection_clear(0, tk.END)
		self.proxy_listbox.selection_clear(0, tk.END)

	def on_proxy_card_select(self, event):
		self._select_card(self.proxy_listbox, self.proxy_list_data)
		self.added_listbox.selection_clear(0, tk.END)
		self.discarded_listbox.selection_clear(0, tk.END)

	def _select_card(self, listbox, data_list):
		idx = listbox.curselection()
		if not idx: return
		card = data_list[idx[0]]['card']
		self.display_image(card)

	def display_image(self, card):
		threading.Thread(target=self._fetch_and_show_image, args=(card,)).start()

	def _fetch_and_show_image(self, card):
		img = image_cache_handler.load_image_from_cache(card)
		if img:
			img.thumbnail((400, 560))
			photo = ImageTk.PhotoImage(img)
			self.image_label.config(image=photo)
			self.image_label.image = photo
