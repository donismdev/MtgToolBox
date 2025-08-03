import tkinter as tk
from tkinter import ttk
import threading
import webbrowser
from PIL import Image, ImageTk
import image_cache_handler

class SelectedCardView(ttk.Frame):
	def __init__(self, master, added_list, discarded_list, on_back_to_main):
		super().__init__(master)
		self.master = master
		self.on_back_to_main = on_back_to_main
		self.added_list_data = added_list
		self.discarded_list_data = discarded_list

		self.setup_ui()
		self.populate_lists()

	def setup_ui(self):
		self.grid_columnconfigure(0, weight=1)
		self.grid_columnconfigure(1, weight=2)
		self.grid_rowconfigure(0, weight=1)

		# --- Left Panel (Lists) ---
		left_panel = ttk.Frame(self)
		left_panel.grid(row=0, column=0, sticky="nsew", padx=10, pady=10)
		left_panel.grid_rowconfigure(1, weight=3)
		left_panel.grid_rowconfigure(3, weight=1)

		ttk.Label(left_panel, text="Added Cards", font=("Helvetica", 12)).grid(row=0, column=0, sticky="w")
		self.added_listbox = tk.Listbox(left_panel)
		self.added_listbox.grid(row=1, column=0, sticky="nsew")
		self.added_listbox.bind("<<ListboxSelect>>", self.on_added_card_select)

		ttk.Label(left_panel, text="Discarded Cards", font=("Helvetica", 12)).grid(row=2, column=0, sticky="w", pady=(10, 0))
		self.discarded_listbox = tk.Listbox(left_panel)
		self.discarded_listbox.grid(row=3, column=0, sticky="nsew")
		self.discarded_listbox.bind("<<ListboxSelect>>", self.on_discarded_card_select)

		# --- Right Panel (Image Display) ---
		right_panel = ttk.Frame(self, relief="sunken", borderwidth=2)
		right_panel.grid(row=0, column=1, sticky="nsew", padx=10, pady=10)
		self.image_label = ttk.Label(right_panel)
		self.image_label.pack(expand=True)

		# --- Bottom Buttons ---
		button_frame = ttk.Frame(self)
		button_frame.grid(row=1, column=0, columnspan=2, pady=10)
		ttk.Button(button_frame, text="Back to Sorter", command=self.on_back_to_main).pack(side=tk.LEFT, padx=10)
		ttk.Button(button_frame, text="Prepare for Card Kingdom", command=self.prepare_for_card_kingdom).pack(side=tk.LEFT, padx=10)

	def populate_lists(self):
		for entry in self.added_list_data:
			card = entry['card']
			border_color = card.get('border_color', 'N/A')
			listbox_entry = f"{entry['quantity']}x {card['name']} [{border_color}] {'(Foil)' if entry['is_foil'] else ''}"
			self.added_listbox.insert(tk.END, listbox_entry)
		
		for entry in self.discarded_list_data:
			card = entry['card']
			border_color = card.get('border_color', 'N/A')
			listbox_entry = f"{card['name']} [{border_color}]"
			self.discarded_listbox.insert(tk.END, listbox_entry)

	def prepare_for_card_kingdom(self):
		"""Formats the added list for Card Kingdom's deckbuilder and copies it to the clipboard."""
		if not self.added_list_data:
			tk.messagebox.showinfo("No Cards", "There are no cards in the 'Added' list to prepare.")
			return

		aggregated_cards = {}
		for entry in self.added_list_data:
			card = entry['card']
			# Foil 여부는 무시 (Deck Builder에선 입력 불가)
			key = card['name']
			if key not in aggregated_cards:
				aggregated_cards[key] = 0
			aggregated_cards[key] += entry['quantity']

		decklist_text = ""
		for name, quantity in aggregated_cards.items():
			decklist_text += f"{quantity}x {name}\n"

		self.master.clipboard_clear()
		self.master.clipboard_append(decklist_text)
		webbrowser.open("https://www.cardkingdom.com/builder")
		tk.messagebox.showinfo(
			"Copied to Clipboard",
			"Your decklist has been copied to the clipboard.\n\nPaste it (Ctrl+V) into the Card Kingdom Deckbuilder page that has been opened for you."
		)

	def on_added_card_select(self, event):
		selection_indices = self.added_listbox.curselection()
		if not selection_indices: return
		selected_index = selection_indices[0]
		card_data = self.added_list_data[selected_index]['card']
		self.display_image(card_data)
		self.discarded_listbox.selection_clear(0, tk.END)

	def on_discarded_card_select(self, event):
		selection_indices = self.discarded_listbox.curselection()
		if not selection_indices: return
		selected_index = selection_indices[0]
		card_data = self.discarded_list_data[selected_index]['card']
		self.display_image(card_data)
		self.added_listbox.selection_clear(0, tk.END)

	def display_image(self, card):
		threading.Thread(target=self._fetch_and_show_image, args=(card,)).start()

	def _fetch_and_show_image(self, card):
		img = image_cache_handler.load_image_from_cache(card)
		if img:
			img.thumbnail((400, 560))
			photo = ImageTk.PhotoImage(img)
			self.image_label.config(image=photo)
			self.image_label.image = photo
