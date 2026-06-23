import os
import glob

target_dir = r"p:\music spotify final boss\frontend"

files_to_check = glob.glob(os.path.join(target_dir, "**", "*.tsx"), recursive=True) + \
                 glob.glob(os.path.join(target_dir, "**", "*.ts"), recursive=True)

for file in files_to_check:
    with open(file, "r", encoding="utf-8") as f:
        content = f.read()

    original = content
    
    # Replace /telemetry/ with /api/telemetry/
    content = content.replace("onrender.com/telemetry/", "onrender.com/api/telemetry/")
    # Replace /auth/ with /api/auth/
    content = content.replace("onrender.com/auth/", "onrender.com/api/auth/")
    # Replace /settings/ with /api/settings/
    content = content.replace("onrender.com/settings/", "onrender.com/api/settings/")
    
    # Also handle the baseUrl cases where it might just use /auth or /telemetry
    content = content.replace("baseUrl + '/telemetry/", "baseUrl + '/api/telemetry/")
    content = content.replace('baseUrl + "/telemetry/', 'baseUrl + "/api/telemetry/')
    content = content.replace("baseUrl + '/auth/", "baseUrl + '/api/auth/")
    content = content.replace('baseUrl + "/auth/', 'baseUrl + "/api/auth/')

    if content != original:
        with open(file, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"Updated {file}")

print("Done updating API routes.")
