import os
import requests
from pathlib import Path

BASE_URL = "http://localhost:4000"
TEST_FILES_DIR = Path("c:/Users/Marsu/Desktop/Flex/scholar/test_files")

users = {
    "student": {"email": "student.role.test@scholar.local", "password": "ScholarTest1!"},
    "manager": {"email": "manager.role.test@scholar.local", "password": "ScholarTest1!"},
    "owner": {"email": "owner.role.test@scholar.local", "password": "ScholarTest1!"},
    "admin": {"email": "admin.role.test@scholar.local", "password": "ScholarTest1!"},
}

tokens = {}

def login(email, password):
    resp = requests.post(f"{BASE_URL}/api/auth/login", json={"email": email, "password": password})
    if resp.status_code == 200:
        return resp.json().get('token') or resp.cookies.get('scholar_jwt')
    return None

def test_rbac():
    print("\n--- Testing RBAC ---")
    resp = requests.get(f"{BASE_URL}/api/admin/scholarships/pending", cookies={"scholar_jwt": tokens["student"]})
    print(f"Student -> Admin Route: {resp.status_code} (Expected: 403 or 401)")
    
    resp = requests.get(f"{BASE_URL}/api/owner/observability/metrics", cookies={"scholar_jwt": tokens["manager"]})
    print(f"Manager -> Owner Route: {resp.status_code} (Expected: 403 or 401)")

    resp = requests.get(f"{BASE_URL}/api/admin/scholarships/pending", cookies={"scholar_jwt": tokens["admin"]})
    print(f"Admin -> Admin Route: {resp.status_code} (Expected: 200)")

def test_uploads():
    print("\n--- Testing Uploads ---")
    url = f"{BASE_URL}/api/documents/upload"
    
    # Valid PDF upload
    with open(TEST_FILES_DIR / "mock_document.pdf", "rb") as f:
        resp = requests.post(url, files={"file": ("mock_document.pdf", f, "application/pdf")}, cookies={"scholar_jwt": tokens["admin"]})
    print(f"Admin PDF Upload: {resp.status_code}")
    if resp.status_code == 201:
        print("  -> Upload success. DB Record:", resp.json())
        
    # Invalid EXE upload
    with open(TEST_FILES_DIR / "mock_executable.exe", "rb") as f:
        resp = requests.post(url, files={"file": ("mock_executable.exe", f, "application/x-msdownload")}, cookies={"scholar_jwt": tokens["admin"]})
    print(f"Admin EXE Upload: {resp.status_code} (Expected block/error)")
    
    # Oversized file upload
    with open(TEST_FILES_DIR / "mock_oversized.pdf", "rb") as f:
        resp = requests.post(url, files={"file": ("mock_oversized.pdf", f, "application/pdf")}, cookies={"scholar_jwt": tokens["admin"]})
    print(f"Admin Oversized Upload: {resp.status_code} (Expected 413 or error)")

def test_ai():
    print("\n--- Testing AI Engine ---")
    resp = requests.get(f"{BASE_URL}/api/recommendations?q=machine%20learning", cookies={"scholar_jwt": tokens["student"]})
    print(f"AI Recommendations (Student): {resp.status_code}")
    if resp.status_code == 200:
        data = resp.json()
        print(f"  -> Results length: {len(data.get('results', []))}")
        print(f"  -> Plan Type: {data.get('planType')}")
        print(f"  -> Requests Today: {data.get('aiRequestsToday')}")
        if len(data.get('results', [])) > 0:
            print(f"  -> First Result Semantic Score: {data['results'][0].get('semanticScore')}")

def run_all():
    print("Logging in...")
    for role, creds in users.items():
        tokens[role] = login(creds["email"], creds["password"])
        print(f"{role} logged in: {'Success' if tokens[role] else 'Failed'}")
    
    test_rbac()
    test_uploads()
    test_ai()

if __name__ == "__main__":
    run_all()
