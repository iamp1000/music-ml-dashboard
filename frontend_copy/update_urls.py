import os
import glob
import re

target_dir = r"p:\music spotify final boss\frontend"

# We want to replace instances of "https://music-ml-dashboard.onrender.com..." with a dynamic string
http_replacement = "`${typeof window !== 'undefined' && window.location.hostname === 'localhost' ? 'http://localhost:8000' : 'https://music-ml-dashboard.onrender.com'}`"
ws_replacement = "`${typeof window !== 'undefined' && window.location.hostname === 'localhost' ? 'ws://localhost:8000' : 'wss://music-ml-dashboard.onrender.com'}`"

# We also need to handle cases where it was inside backticks: `https://music-ml-dashboard.onrender.com/endpoint...`
# We'll replace the exact substring 'https://music-ml-dashboard.onrender.com'

files_to_check = glob.glob(os.path.join(target_dir, "**", "*.tsx"), recursive=True) + \
                 glob.glob(os.path.join(target_dir, "**", "*.ts"), recursive=True)

for file in files_to_check:
    with open(file, "r", encoding="utf-8") as f:
        content = f.read()

    original = content
    
    # 1. Replace "https://music-ml-dashboard.onrender.com"
    # Wait, some places use "https://music-ml-dashboard.onrender.com/something", others use `https://music-ml-dashboard.onrender.com/...`
    # It's better to replace just the domain part if it's already inside backticks, or convert "" to backticks.
    
    # If it's "https://music-ml-dashboard.onrender.com/..." -> change to `${...}/...`
    # Let's just find and replace the literal domain:
    # "https://music-ml-dashboard.onrender.com" -> `${typeof window !== 'undefined' && window.location.hostname === 'localhost' ? 'http://localhost:8000' : 'https://music-ml-dashboard.onrender.com'}`
    
    content = content.replace('"https://music-ml-dashboard.onrender.com', '`${typeof window !== \'undefined\' && window.location.hostname === \'localhost\' ? \'http://localhost:8000\' : \'https://music-ml-dashboard.onrender.com\'}')
    content = content.replace("'https://music-ml-dashboard.onrender.com", "`${typeof window !== 'undefined' && window.location.hostname === 'localhost' ? 'http://localhost:8000' : 'https://music-ml-dashboard.onrender.com'}")
    
    # For backtick ones: `https://music-ml-dashboard.onrender.com/api...`
    content = content.replace("`https://music-ml-dashboard.onrender.com", "`${typeof window !== 'undefined' && window.location.hostname === 'localhost' ? 'http://localhost:8000' : 'https://music-ml-dashboard.onrender.com'}")

    content = content.replace("`wss://music-ml-dashboard.onrender.com", "`${typeof window !== 'undefined' && window.location.hostname === 'localhost' ? 'ws://localhost:8000' : 'wss://music-ml-dashboard.onrender.com'}")
    content = content.replace("'music-ml-dashboard.onrender.com'", "(typeof window !== 'undefined' && window.location.hostname === 'localhost' ? 'localhost:8000' : 'music-ml-dashboard.onrender.com')")

    if content != original:
        with open(file, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"Updated {file}")

print("Done updating URLs.")
