import google.auth
from google.oauth2 import service_account
import google.auth.transport.requests
import requests

try:
    creds = service_account.Credentials.from_service_account_file(
        'P:\\music spotify final boss\\backend\\firebase-adminsdk.json',
        scopes=['https://www.googleapis.com/auth/cloud-platform']
    )
    auth_req = google.auth.transport.requests.Request()
    creds.refresh(auth_req)
    token = creds.token

    url = "https://firestore.googleapis.com/v1/projects/music-dash-ecf12/databases?databaseId=(default)"
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    data = {
        "type": "FIRESTORE_NATIVE",
        "locationId": "nam5"
    }

    resp = requests.post(url, headers=headers, json=data)
    print("Status:", resp.status_code)
    print("Response:", resp.text)
except Exception as e:
    print("Error:", e)
