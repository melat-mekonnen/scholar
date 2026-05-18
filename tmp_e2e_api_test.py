import json
import urllib.request
import urllib.error
import time

AI_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkZjk2ODVjMS0zNmE3LTQ5ZTQtODEwNC05N2RjNDJlNjQzZDUiLCJlbWFpbCI6ImZyZWUuYWkuc3R1ZGVudEBzY2hvbGFyLmxvY2FsIiwiZnVsbE5hbWUiOiJGcmVlIEFJIFN0dWRlbnQiLCJyb2xlIjoic3R1ZGVudCIsInBsYW5UeXBlIjoiZnJlZSIsInN1YnNjcmlwdGlvblN0YXR1cyI6ImFjdGl2ZSIsImlhdCI6MTc3ODk0NjY4NCwiZXhwIjoxNzc5NTUxNDg0fQ._CMTF9rzWmQa5nWqhbFnbek9dU7Ey7YLrpSRhiMauEQ"
ENG_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxOTFkMDE2NC01MDViLTRjN2MtYTAzMy1iNWQyMmZmYTRlZWIiLCJlbWFpbCI6InByZW1pdW0uZW5naW5lZXJpbmcuc3R1ZGVudEBzY2hvbGFyLmxvY2FsIiwiZnVsbE5hbWUiOiJQcmVtaXVtIEVuZ2luZWVyaW5nIFN0dWRlbnQiLCJyb2xlIjoic3R1ZGVudCIsInBsYW5UeXBlIjoicHJlbWl1bSIsInN1YnNjcmlwdGlvblN0YXR1cyI6ImFjdGl2ZSIsImlhdCI6MTc3ODk0NjY4NSwiZXhwIjoxNzc5NTUxNDg1fQ.I8KOsq1zdsqKbTCk7O0ehHdiKsTVmFaqBjFbIvCPhYc"
BACKEND = "http://127.0.0.1:4000"

def call_recommend(token):
    req = urllib.request.Request(f"{BACKEND}/api/recommendations", headers={"Authorization": f"Bearer {token}"})
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            return json.load(r)
    except urllib.error.HTTPError as e:
        try:
            return json.loads(e.read().decode())
        except:
            return {"error": str(e)}
    except Exception as e:
        return {"error": str(e)}

def summarize(resp):
    if not isinstance(resp, dict):
        return {"error": "invalid response"}
    results = resp.get('results', [])
    top5 = results[:5]
    ids = [r.get('id') for r in top5]
    scores = [r.get('finalScore') for r in top5]
    return {
        'modelVersion': resp.get('modelVersion'),
        'fallbackUsed': bool(resp.get('fallbackUsed')),
        'fallbackReason': resp.get('fallbackReason'),
        'top5_ids': ids,
        'top5_scores': scores,
        'raw_total': resp.get('total')
    }

if __name__ == '__main__':
    import os
    ai = os.environ.get('AI_TOKEN')
    eng = os.environ.get('ENG_TOKEN')
    if not ai or not eng:
        print('Please set AI_TOKEN and ENG_TOKEN environment variables')
        raise SystemExit(1)
    AI_TOKEN = ai
    ENG_TOKEN = eng

    print('Fetching ML-on (AI student)')
    a_ml = call_recommend(AI_TOKEN)
    print(json.dumps(summarize(a_ml), indent=2))

    print('\nFetching ML-on (ENG student)')
    e_ml = call_recommend(ENG_TOKEN)
    print(json.dumps(summarize(e_ml), indent=2))

    print('\nWaiting 1s then capturing timestamps for ML-off test...')
    time.sleep(1)
    print('Now run the ML-down scenario then re-run this script with ML down to collect fallback responses.')
    print('\nFull responses saved to tmp_e2e_api_responses.json')
    with open('tmp_e2e_api_responses.json','w') as f:
        json.dump({'ai_ml': a_ml, 'eng_ml': e_ml}, f, indent=2)
