import re

with open("main.py", "r", encoding="utf-8") as f:
    code = f.read()

# 1. Imports
code = code.replace("from database import db", "from database import SessionLocal, get_db\nfrom sqlalchemy.orm import Session\nfrom sqlalchemy import desc\nfrom models import User, ListeningHistory\nfrom fastapi import Depends")

# 2. Endpoints
# def get_context
code = re.sub(
    r'async def get_context\(token: str\):(.*?)doc = db.collection\("users"\).document\(user_id\).get\(\)\n\s+current = doc.to_dict\(\).get\("current_context", "None"\) if doc.exists else "None"',
    r'async def get_context(token: str, db: Session = Depends(get_db)):\1user = db.query(User).filter(User.id == user_id).first()\n    current = user.current_context if user else "None"',
    code, flags=re.DOTALL
)

# async def retroactive_session_update
# Since retroactive_session_update is called by BackgroundTasks, we need SessionLocal inside it.
code = re.sub(
    r'async def retroactive_session_update\(user_id: str, new_context: str\):(.*?)docs = db\.collection\("listening_history"\)\\(.*?)\.limit\(30\)\\(.*?)\.stream\(\)',
    r'async def retroactive_session_update(user_id: str, new_context: str):\n    with SessionLocal() as db:\n        docs_list = db.query(ListeningHistory).filter(ListeningHistory.tenant_id == user_id).order_by(desc(ListeningHistory.time)).limit(30).all()',
    code, flags=re.DOTALL
)
code = re.sub(r'docs_list = list\(docs\)', '', code) # Already a list
code = re.sub(r'docs_list\[i-1\]\.to_dict\(\)\.get\("time", ""\)', r'docs_list[i-1].time', code)
code = re.sub(r'docs_list\[i\]\.to_dict\(\)\.get\("time", ""\)', r'docs_list[i].time', code)
code = re.sub(
    r'db\.collection\("listening_history"\)\.document\(doc\.id\)\.update\(\{"context": new_context\}\)',
    r'doc.context = new_context\n            db.commit()',
    code
)

# def update_context
code = re.sub(
    r'async def update_context\(request: ContextUpdate, token: str, background_tasks: BackgroundTasks\):(.*?)user_id = user_data\.get\("sub"\)\n\s+db\.collection\("users"\)\.document\(user_id\)\.set\(\{"current_context": request\.context\}, merge=True\)',
    r'async def update_context(request: ContextUpdate, token: str, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):\1user_id = user_data.get("sub")\n    user = db.query(User).filter(User.id == user_id).first()\n    if user:\n        user.current_context = request.context\n        db.commit()',
    code, flags=re.DOTALL
)

# def update_session_context
code = re.sub(
    r'async def update_session_context\(request: SessionContextUpdate, token: str\):',
    r'async def update_session_context(request: SessionContextUpdate, token: str, db: Session = Depends(get_db)):',
    code
)
code = re.sub(
    r'doc_ref = db\.collection\("listening_history"\)\.document\(doc_id\)\n\s+doc = doc_ref\.get\(\)\n\s+if not doc\.exists:\n\s+continue\n\s+data = doc\.to_dict\(\)',
    r'doc = db.query(ListeningHistory).filter(ListeningHistory.id == doc_id).first()\n        if not doc:\n            continue',
    code
)
code = re.sub(r'data\.get\("tenant_id"\)', 'doc.tenant_id', code)
code = re.sub(r'data\.get\("track_name", "Unknown"\)', 'doc.track_name or "Unknown"', code)
code = re.sub(r'data\.get\("artist_name", "Unknown"\)', 'doc.artist_name or "Unknown"', code)
code = re.sub(r'data\.get\("valence", 0\.5\)', 'doc.valence or 0.5', code)
code = re.sub(r'data\.get\("energy", 0\.5\)', 'doc.energy or 0.5', code)
code = re.sub(
    r'doc_ref\.update\(\{\n\s+"context": request\.context,\n\s+"ai_mood": mood,\n\s+"ai_analysis": ai_analysis,\n\s+"time_of_day_fit": time_fit\n\s+\}\)',
    r'doc.context = request.context\n        # Optional: Save AI fields if added to model later\n        db.commit()',
    code, flags=re.DOTALL
)

