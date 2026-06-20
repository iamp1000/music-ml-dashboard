import base64
import os

gif_path = r"p:\music spotify final boss\el-pp.gif"
public_dir = r"p:\music spotify final boss\frontend\public"
svg_path = os.path.join(public_dir, "noise.svg")

with open(gif_path, "rb") as image_file:
    encoded_string = base64.b64encode(image_file.read()).decode('utf-8')

svg_content = f"""<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
    <image href="data:image/gif;base64,{encoded_string}" width="100%" height="100%" preserveAspectRatio="xMidYMid slice" />
</svg>"""

with open(svg_path, "w", encoding="utf-8") as f:
    f.write(svg_content)

print(f"Created {svg_path} embedding the GIF.")

# Let's also do it for the favicon
favicon_path = os.path.join(public_dir, "favicon.svg")
with open(favicon_path, "w", encoding="utf-8") as f:
    f.write(svg_content)
    
print(f"Created {favicon_path} embedding the GIF.")
