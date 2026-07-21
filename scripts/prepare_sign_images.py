import os
import sys
import argparse
from PIL import Image

def process_images(source_dir, output_dir):
    """
    Finds, resizes/pads, and copies letters A-Z images to static/img/signs/.
    Supports both subfolders named by letter and files starting with letter.
    """
    if not os.path.exists(source_dir):
        print(f"[ERROR] Source directory '{source_dir}' does not exist.")
        sys.exit(1)

    os.makedirs(output_dir, exist_ok=True)
    supported_extensions = ('.png', '.jpg', '.jpeg', '.webp', '.bmp')
    
    # Track which letters were successfully matched
    found_letters = {}

    # Scan the source directory
    # 1. Look for subfolders representing letters (e.g. source_dir/A/)
    # 2. Look for standalone files representing letters (e.g. source_dir/a.png)
    all_items = os.listdir(source_dir)
    
    for letter_code in range(ord('A'), ord('Z') + 1):
        letter = chr(letter_code)
        found_path = None
        
        # Check subdirectories first
        for item in all_items:
            item_path = os.path.join(source_dir, item)
            if os.path.isdir(item_path) and item.upper() == letter:
                # Find first image inside this subfolder
                for file_in_dir in os.listdir(item_path):
                    if file_in_dir.lower().endswith(supported_extensions):
                        found_path = os.path.join(item_path, file_in_dir)
                        break
            if found_path:
                break
                
        # If not found in subdirs, check files starting with the letter
        if not found_path:
            for item in all_items:
                item_path = os.path.join(source_dir, item)
                if os.path.isfile(item_path) and item.lower().endswith(supported_extensions):
                    # Check if filename starts with the letter (e.g., a.png, A_gesture.jpg, a-1.webp)
                    name_without_ext = os.path.splitext(item)[0]
                    if name_without_ext.upper() == letter or (
                        name_without_ext.upper().startswith(letter) and not name_without_ext[1:2].isalpha()
                    ):
                        found_path = item_path
                        break
                        
        if found_path:
            found_letters[letter] = found_path
        else:
            found_letters[letter] = None

    # Process and save found letters
    processed_count = 0
    for letter, src_path in found_letters.items():
        dest_path = os.path.join(output_dir, f"{letter}.png")
        if src_path:
            try:
                # Resize/normalize to 300x300, keeping aspect ratio with transparent padding
                with Image.open(src_path) as img:
                    # Convert to RGBA for transparent padding
                    img = img.convert("RGBA")
                    
                    # Create thumbnail keeping aspect ratio
                    img.thumbnail((300, 300), Image.Resampling.LANCZOS)
                    
                    # Create new transparent background 300x300 image
                    new_img = Image.new("RGBA", (300, 300), (255, 255, 255, 0))
                    
                    # Center the thumbnail
                    x = (300 - img.width) // 2
                    y = (300 - img.height) // 2
                    new_img.paste(img, (x, y))
                    
                    # Save as PNG
                    new_img.save(dest_path, "PNG")
                    print(f"[OK] Processed {letter}: '{src_path}' -> '{dest_path}'")
                    processed_count += 1
            except Exception as e:
                print(f"[ERROR] Failed processing letter {letter} from '{src_path}': {e}")
        else:
            print(f"[WARNING] Missing source image for letter: {letter}")

    print("-" * 50)
    print(f"[SUMMARY] Successfully processed {processed_count}/26 letters.")
    if processed_count < 26:
        missing = [l for l, path in found_letters.items() if not path]
        print(f"[INFO] Missing letters list: {', '.join(missing)}")
        print("[INFO] Note: Motion-based letters like J and Z may need representative manual frames.")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Normalize and pad ISL sign images to 300x300 PNG.")
    parser.add_argument("source_dir", help="Directory containing source sign images/folders")
    parser.add_argument("--output_dir", default=os.path.join("static", "img", "signs"), help="Destination signs directory")
    
    args = parser.parse_args()
    
    # Ensure working directory is correct if run from project root
    project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    os.chdir(project_root)
    
    process_images(args.source_dir, args.output_dir)
