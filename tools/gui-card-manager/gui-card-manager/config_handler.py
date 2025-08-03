import os
import json

CONFIG_FILE = os.path.join("assets", "misc.json")

def load_config():
    """Loads the configuration from misc.json."""
    if not os.path.exists(CONFIG_FILE):
        return None
    try:
        with open(CONFIG_FILE, 'r') as f:
            return json.load(f)
    except (json.JSONDecodeError, IOError):
        return None

def save_config(oracle_path, sets_path):
    """
    Saves the given paths to the configuration file.
    Ensures the assets directory exists.
    """
    config = {
        'oracle_path': oracle_path,
        'sets_path': sets_path
    }
    try:
        os.makedirs(os.path.dirname(CONFIG_FILE), exist_ok=True)
        with open(CONFIG_FILE, 'w') as f:
            json.dump(config, f, indent=4)
    except IOError as e:
        print(f"Error saving config: {e}")

def validate_config(config):
    """Checks if the paths stored in the config object are valid files."""
    if not isinstance(config, dict):
        return False
    oracle_path = config.get('oracle_path')
    sets_path = config.get('sets_path')
    if not oracle_path or not sets_path:
        return False
    if not os.path.exists(oracle_path) or not os.path.exists(sets_path):
        return False
    return True

def delete_config():
    """Deletes the config file if it exists."""
    if os.path.exists(CONFIG_FILE):
        try:
            os.remove(CONFIG_FILE)
        except OSError as e:
            print(f"Error deleting config file: {e}")
