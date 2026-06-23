import urllib.request
import json
import ssl
from urllib.request import HTTPDigestAuthHandler, build_opener, install_opener
from urllib.request import HTTPDigestAuthHandler, build_opener, install_opener

public_key = '438JNJ70'
private_key = 'e385c6a4-1519-4619-afa2-3ecd74e9c3c1'

url = "https://api.tidbcloud.com/api/v1beta/projects"

auth_handler = HTTPDigestAuthHandler()
auth_handler.add_password(realm='tidb', uri=url, user=public_key, passwd=private_key)
# Usually realm is returned by server, so we can use a custom opener that handles the 401 challenge
passman = urllib.request.HTTPPasswordMgrWithDefaultRealm()
passman.add_password(None, url, public_key, private_key)
authhandler = urllib.request.HTTPDigestAuthHandler(passman)

# Ignore SSL
ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

opener = urllib.request.build_opener(urllib.request.HTTPSHandler(context=ctx), authhandler)

try:
    project_id = '1372813089454797403'
    cluster_id = '10854854518488047461'
    user_name = '2u2TczwT65g96ET.root'
    url = f"https://api.tidbcloud.com/api/v1beta/projects/{project_id}/clusters/{cluster_id}/users/{user_name}/reset_password"
    
    passman.add_password(None, url, public_key, private_key)
    authhandler = urllib.request.HTTPDigestAuthHandler(passman)
    opener = urllib.request.build_opener(urllib.request.HTTPSHandler(context=ctx), authhandler)

    data = json.dumps({"password": "Spotify123456!"}).encode('utf-8')
    req = urllib.request.Request(url, data=data, method='POST')
    req.add_header('Content-Type', 'application/json')
    
    res = opener.open(req)
    print("Reset Password Success!")
    print(res.read().decode())
except Exception as e:
    print(f"Failed to reset password: {e}")
