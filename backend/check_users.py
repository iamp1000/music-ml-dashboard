import sys
from database import SessionLocal
from models import User, ListeningHistory
from sqlalchemy import func

try:
    db = SessionLocal()
    
    users = db.query(User).all()
    print("--- USERS IN DATABASE ---")
    for u in users:
        print(f"User ID: {u.id} | Name: {u.display_name} | Email: {u.email}")
        
    print("\n--- LISTENING HISTORY DISTRIBUTION ---")
    counts = db.query(ListeningHistory.tenant_id, func.count(ListeningHistory.id)).group_by(ListeningHistory.tenant_id).all()
    for tenant_id, count in counts:
        user_name = next((u.display_name for u in users if u.id == tenant_id), "Unknown")
        print(f"User ID {tenant_id} ({user_name}): {count} songs")
        
except Exception as e:
    print(f"Error checking database: {e}")
