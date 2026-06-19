import os
import json
import base64
import firebase_admin
from firebase_admin import credentials, firestore
from dotenv import load_dotenv

load_dotenv()

db = None

def init_db():
    """
    Initializes Firebase Cloud Firestore.
    """
    global db
    if not firebase_admin._apps:
        # Expected to be a base64 encoded string of the Firebase service account JSON
        firebase_b64 = os.getenv("FIREBASE_JSON_BASE64")
        if firebase_b64:
            cert_dict = json.loads(base64.b64decode(firebase_b64).decode('utf-8'))
            cred = credentials.Certificate(cert_dict)
        else:
            # Fallback for local development if the file exists directly
            cred = credentials.Certificate("firebase-adminsdk.json") if os.path.exists("firebase-adminsdk.json") else None
        
        if cred:
            firebase_admin.initialize_app(cred)
        else:
            firebase_admin.initialize_app()
    
    db = firestore.client()
    print("Firebase Firestore initialized successfully.")

# Initialize immediately for synchronous access in routers
init_db()


