import asyncio
from datetime import datetime
from database import db as firebase_db
from tidb_database import SessionLocal, init_tidb
from models import User, ListeningHistory

def migrate_users(session):
    print("Migrating users...")
    users_ref = firebase_db.collection('users').stream()
    count = 0
    for doc in users_ref:
        data = doc.to_dict()
        user_id = doc.id
        
        # Check if exists
        existing = session.query(User).filter(User.id == user_id).first()
        if not existing:
            new_user = User(
                id=user_id,
                name=data.get('name'),
                email=data.get('email'),
                picture=data.get('picture'),
                current_context=data.get('current_context', 'None'),
                created_at=datetime.utcnow() # Approximation if not in firebase
            )
            session.add(new_user)
            count += 1
            
    session.commit()
    print(f"Migrated {count} users.")

def migrate_listening_history(session):
    print("Migrating listening history...")
    history_ref = firebase_db.collection('listening_history').stream()
    count = 0
    batch_size = 500
    for doc in history_ref:
        data = doc.to_dict()
        
        # Ensure user exists (in case history exists for a deleted user)
        tenant_id = data.get('tenant_id')
        if not tenant_id:
            continue
            
        existing_user = session.query(User).filter(User.id == tenant_id).first()
        if not existing_user:
            new_user = User(id=tenant_id, name="Unknown")
            session.add(new_user)
            session.commit()
            
        new_hist = ListeningHistory(
            tenant_id=tenant_id,
            time=data.get('time'),
            track_id=data.get('track_id'),
            track_name=data.get('track_name'),
            artist_name=data.get('artist_name'),
            duration_ms=data.get('duration_ms'),
            played_ms=data.get('played_ms'),
            listen_type=data.get('listen_type'),
            listen_weight=data.get('listen_weight'),
            valence=data.get('valence'),
            energy=data.get('energy'),
            context=data.get('context'),
            ml_features=data.get('ml_features'),
            sync_source=data.get('sync_source')
        )
        session.add(new_hist)
        count += 1
        
        if count % batch_size == 0:
            session.commit()
            print(f"Committed {count} records...")
            
    session.commit()
    print(f"Migrated {count} listening history records.")

if __name__ == "__main__":
    with SessionLocal() as session:
        migrate_users(session)
        migrate_listening_history(session)
    print("Migration complete!")
