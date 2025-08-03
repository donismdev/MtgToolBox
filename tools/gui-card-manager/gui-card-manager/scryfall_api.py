import requests
import json
import os

# Scryfall API base URL
SCRYFALL_API_BASE_URL = "https://api.scryfall.com"

def get_bulk_data_info(data_type="oracle_cards"):
    """
    Retrieves bulk data information from Scryfall API.

    Args:
        data_type (str): The type of bulk data to retrieve info for. 
                         Defaults to "oracle_cards".

    Returns:
        dict: A dictionary containing the bulk data info, or None if an error occurs.
    """
    try:
        response = requests.get(f"{SCRYFALL_API_BASE_URL}/bulk-data")
        response.raise_for_status()
        for bulk_data in response.json()["data"]:
            if bulk_data["type"] == data_type:
                return bulk_data
    except requests.exceptions.RequestException as e:
        print(f"Error fetching bulk data info: {e}")
        return None

def download_file(url, local_filename, progress_callback=None):
    """
    Downloads a file from a URL to a local path with a progress callback.

    Args:
        url (str): The URL of the file to download.
        local_filename (str): The local path to save the file to.
        progress_callback (function, optional): A function to call with progress updates.
                                                 It should accept (current_bytes, total_bytes).
    """
    try:
        with requests.get(url, stream=True) as r:
            r.raise_for_status()
            total_length = int(r.headers.get('content-length'))
            with open(local_filename, 'wb') as f:
                dl = 0
                for chunk in r.iter_content(chunk_size=8192):
                    dl += len(chunk)
                    f.write(chunk)
                    if progress_callback:
                        progress_callback(dl, total_length)
        print("\nDownload Complete.")
    except requests.exceptions.RequestException as e:
        print(f"\nError downloading file: {e}")


def get_all_sets():
    """
    Retrieves all sets from the Scryfall API.

    Returns:
        list: A list of set objects, or an empty list if an error occurs.
    """
    try:
        response = requests.get(f"{SCRYFALL_API_BASE_URL}/sets")
        response.raise_for_status()
        return response.json()["data"]
    except requests.exceptions.RequestException as e:
        print(f"Error fetching sets: {e}")
        return []

if __name__ == '__main__':
    # Example usage of the module
    
    # 1. Get oracle cards bulk data info
    oracle_cards_info = get_bulk_data_info()
    if oracle_cards_info:
        print("Oracle Cards Info:")
        print(f"  URI: {oracle_cards_info['download_uri']}")
        print(f"  Size: {oracle_cards_info['size']} bytes")

        # 2. Download the oracle cards data
        download_url = oracle_cards_info['download_uri']
        local_file = "oracle-cards.json"
        print(f"\nDownloading {local_file}...")
        download_file(download_url, local_file)

    # 3. Get all sets
    all_sets = get_all_sets()
    if all_sets:
        print(f"\nSuccessfully fetched {len(all_sets)} sets.")
        # Save sets to a file
        with open("sets.json", "w", encoding="utf-8") as f:
            json.dump(all_sets, f, ensure_ascii=False, indent=4)
        print("Saved sets to sets.json")
