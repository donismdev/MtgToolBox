import os
from PIL import Image

# Base directory for storing cached images
CACHE_BASE_DIR = os.path.join("assets", "cardimage")

def get_image_filepath(card):
    """
    Constructs a unique, safe filepath for a given card object.

    Args:
        card (dict): The Scryfall card object.

    Returns:
        str: The full, safe path to where the image should be cached.
    """
    set_code = card.get('set', 'unknown_set')
    collector_number = card.get('collector_number', '0')
    card_name = card.get('name', 'unknown_card')

    # Sanitize card name to prevent issues with special characters in filenames
    safe_card_name = "".join(c for c in card_name if c.isalnum() or c in (' ', '-')).rstrip()

    filename = f"{safe_card_name}_{collector_number}.jpg"
    
    return os.path.join(CACHE_BASE_DIR, set_code, filename)

def check_cache(card):
    """
    Checks if an image for the given card exists in the local cache.

    Args:
        card (dict): The Scryfall card object.

    Returns:
        str or None: The filepath if the image exists, otherwise None.
    """
    filepath = get_image_filepath(card)
    if os.path.exists(filepath):
        return filepath
    return None

def save_image(card, image_data):
    """
    Saves image data to the local cache.

    Args:
        card (dict): The Scryfall card object.
        image_data (bytes): The raw image data to save.
    """
    filepath = get_image_filepath(card)
    # Ensure the directory exists
    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    
    try:
        with open(filepath, 'wb') as f:
            f.write(image_data)
    except IOError as e:
        print(f"Error saving image {filepath}: {e}")

def load_image_from_cache(card):
    """
    Loads a PIL Image object from the local cache.

    Args:
        card (dict): The Scryfall card object.

    Returns:
        Image or None: The PIL Image object if it exists, otherwise None.
    """
    filepath = check_cache(card)
    if filepath:
        try:
            return Image.open(filepath)
        except IOError as e:
            print(f"Error opening cached image {filepath}: {e}")
    return None
