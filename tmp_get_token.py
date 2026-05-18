import json
import urllib.request

body = json.dumps({"email": "ml.test.student@scholar.local", "password": "Test1234!"}).encode("utf-8")
req = urllib.request.Request(
    "http://127.0.0.1:4000/api/auth/login",
    data=body,
    headers={"Content-Type": "application/json"},
)
with urllib.request.urlopen(req, timeout=10) as r:
    data = json.load(r)
print(data.get("token", ""))
