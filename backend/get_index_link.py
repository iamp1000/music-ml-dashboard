import os
import sys
from google.cloud import firestore
from database import db

try:
    print("Testing query to generate Firestore Index URL...")
    docs = db.collection("listening_history") \
             .where(filter=firestore.FieldFilter("tenant_id", "==", "dummy")) \
             .order_by("time", direction=firestore.Query.DESCENDING) \
             .limit(1).stream()
             
    for doc in docs:
        pass
    print("Query succeeded. No index needed or it's already built.")
except Exception as e:
    print("\n--------------------------------------------------")
    print("INDEX CREATION LINK FOUND:")
    print(str(e))
    print("--------------------------------------------------")
