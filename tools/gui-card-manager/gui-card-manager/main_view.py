import tkinter as tk
from tkinter import ttk, font, messagebox
import threading
from PIL import Image, ImageTk, ImageOps, ImageDraw, ImageFont
import requests
from io import BytesIO
import image_cache_handler

class MainView(ttk.Frame):
    def __init__(self, master, card_data, set_data, on_reset, on_finish):
        super().__init__(master)
        self.master = master
        self.card_data = card_data
        self.set_data = set_data
        self.on_reset = on_reset
        self.on_finish = on_finish

        self.cards_in_set = []
        self.current_card_group_index = 0
        self.selected_card_object = None
        self.image_labels = {}
        self.image_cache = {}
        self.added_list = []
        self.discarded_list = []
        self.processed_info = {}
        self.processed_card_names = set()

        self.foil_var = tk.BooleanVar()
        self.quantity_var = tk.IntVar(value=1)
        self.show_tokens_var = tk.BooleanVar(value=False)
        self.show_art_series_var = tk.BooleanVar(value=False)
        self.only_one_var = tk.BooleanVar(value=False)

        self.setup_ui()
        self.foil_var.trace_add("write", self.on_foil_toggle)
        self.show_tokens_var.trace_add("write", self.on_filter_changed)
        self.show_art_series_var.trace_add("write", self.on_filter_changed)

    def setup_ui(self):
        top_frame = ttk.Frame(self)
        top_frame.pack(fill=tk.X, pady=5)
        options_frame = ttk.Frame(top_frame)
        options_frame.pack(side=tk.LEFT, padx=5)
        sort_frame = ttk.Frame(options_frame)
        sort_frame.pack(anchor="w")
        ttk.Label(sort_frame, text="Sort by:").pack(side=tk.LEFT, padx=(0, 2))
        self.sort_combobox = ttk.Combobox(sort_frame, values=["By Release Date", "By Name"], state="readonly", width=15)
        self.sort_combobox.set("By Release Date")
        self.sort_combobox.pack(side=tk.LEFT)
        self.sort_combobox.bind("<<ComboboxSelected>>", self.on_sort_method_changed)
        filter_frame = ttk.Frame(options_frame)
        filter_frame.pack(anchor="w", pady=(5,0))
        ttk.Checkbutton(filter_frame, text="Show Tokens", variable=self.show_tokens_var).pack(side=tk.LEFT)
        ttk.Checkbutton(filter_frame, text="Show Art Series", variable=self.show_art_series_var).pack(side=tk.LEFT, padx=10)
        set_selection_frame = ttk.Frame(top_frame)
        set_selection_frame.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=10)
        ttk.Label(set_selection_frame, text="Select Set:").pack(anchor="w")
        self.set_combobox = ttk.Combobox(set_selection_frame, state="readonly", width=50)
        self.set_combobox.pack(fill=tk.X, expand=True)
        self.set_combobox.bind("<<ComboboxSelected>>", self.on_set_selected)
        ttk.Button(top_frame, text="Reset Data", command=self.on_reset).pack(side=tk.RIGHT, padx=5, anchor="n")
        content_frame = ttk.Frame(self)
        content_frame.pack(fill=tk.BOTH, expand=True, pady=5)
        content_frame.grid_columnconfigure(0, weight=3)
        content_frame.grid_columnconfigure(1, weight=0)
        content_frame.grid_columnconfigure(2, weight=2)
        content_frame.grid_rowconfigure(0, weight=1)
        self.card_display_container = ttk.Frame(content_frame, relief="sunken", borderwidth=2)
        self.card_display_container.grid(row=0, column=0, sticky="nsew", padx=5)
        self.card_name_label = ttk.Label(self.card_display_container, text="Select a set to begin.", font=("Helvetica", 14))
        self.card_name_label.pack(pady=10)
        self.card_images_frame = ttk.Frame(self.card_display_container)
        self.card_images_frame.pack(expand=True)
        action_button_frame = ttk.Frame(content_frame)
        action_button_frame.grid(row=0, column=1, sticky="ns", padx=5)
        action_button_frame.grid_rowconfigure(0, weight=1)
        action_button_frame.grid_rowconfigure(1, weight=1)
        action_button_frame.grid_rowconfigure(2, weight=1)
        self.add_button = ttk.Button(action_button_frame, text="Add to List", command=self.add_card, state=tk.DISABLED)
        self.add_button.grid(row=0, column=0, sticky="nsew", pady=(0, 5))
        self.discard_button = ttk.Button(action_button_frame, text="Discard", command=self.discard_card, state=tk.DISABLED)
        self.discard_button.grid(row=1, column=0, sticky="nsew", pady=(0, 5))
        self.discard_all_button = ttk.Button(action_button_frame, text="Discard All", command=self.discard_all_cards, state=tk.DISABLED)
        self.discard_all_button.grid(row=2, column=0, sticky="nsew")
        right_panel = ttk.Frame(content_frame)
        right_panel.grid(row=0, column=2, sticky="nsew", padx=5)
        control_panel = ttk.LabelFrame(right_panel, text="Card Options")
        control_panel.pack(fill=tk.X, pady=(0, 5))
        ttk.Checkbutton(control_panel, text="Foil", variable=self.foil_var).pack(anchor="w", padx=5, pady=5)
        self.foil_warning_label = ttk.Label(control_panel, text="This card is not available in foil.", foreground="red")
        qty_frame = ttk.Frame(control_panel)
        qty_frame.pack(fill="x", padx=5, pady=5)
        ttk.Label(qty_frame, text="Quantity:").pack(side=tk.LEFT)
        ttk.Spinbox(qty_frame, from_=1, to=99, textvariable=self.quantity_var, width=5).pack(side=tk.RIGHT)
        ttk.Checkbutton(control_panel, text="Only 1 (Auto-Next)", variable=self.only_one_var).pack(anchor="w", padx=5, pady=5)
        lists_frame = ttk.Frame(right_panel)
        lists_frame.pack(fill=tk.BOTH, expand=True, pady=5)
        lists_frame.grid_columnconfigure(0, weight=1)
        lists_frame.grid_rowconfigure(1, weight=1)
        lists_frame.grid_rowconfigure(3, weight=1)
        ttk.Label(lists_frame, text="Added Cards").grid(row=0, column=0, sticky="w")
        self.added_listbox = tk.Listbox(lists_frame)
        self.added_listbox.grid(row=1, column=0, sticky="nsew")
        ttk.Label(lists_frame, text="Discarded Cards").grid(row=2, column=0, sticky="w", pady=(10, 0))
        self.discard_listbox = tk.Listbox(lists_frame)
        self.discard_listbox.grid(row=3, column=0, sticky="nsew")
        nav_button_frame = ttk.Frame(right_panel)
        nav_button_frame.pack(fill=tk.X, side=tk.BOTTOM, pady=5)
        self.prev_button = ttk.Button(nav_button_frame, text="Previous Card", command=self.previous_card, state=tk.DISABLED)
        self.prev_button.pack(side=tk.LEFT, expand=True, fill=tk.X, padx=(0, 5))
        self.next_button = ttk.Button(nav_button_frame, text="Next Card", command=self.next_card, state=tk.DISABLED)
        self.next_button.pack(side=tk.LEFT, expand=True, fill=tk.X, padx=(0, 5))
        self.result_button = ttk.Button(nav_button_frame, text="Result", command=self.show_current_results, state=tk.DISABLED)
        self.result_button.pack(side=tk.LEFT, expand=True, fill=tk.X)
        self.update_set_list()

    def on_set_selected(self, event):
        selected_set_name = self.set_combobox.get()
        if not selected_set_name: return
        selected_set = next((s for s in self.set_data if s['name'] == selected_set_name), None)
        if selected_set:
            self.image_cache.clear()
            self.added_list.clear(); self.discarded_list.clear(); self.processed_info.clear(); self.processed_card_names.clear()
            self.added_listbox.delete(0, tk.END); self.discard_listbox.delete(0, tk.END)
            set_code = selected_set['code']
            cards_by_name = {}
            for card in self.card_data:
                if card.get('set') == set_code:
                    name = card['name']
                    if name not in cards_by_name: cards_by_name[name] = []
                    cards_by_name[name].append(card)
            self.cards_in_set = list(cards_by_name.values())
            self.current_card_group_index = 0
            self.display_current_card_group()

    def _apply_visual_overlay(self, image, texts, color):
        overlay = Image.new('RGBA', image.size, (100, 100, 100, 180))
        processed_image = Image.alpha_composite(image.convert('RGBA'), overlay)
        draw = ImageDraw.Draw(processed_image)
        try: font = ImageFont.truetype("arial.ttf", 20, encoding='unic')
        except IOError: font = ImageFont.load_default()
        total_text_height = sum(draw.textbbox((0,0), text, font=font)[3] for text in texts)
        y_position = (image.height - total_text_height) / 2
        for text in texts:
            text_bbox = draw.textbbox((0, 0), text, font=font)
            text_width = text_bbox[2] - text_bbox[0]
            x_position = (image.width - text_width) / 2
            draw.text((x_position, y_position), text, font=font, fill=color)
            y_position += draw.textbbox((0,0), text, font=font)[3] + 2
        return processed_image.convert('RGB')

    def _update_card_image_visuals(self, card_id):
        label = self.image_labels.get(card_id)
        base_image = self.image_cache.get(card_id)
        if not label or not base_image: return
        final_image = base_image
        status_info = self.processed_info.get(card_id)
        if status_info:
            if status_info['status'] == 'discarded':
                final_image = self._apply_visual_overlay(base_image, ["Discarded"], "#FF5555")
            elif status_info['status'] == 'added':
                status_texts = [f"Added: {e['quantity']}{' (Foil)' if e['is_foil'] else ''}" for e in status_info.get('entries', [])]
                final_image = self._apply_visual_overlay(base_image, status_texts, "#55FF55")
        is_selected = self.selected_card_object and self.selected_card_object['id'] == card_id
        border_color = '#0078D7' if is_selected else '#CCCCCC'
        bordered_img = ImageOps.expand(final_image, border=5, fill=border_color)
        photo = ImageTk.PhotoImage(bordered_img)
        label.config(image=photo)
        label.image = photo

    def fetch_and_display_image(self, card, parent_frame):
        try:
            img = image_cache_handler.load_image_from_cache(card)
            if not img:
                image_url = card.get('image_uris', {}).get('normal') or (card.get('card_faces') and card['card_faces'][0].get('image_uris', {}).get('normal'))
                if not image_url: return
                response = requests.get(image_url, stream=True); response.raise_for_status()
                img_data = response.content
                image_cache_handler.save_image(card, img_data)
                img = Image.open(BytesIO(img_data))
            img.thumbnail((265, 370)) # Increased image size
            self.image_cache[card['id']] = img
            img_label = ttk.Label(parent_frame)
            img_label.pack(side=tk.LEFT, padx=5, pady=5)
            img_label.bind("<Button-1>", lambda event, c=card: self.on_card_selected(c))
            self.image_labels[card['id']] = img_label
            self._update_card_image_visuals(card['id'])
        except Exception as e: print(f"Error processing image for {card['name']}: {e}")

    def on_card_selected(self, card):
        if not card or card['id'] not in self.image_labels: return
        self.selected_card_object = card
        for card_id in self.image_labels.keys(): self._update_card_image_visuals(card_id)
        self.update_foil_warning()

    def _rebuild_listboxes(self):
        self.added_listbox.delete(0, tk.END)
        for entry in self.added_list:
            card = entry['card']
            border_color = card.get('border_color', 'N/A')
            listbox_entry = f"{entry['quantity']}x {card['name']} [{border_color}] {'(Foil)' if entry['is_foil'] else ''}"
            self.added_listbox.insert(tk.END, listbox_entry)
        self.discard_listbox.delete(0, tk.END)
        for entry in self.discarded_list:
            card = entry['card']
            border_color = card.get('border_color', 'N/A')
            listbox_entry = f"{card['name']} [{border_color}]"
            self.discard_listbox.insert(tk.END, listbox_entry)

    def add_card(self):
        if not self.selected_card_object: return
        card, card_id = self.selected_card_object, self.selected_card_object['id']
        if self.processed_info.get(card_id, {}).get('status') == 'discarded':
            messagebox.showwarning("Invalid Action", "This card has been discarded.")
            return
        if self.foil_var.get() and not card.get('foil', False):
            messagebox.showwarning("Invalid Option", "Card not available in foil.")
            return
        quantity = self.quantity_var.get()
        entry_data = {'card': card, 'quantity': quantity, 'is_foil': self.foil_var.get()}
        self.added_list.append(entry_data)
        proc_info = self.processed_info.setdefault(card_id, {'status': 'added', 'entries': []})
        proc_info['status'] = 'added'
        proc_info['entries'].append({'quantity': quantity, 'is_foil': self.foil_var.get()})
        self._rebuild_listboxes()
        self._update_card_image_visuals(card_id)
        if not self.check_completion(card['name']) and self.only_one_var.get():
            self.next_card()

    def discard_card(self):
        if not self.selected_card_object: return
        card, card_id = self.selected_card_object, self.selected_card_object['id']
        self.added_list = [e for e in self.added_list if e['card']['id'] != card_id]
        if not any(d['card']['id'] == card_id for d in self.discarded_list):
            self.discarded_list.append({'card': card})
        self.processed_info[card_id] = {'status': 'discarded', 'entries': []}
        self._rebuild_listboxes()
        self._update_card_image_visuals(card_id)
        if not self.check_completion(card['name']) and self.only_one_var.get():
            self.next_card()

    def discard_all_cards(self):
        if not self.cards_in_set or not (0 <= self.current_card_group_index < len(self.cards_in_set)): return
        card_group = self.cards_in_set[self.current_card_group_index]
        for card in card_group:
            card_id = card['id']
            self.added_list = [e for e in self.added_list if e['card']['id'] != card_id]
            if not any(d['card']['id'] == card_id for d in self.discarded_list):
                self.discarded_list.append({'card': card})
            self.processed_info[card_id] = {'status': 'discarded', 'entries': []}
        self._rebuild_listboxes()
        if not self.check_completion(card_group[0]['name']):
            self.next_card()

    def show_current_results(self):
        self.on_finish(self.added_list, self.discarded_list)

    def check_completion(self, card_name):
        self.processed_card_names.add(card_name)
        if len(self.processed_card_names) == len(self.cards_in_set):
            self.show_current_results()
            return True
        return False

    def on_sort_method_changed(self, event=None): self.update_set_list()
    def on_filter_changed(self, *args): self.update_set_list()
    def update_set_list(self):
        sort_method = self.sort_combobox.get()
        show_tokens, show_art_series = self.show_tokens_var.get(), self.show_art_series_var.get()
        filtered_sets = [s for s in self.set_data if s.get('card_count', 0) > 0]
        if not show_tokens: filtered_sets = [s for s in filtered_sets if s.get('set_type') != 'token']
        if not show_art_series: filtered_sets = [s for s in filtered_sets if s.get('set_type') != 'art_series']
        if sort_method == "By Release Date": sorted_sets = sorted(filtered_sets, key=lambda s: s.get('released_at', '0'), reverse=True)
        else: sorted_sets = sorted(filtered_sets, key=lambda s: s['name'])
        self.set_combobox['values'] = [s['name'] for s in sorted_sets]
        self.set_combobox.set('')
        self.card_name_label.config(text="Select a set to begin.")
        for widget in self.card_images_frame.winfo_children(): widget.destroy()
        self.image_labels.clear(); self.selected_card_object = None
        self.set_buttons_state(tk.DISABLED)

    def display_current_card_group(self):
        for widget in self.card_images_frame.winfo_children(): widget.destroy()
        self.image_labels.clear(); self.selected_card_object = None
        if not self.cards_in_set: self.card_name_label.config(text="No cards found in this set."); self.set_buttons_state(tk.DISABLED); return
        if 0 <= self.current_card_group_index < len(self.cards_in_set):
            card_group = self.cards_in_set[self.current_card_group_index]
            self.card_name_label.config(text=card_group[0]['name'])
            for card in card_group: threading.Thread(target=self.fetch_and_display_image, args=(card, self.card_images_frame)).start()
            self.master.after(300, lambda: self.on_card_selected(card_group[0]))
            self.set_buttons_state(tk.NORMAL)
        else: self.card_name_label.config(text="All cards in set processed!"); self.set_buttons_state(tk.DISABLED)
        self.prev_button.config(state=tk.NORMAL if self.current_card_group_index > 0 else tk.DISABLED)
        self.next_button.config(state=tk.NORMAL if self.current_card_group_index < len(self.cards_in_set) - 1 else tk.DISABLED)

    def on_foil_toggle(self, *args): self.update_foil_warning()
    def update_foil_warning(self):
        if self.foil_warning_label.winfo_exists(): self.foil_warning_label.pack_forget()
        if self.selected_card_object and self.foil_var.get() and not self.selected_card_object.get('foil', False):
            self.foil_warning_label.pack(anchor="w", padx=5, pady=(0, 5))

    def next_card(self):
        if self.current_card_group_index < len(self.cards_in_set) - 1:
            self.current_card_group_index += 1; self.display_current_card_group()

    def previous_card(self):
        if self.current_card_group_index > 0:
            self.current_card_group_index -= 1; self.display_current_card_group()

    def set_buttons_state(self, state):
        self.add_button.config(state=state); self.discard_button.config(state=state); self.discard_all_button.config(state=state)
        self.result_button.config(state=state)
        self.prev_button.config(state=tk.NORMAL if self.current_card_group_index > 0 else tk.DISABLED)
        self.next_button.config(state=tk.NORMAL if self.current_card_group_index < len(self.cards_in_set) - 1 else tk.DISABLED)