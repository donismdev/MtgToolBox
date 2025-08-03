import tkinter as tk
from tkinter import ttk, messagebox, filedialog
import threading
import json
import os
import scryfall_api

class SetupView(ttk.Frame):
    """
    The initial setup screen for the application.
    Handles downloading or loading data.
    """
    def __init__(self, master, on_load_request, on_start_request):
        super().__init__(master)
        self.master = master
        self.on_load_request = on_load_request
        self.on_start_request = on_start_request

        self.oracle_file_path = None
        self.sets_file_path = None

        # --- UI Components ---
        ttk.Label(self, text="Welcome to the MTG Card Manager!", font=("Helvetica", 16)).pack(pady=(20, 10))
        ttk.Label(self, text="Load data to begin.", font=("Helvetica", 10)).pack(pady=(0, 20))

        # --- Main Options ---
        self.main_options_frame = ttk.Frame(self)
        self.main_options_frame.pack(fill=tk.X, expand=True)

        download_frame = ttk.LabelFrame(self.main_options_frame, text="Option 1: Download Fresh Data")
        download_frame.pack(fill=tk.X, padx=20, pady=10)
        ttk.Button(download_frame, text="Download Scryfall Data", command=self.download_data_thread).pack(pady=10, ipadx=10, ipady=5)

        local_frame = ttk.LabelFrame(self.main_options_frame, text="Option 2: Use Local Files")
        local_frame.pack(fill=tk.X, padx=20, pady=10)
        oracle_frame = ttk.Frame(local_frame)
        oracle_frame.pack(fill=tk.X, padx=10, pady=5)
        ttk.Label(oracle_frame, text="Oracle Card Data:").pack(side=tk.LEFT)
        self.oracle_file_label = ttk.Label(oracle_frame, text="Not selected", foreground="grey")
        self.oracle_file_label.pack(side=tk.LEFT, padx=5)
        ttk.Button(oracle_frame, text="Select...", command=self.select_oracle_file).pack(side=tk.RIGHT)

        sets_frame = ttk.Frame(local_frame)
        sets_frame.pack(fill=tk.X, padx=10, pady=5)
        ttk.Label(sets_frame, text="Sets Data:").pack(side=tk.LEFT)
        self.sets_file_label = ttk.Label(sets_frame, text="Not selected", foreground="grey")
        self.sets_file_label.pack(side=tk.LEFT, padx=5)
        ttk.Button(sets_frame, text="Select...", command=self.select_sets_file).pack(side=tk.RIGHT)

        # --- Start Button (Initially hidden) ---
        self.start_button_frame = ttk.Frame(self)
        self.start_button = ttk.Button(self.start_button_frame, text="Go to Card Selection", state=tk.DISABLED, command=self.on_start_request)
        self.start_button.pack(pady=20, ipadx=10, ipady=5)

    def select_oracle_file(self):
        file_path = filedialog.askopenfilename(title="Select Oracle Cards JSON file", filetypes=[("JSON files", "*.json")])
        if file_path:
            self.oracle_file_path = file_path
            self.oracle_file_label.config(text=os.path.basename(file_path), foreground="black")
            self.check_and_load()

    def select_sets_file(self):
        file_path = filedialog.askopenfilename(title="Select Sets JSON file", filetypes=[("JSON files", "*.json")])
        if file_path:
            self.sets_file_path = file_path
            self.sets_file_label.config(text=os.path.basename(file_path), foreground="black")
            self.check_and_load()

    def check_and_load(self):
        if self.oracle_file_path and self.sets_file_path:
            self.on_load_request(self.oracle_file_path, self.sets_file_path)

    def download_data_thread(self):
        # The main app will show the progress modal
        download_thread = threading.Thread(target=self.run_data_download)
        download_thread.start()

    def run_data_download(self):
        oracle_file_path = "oracle-cards.json"
        sets_file_path = "sets.json"
        try:
            # This part still needs its own progress handling if we want to show download %.
            # For now, the main app shows a generic "downloading" modal.
            self.master.after(0, lambda: self.master._create_progress_modal("Downloading data..."))
            
            oracle_info = scryfall_api.get_bulk_data_info()
            if not oracle_info: raise Exception("Could not get bulk data info.")
            scryfall_api.download_file(oracle_info['download_uri'], oracle_file_path)
            
            sets = scryfall_api.get_all_sets()
            if not sets: raise Exception("Could not get sets info.")
            with open(sets_file_path, "w", encoding="utf-8") as f:
                json.dump(sets, f, ensure_ascii=False, indent=4)
            
            # After download, trigger the main loading/parsing process
            self.master.after(0, lambda: self.on_load_request(oracle_file_path, sets_file_path))

        except Exception as e:
            self.master.after(0, lambda: self.master.progress_modal.destroy() if self.master.progress_modal else None)
            messagebox.showerror("Download Failed", str(e))

    def enable_start_button(self):
        """Called by the main app when data is ready."""
        self.main_options_frame.pack_forget()
        self.start_button_frame.pack(fill=tk.X, expand=True)
        self.start_button.config(state=tk.NORMAL)

    def reset_ui(self):
        """Resets the UI to its initial state after an error."""
        self.start_button_frame.pack_forget()
        self.main_options_frame.pack(fill=tk.X, expand=True)
        self.oracle_file_label.config(text="Not selected", foreground="grey")
        self.sets_file_label.config(text="Not selected", foreground="grey")
        self.oracle_file_path = None
        self.sets_file_path = None
