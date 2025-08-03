import tkinter as tk
from tkinter import ttk, messagebox
import os
import threading
import json

from setup_view import SetupView
from main_view import MainView
from selected_card_view import SelectedCardView
import config_handler

class CardManager(tk.Tk):
    """
    The main application class. Manages views and application state.
    """
    def __init__(self):
        super().__init__()
        self.title("MTG Card Manager")
        self.geometry("1200x800")

        self.card_data = None
        self.set_data = None
        self.current_view = None
        self.progress_modal = None

        self.show_setup_view()
        self.after(100, self.check_for_saved_config) # Run after main loop starts

    def check_for_saved_config(self):
        """Checks for a valid saved config and loads it automatically."""
        config = config_handler.load_config()
        if config and config_handler.validate_config(config):
            self.load_data_async(config['oracle_path'], config['sets_path'])
        elif config: # Config exists but is invalid
            config_handler.delete_config()
            messagebox.showwarning("Config Error", "Saved configuration was invalid and has been deleted.")

    def show_setup_view(self):
        """Displays the initial data setup view."""
        if self.current_view:
            self.current_view.destroy()
        
        self.current_view = SetupView(self, on_load_request=self.load_data_async, on_start_request=self.show_main_view)
        self.current_view.pack(fill=tk.BOTH, expand=True)

    def load_data_async(self, oracle_path, sets_path):
        """
        Loads and parses data files in a background thread with a modal progress UI.
        """
        self._create_progress_modal("Parsing data...")
        loading_thread = threading.Thread(
            target=self._load_and_parse_data,
            args=(oracle_path, sets_path)
        )
        loading_thread.start()

    def _create_progress_modal(self, message):
        """Creates a modal Toplevel window to show progress."""
        self.progress_modal = tk.Toplevel(self)
        self.progress_modal.title("Loading")
        self.progress_modal.geometry("300x100")
        self.progress_modal.transient(self)
        self.progress_modal.grab_set()
        self.progress_modal.protocol("WM_DELETE_WINDOW", lambda: None) # Prevent closing

        ttk.Label(self.progress_modal, text=message).pack(pady=10)
        progress_bar = ttk.Progressbar(self.progress_modal, orient='horizontal', mode='indeterminate', length=250)
        progress_bar.pack(pady=10)
        progress_bar.start()

    def _load_and_parse_data(self, oracle_path, sets_path):
        """The actual data loading logic that runs in a separate thread."""
        try:
            with open(oracle_path, 'r', encoding='utf-8') as f:
                card_data = json.load(f)
            if not isinstance(card_data, list): raise TypeError("Oracle file is not a valid list.")

            with open(sets_path, 'r', encoding='utf-8') as f:
                sets_raw_data = json.load(f)
            set_data = sets_raw_data['data'] if isinstance(sets_raw_data, dict) and 'data' in sets_raw_data else sets_raw_data
            if not isinstance(set_data, list): raise TypeError("Sets file does not contain a valid list.")

            config_handler.save_config(oracle_path, sets_path)
            self.after(0, self.on_data_loaded, card_data, set_data)

        except Exception as e:
            self.after(0, self._show_loading_error, e)
        finally:
            if self.progress_modal:
                self.after(0, self.progress_modal.destroy)

    def _show_loading_error(self, error):
        """Displays an error message."""
        messagebox.showerror("Loading Error", f"Failed to load data files:\n\n{error}")
        if isinstance(self.current_view, SetupView):
            self.current_view.reset_ui()

    def on_data_loaded(self, card_data, set_data):
        """
        Callback for when data is successfully loaded. Enables the start button.
        """
        self.card_data = card_data
        self.set_data = set_data
        if isinstance(self.current_view, SetupView):
            self.current_view.enable_start_button()

    def show_main_view(self):
        """Displays the main card management view."""
        if self.current_view:
            self.current_view.destroy()

        self.current_view = MainView(
            self, 
            self.card_data, 
            self.set_data, 
            on_reset=self.show_setup_view,
            on_finish=self.show_results_view
        )
        self.current_view.pack(fill=tk.BOTH, expand=True)

    def show_results_view(self, added_list, discarded_list):
        """Displays the final results view."""
        if self.current_view:
            self.current_view.destroy()

        self.current_view = SelectedCardView(
            self, 
            added_list, 
            discarded_list, 
            on_back_to_main=self.show_main_view
        )
        self.current_view.pack(fill=tk.BOTH, expand=True)

if __name__ == "__main__":
    app = CardManager()
    app.mainloop()
