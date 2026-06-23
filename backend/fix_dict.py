import re

with open("main_new.py", "r", encoding="utf-8") as f:
    code = f.read()

# Fix track_name= to "track_name": inside {}
code = re.sub(r'track_name= ', r'"track_name": ', code)
code = re.sub(r'artist_name= ', r'"artist_name": ', code)
code = re.sub(r'duration_ms= ', r'"duration_ms": ', code)
code = re.sub(r'played_ms= ', r'"played_ms": ', code)
code = re.sub(r'listen_type= ', r'"listen_type": ', code)
code = re.sub(r'listen_weight= ', r'"listen_weight": ', code)
code = re.sub(r'valence= ', r'"valence": ', code)
code = re.sub(r'energy= ', r'"energy": ', code)
code = re.sub(r'context= ', r'"context": ', code)
code = re.sub(r'time= ', r'"time": ', code)

with open("main_new.py", "w", encoding="utf-8") as f:
    f.write(code)
print("done")