# def get_history
code = re.sub(
    r'async def get_history\(token: str, limit: int = 50\):(.*?)docs = db\.collection\("listening_history"\)\\(.*?)\.limit\(limit\)\\(.*?)\.stream\(\)',
    r'async def get_history(token: str, limit: int = 50, db: Session = Depends(get_db)):\1docs = db.query(ListeningHistory).filter(ListeningHistory.tenant_id == user_id).order_by(desc(ListeningHistory.time)).limit(limit).all()',
    code, flags=re.DOTALL
)
code = re.sub(
    r'data = doc\.to_dict\(\)\n\s+data\["id"\] = doc\.id\n\s+history\.append\(data\)',
    r'history.append({"id": doc.id, "tenant_id": doc.tenant_id, "time": doc.time, "track_name": doc.track_name, "artist_name": doc.artist_name, "context": doc.context})',
    code
)

# background loops
code = re.sub(
    r'users_ref = db\.collection\("users"\)\.stream\(\)',
    r'with SessionLocal() as db:\n            users_ref = db.query(User).all()',
    code
)
code = re.sub(r'for doc in users_ref:', r'for doc in users_ref:\n                doc_id = doc.id\n                user_dict = {"display_name": doc.display_name, "current_context": doc.current_context, "access_token_cipher": doc.access_token_cipher, "access_token_nonce": doc.access_token_nonce, "refresh_token_cipher": doc.refresh_token_cipher, "refresh_token_nonce": doc.refresh_token_nonce}', code)
code = re.sub(r'doc_id = doc\.id', r'', code, count=1) # remove duplicate doc_id
code = re.sub(r'user_dict = doc\.to_dict\(\)', r'', code)

code = re.sub(
    r'docs = db\.collection\("listening_history"\)\.where\("tenant_id", "==", user_id\)\.where\("track_id", "==", track_id\)\.stream\(\)',
    r'with SessionLocal() as db:\n                                docs = db.query(ListeningHistory).filter(ListeningHistory.tenant_id == user_id, ListeningHistory.track_id == track_id).all()',
    code
)

code = re.sub(
    r'db\.collection\("listening_history"\)\.add\(\{(.*?)\}\)',
    r'with SessionLocal() as db:\n                                new_hist = ListeningHistory(\1)\n                                db.add(new_hist)\n                                db.commit()',
    code, flags=re.DOTALL
)
# convert dictionary format to kwargs format for ListeningHistory
code = re.sub(r'"tenant_id":', 'tenant_id=', code)
code = re.sub(r'"time":', 'time=', code)
code = re.sub(r'"track_id":', 'track_id=', code)
code = re.sub(r'"track_name":', 'track_name=', code)
code = re.sub(r'"artist_name":', 'artist_name=', code)
code = re.sub(r'"duration_ms":', 'duration_ms=', code)
code = re.sub(r'"played_ms":', 'played_ms=', code)
code = re.sub(r'"listen_type":', 'listen_type=', code)
code = re.sub(r'"listen_weight":', 'listen_weight=', code)
code = re.sub(r'"valence":', 'valence=', code)
code = re.sub(r'"energy":', 'energy=', code)
code = re.sub(r'"context":', 'context=', code)

# 5 min batch queue
code = re.sub(
    r'user_doc = db\.collection\("users"\)\.document\(uid\)\.get\(\)\n\s+if user_doc\.exists:\n\s+current_context = user_doc\.to_dict\(\)\.get\("current_context", "None"\)',
    r'with SessionLocal() as db:\n                user = db.query(User).filter(User.id == uid).first()\n                if user:\n                    current_context = user.current_context',
    code
)

code = re.sub(
    r'batch_writer = db\.batch\(\)',
    r'with SessionLocal() as db:',
    code
)

code = re.sub(
    r'doc_ref = db\.collection\("listening_history"\)\.document\(\)\n\s+batch_writer\.set\(doc_ref, \{(.*?)\}\)',
    r'new_hist = ListeningHistory(\1)\n                db.add(new_hist)',
    code, flags=re.DOTALL
)

code = re.sub(
    r'batch_writer\.commit\(\)',
    r'db.commit()',
    code
)

code = re.sub(
    r'user_ref = db\.collection\("users"\)\.document\(user_id\)\.get\(\)\n\s+current = user_ref\.to_dict\(\)\.get\("current_context", "None"\) if user_ref\.exists else "None"',
    r'with SessionLocal() as db:\n            user = db.query(User).filter(User.id == user_id).first()\n            current = user.current_context if user else "None"',
    code
)


with open("main_new.py", "w", encoding="utf-8") as f:
    f.write(code)
print("done")
