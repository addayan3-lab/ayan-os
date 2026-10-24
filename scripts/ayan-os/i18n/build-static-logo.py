"""Build AYAN static icons from the approved 256px gold landscape mark.
Offline Pillow conversion only; never runs the ComfyUI app or GPU.
"""
from pathlib import Path
from PIL import Image

root=Path(__file__).resolve().parents[3] / "public" / "ayan-os"
source=root / "ayan-mark-static.webp"
image=Image.open(source).convert("RGBA")
assert image.width>=128 and image.height>=128
image.save(root/"ayan-icon.png")
sizes=[(16,16),(24,24),(32,32),(48,48),(64,64),(128,128),(256,256)]
image.save(root/"ayan-os.ico",format="ICO",sizes=sizes)
image.save(root/"ayan-os-static.ico",format="ICO",sizes=sizes)
print("STATIC_MARK_OK",image.size)
