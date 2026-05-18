import json
import urllib.request

def login(email, password='ScholarTest1!'):
    body = json.dumps({'email': email, 'password': password}).encode('utf-8')
    req = urllib.request.Request(
        'http://127.0.0.1:4000/api/auth/login',
        data=body,
        headers={'Content-Type': 'application/json'},
    )
    with urllib.request.urlopen(req, timeout=10) as r:
        data = json.load(r)
    return data['token']

print('AI:', login('free.ai.student@scholar.local'))
print('ENG:', login('premium.engineering.student@scholar.local'))
