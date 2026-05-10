import json
import os
import subprocess
import sys
import time
from pathlib import Path

try:
    import requests
except ImportError:
    requests = None

ROOT_DIR = Path(r'c:/Users/Marsu/Desktop/Flex/scholar')
BACKEND_DIR = ROOT_DIR / 'scholar-backend'
FRONTEND_DIR = ROOT_DIR / 'scholar-f'
BACKEND_URL = 'http://localhost:4000'
FRONTEND_URL = 'http://localhost:3000'
REPORT = {'passed': [], 'failed': [], 'warnings': [], 'errors': []}
SERVICE_PROCS = {}
STARTUP_ISSUES = []


def section(name):
    print('\n' + f'[{name}]')
    print('-' * (len(name) + 2))


def safe_run(cmd, cwd=None, timeout=120):
    try:
        result = subprocess.run(
            cmd,
            cwd=cwd,
            capture_output=True,
            text=True,
            shell=False,
            env=os.environ.copy(),
            timeout=timeout,
        )
        return result
    except subprocess.TimeoutExpired as exc:
        return subprocess.CompletedProcess(cmd, 1, stdout=exc.stdout or '', stderr=str(exc))
    except OSError as exc:
        return subprocess.CompletedProcess(cmd, 1, stdout='', stderr=str(exc))


def find_package_manager():
    npm_cmd = 'npm.cmd' if os.name == 'nt' else 'npm'
    npm_result = safe_run([npm_cmd, '--version'], cwd=ROOT_DIR, timeout=30)
    if npm_result.returncode == 0:
        return [npm_cmd]

    corepack_cmd = 'corepack.cmd' if os.name == 'nt' else 'corepack'
    corepack_result = safe_run([corepack_cmd, 'npm', '--version'], cwd=ROOT_DIR, timeout=30)
    if corepack_result.returncode == 0:
        return [corepack_cmd, 'npm']

    raise RuntimeError('Could not find npm or corepack on PATH. Install npm or ensure corepack is available.')


def runtime_versions():
    versions = {
        'python': sys.version.splitlines()[0],
        'node': safe_run(['node', '--version'], cwd=ROOT_DIR, timeout=30).stdout.strip(),
    }
    try:
        pm = find_package_manager()
        versions['package_manager'] = ' '.join(pm)
    except RuntimeError as exc:
        versions['package_manager'] = f'ERROR ({exc})'
    return versions


def is_http_up(url, timeout=3):
    if requests is None:
        return False
    try:
        resp = requests.get(url, timeout=timeout)
        return resp.status_code < 500
    except Exception:
        return False


def wait_http(url, timeout=30):
    deadline = time.time() + timeout
    while time.time() < deadline:
        if is_http_up(url):
            return True
        time.sleep(1)
    return False


def start_service(name, cwd, command, ready_url):
    if is_http_up(ready_url):
        section('STARTUP')
        print(f'{name} already running at {ready_url}')
        return None

    print(f'Starting {name}...')
    proc = subprocess.Popen(
        command,
        cwd=cwd,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        shell=False,
        env=os.environ.copy(),
    )
    SERVICE_PROCS[name] = proc

    if wait_http(ready_url, timeout=45):
        print(f'{name} is ready at {ready_url}')
        return proc

    print(f'WARNING: {name} did not become ready at {ready_url} within timeout')
    STARTUP_ISSUES.append(f'{name} did not become ready in time')
    return proc


def shutdown_services():
    section('SHUTDOWN')
    for name, proc in SERVICE_PROCS.items():
        if proc is None:
            continue
        if proc.poll() is not None:
            print(f'{name} already exited')
            continue
        print(f'Terminating {name}...')
        proc.terminate()
        try:
            proc.wait(timeout=10)
            print(f'{name} terminated gracefully')
        except subprocess.TimeoutExpired:
            print(f'{name} did not stop in time, killing')
            proc.kill()
            proc.wait(timeout=5)
            print(f'{name} killed')


def node_eval(script, cwd=BACKEND_DIR, timeout=120):
    result = safe_run(['node', '-e', script], cwd=cwd, timeout=timeout)
    if result.returncode != 0:
        raise RuntimeError(f'node eval failed: {result.stderr.strip() or result.stdout.strip()}')
    return result.stdout.strip()


def inspect_users_schema():
    script = "const { Client } = require('pg'); require('dotenv').config(); (async () => { const client = new Client({ connectionString: process.env.DATABASE_URL }); await client.connect(); const res = await client.query(\"SELECT column_name FROM information_schema.columns WHERE table_name='users' ORDER BY ordinal_position;\"); console.log(JSON.stringify(res.rows)); await client.end(); })().catch(err => { console.error(err); process.exit(1); });"
    out = node_eval(script)
    rows = json.loads(out)
    return [row['column_name'] for row in rows]


def alter_users_columns():
    script = "const { Client } = require('pg'); require('dotenv').config(); (async () => { const client = new Client({ connectionString: process.env.DATABASE_URL }); await client.connect(); await client.query(\"ALTER TABLE users ADD COLUMN IF NOT EXISTS plan_type TEXT NOT NULL DEFAULT 'free'\"); await client.query(\"ALTER TABLE users ADD COLUMN IF NOT EXISTS ai_requests_today INTEGER NOT NULL DEFAULT 0\"); await client.query(\"ALTER TABLE users ADD COLUMN IF NOT EXISTS ai_requests_reset_at TIMESTAMPTZ NOT NULL DEFAULT NOW()\"); await client.query(\"ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_status TEXT NOT NULL DEFAULT 'active'\"); await client.end(); console.log('OK'); })().catch(err => { console.error(err); process.exit(1); });"
    out = node_eval(script)
    print(out)


def run_node_script(script_path):
    section('SEEDING')
    print(f'Running {script_path}...')
    result = safe_run(['node', script_path], cwd=BACKEND_DIR, timeout=300)
    if result.returncode != 0:
        print(f'ERROR running {script_path}')
        print('stdout:', result.stdout.strip())
        print('stderr:', result.stderr.strip())
        raise RuntimeError(f'Script failed: {script_path}')
    print(result.stdout.strip())


def seed_edge_cases():
    script = (
        "const { query } = require('./src/infra/db/neonClient');"
        "(async () => {"
        " const exists = await query(\"SELECT id FROM scholarships WHERE title = $1 LIMIT 1\", ['Expired Test Scholarship']);"
        " if (!exists.rows.length) {"
        " await query(\"INSERT INTO scholarships (title, organization_name, country, degree_level, field_of_study, funding_type, deadline, description, application_url, status, amount, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,NOW(),NOW())\", ['Expired Test Scholarship','Test Foundation','USA','master','Computer Science','Partial','2000-01-01','Expired scholarship for regression tests.','https://example.com/apply','expired','Partial funding']); }"
        " const incomplete = await query(\"SELECT id FROM scholarships WHERE title = $1 LIMIT 1\", ['Incomplete Test Scholarship']);"
        " if (!incomplete.rows.length) {"
        " await query(\"INSERT INTO scholarships (title, organization_name, country, degree_level, field_of_study, status, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,NOW(),NOW())\", ['Incomplete Test Scholarship','Test Incomplete','Canada','bachelor','Business','verified']); }"
        " await query(\"UPDATE users SET ai_requests_today = 0\");"
        " console.log('edge cases seeded'); await process.exit(0);"
        "})().catch(err => { console.error(err); process.exit(1); });"
    )
    out = node_eval(script)
    print(out)


def http_post(url, json_data=None, headers=None, cookies=None):
    if requests is None:
        raise RuntimeError('requests package is required')
    return requests.post(url, json=json_data, headers=headers or {}, cookies=cookies or {}, timeout=30)


def http_get(url, headers=None, cookies=None, params=None):
    if requests is None:
        raise RuntimeError('requests package is required')
    return requests.get(url, headers=headers or {}, cookies=cookies or {}, params=params or {}, timeout=30)


def login(email, password='ScholarTest1!'):
    url = f'{BACKEND_URL}/api/auth/login'
    resp = http_post(url, json_data={'email': email, 'password': password})
    if resp.status_code != 200:
        raise RuntimeError(f'Login failed for {email}: {resp.status_code} {resp.text}')
    payload = resp.json()
    token = payload.get('token') or payload.get('accessToken')
    return {'token': token, 'cookies': resp.cookies, 'user': payload.get('user', {})}


def fetch_route(path, headers=None, params=None):
    url = f'{BACKEND_URL}{path}'
    return http_get(url, headers=headers or {}, params=params)


def fetch_recommendations(token=None, query=None):
    headers = {}
    if token:
        headers['Authorization'] = f'Bearer {token}'
    params = {'q': query} if query is not None else {}
    return http_get(f'{BACKEND_URL}/api/recommendations', headers=headers, params=params)


def print_recs(response):
    try:
        data = response.json()
    except Exception:
        print('Invalid JSON response:', response.status_code)
        print(response.text[:500])
        return None
    print('status', response.status_code)
    print('planType', data.get('planType'), 'aiRequestsToday', data.get('aiRequestsToday'), 'aiRequestsLimit', data.get('aiRequestsLimit'), 'aiRequestsRemaining', data.get('aiRequestsRemaining'))
    for i, rec in enumerate(data.get('results', [])[:5], 1):
        title = rec.get('title')
        print(f"{i}. {title}")
        print('   confidence', rec.get('recommendationConfidence'), 'eligibility', (rec.get('eligibility') or {}).get('status'))
    return data


def api_health_check():
    possible_paths = ['/api/health', '/', '/api']
    for path in possible_paths:
        try:
            resp = http_get(f'{BACKEND_URL}{path}')
            if resp.status_code < 500:
                return True, path, resp.status_code
        except Exception:
            continue
    return False, None, None


def frontend_health_check():
    possible_paths = ['/', '/recommendations', '/dashboard']
    for path in possible_paths:
        try:
            resp = http_get(f'{FRONTEND_URL}{path}')
            if resp.status_code < 500:
                return True, path, resp.status_code
        except Exception:
            continue
    return False, None, None


def check_db_connection():
    script = "const { Client } = require('pg'); require('dotenv').config(); (async () => { const client = new Client({ connectionString: process.env.DATABASE_URL }); await client.connect(); const res = await client.query('SELECT 1 AS ok'); console.log(JSON.stringify(res.rows)); await client.end(); })().catch(err => { console.error(err); process.exit(1); });"
    out = node_eval(script)
    return 'ok' in out


def run_recommendation_simulation(user_email, pinned_query):
    auth = login(user_email)
    plan = auth['user'].get('planType') or auth['user'].get('plan_type') or 'unknown'
    section('API TESTS')
    print(f'Running recommendations for {user_email} plan={plan}')
    response = fetch_recommendations(token=auth['token'], query=pinned_query)
    data = print_recs(response)
    if response.status_code == 200 and isinstance(data, dict):
        REPORT['passed'].append(f'recommendations for {user_email}')
    else:
        REPORT['failed'].append(f'recommendations failed for {user_email}')
    return data


def run_search_simulation(query):
    section('API TESTS')
    print(f'Running scholarship search for query={query}')
    response = fetch_route('/api/scholarships/search', params={'q': query})
    try:
        data = response.json()
    except Exception:
        data = None
    print('status', response.status_code)
    print('body preview', response.text[:300].replace('\n', ' '))
    if response.status_code == 200 and data is not None:
        REPORT['passed'].append('scholarships search')
    else:
        REPORT['failed'].append('scholarships search')
    return data


def run_free_premium_simulation():
    section('API TESTS')
    free_email = 'free.ai.student@scholar.local'
    premium_email = 'premium.cyber.student@scholar.local'
    try:
        free_auth = login(free_email)
        premium_auth = login(premium_email)
    except Exception as exc:
        REPORT['failed'].append('login simulation')
        print('Login simulation failed:', exc)
        return

    print('Free plan user status:', free_auth['user'].get('planType') or free_auth['user'].get('plan_type'))
    print('Premium plan user status:', premium_auth['user'].get('planType') or premium_auth['user'].get('plan_type'))

    for user_label, auth in [('free', free_auth), ('premium', premium_auth)]:
        for i in range(2):
            response = fetch_recommendations(token=auth['token'], query='machine learning scholarships')
            print(f'{user_label} request #{i + 1}', response.status_code)
            try:
                body = response.json()
            except Exception:
                body = {}
            if response.status_code == 200:
                REPORT['passed'].append(f'{user_label} recommendation request #{i + 1}')
            else:
                REPORT['failed'].append(f'{user_label} recommendation request #{i + 1}')
            if user_label == 'free':
                remaining = body.get('aiRequestsRemaining')
                limit = body.get('aiRequestsLimit')
                print('free remaining', remaining, 'limit', limit)
            if user_label == 'premium':
                if body.get('aiRequestsLimit') is not None and body.get('aiRequestsLimit') > 0:
                    REPORT['passed'].append('premium request limit visible')

    if 'locked' in response.text.lower() or 'disabled' in response.text.lower():
        REPORT['warnings'].append('locked feature response detected')


if __name__ == '__main__':
    if requests is None:
        print('requests package is required. please install it with: pip install requests')
        sys.exit(1)

    section('STARTUP')
    runtimes = runtime_versions()
    for tool, version in runtimes.items():
        print(f'{tool}: {version}')

    backend_proc = None
    frontend_proc = None
    try:
        try:
            pm_cmd = find_package_manager()
        except RuntimeError as exc:
            REPORT['failed'].append('package manager detection')
            print('Package manager detection failed:', exc)
            pm_cmd = None

        if pm_cmd:
            backend_proc = start_service('backend', BACKEND_DIR, pm_cmd + ['run', 'dev'], BACKEND_URL)
            frontend_proc = start_service('frontend', FRONTEND_DIR, pm_cmd + ['run', 'dev'], FRONTEND_URL)
        else:
            STARTUP_ISSUES.append('Unable to start services because no package manager was detected')

        backend_ready, backend_path, backend_status = api_health_check()
        if backend_ready:
            print(f'Backend responded at {backend_path} status={backend_status}')
            REPORT['passed'].append('backend health check')
        else:
            REPORT['failed'].append('backend health check')
            STARTUP_ISSUES.append('backend API did not respond')

        frontend_ready, frontend_path, frontend_status = frontend_health_check()
        if frontend_ready:
            print(f'Frontend responded at {frontend_path} status={frontend_status}')
            REPORT['passed'].append('frontend health check')
        else:
            REPORT['failed'].append('frontend health check')
            STARTUP_ISSUES.append('frontend did not respond')

        try:
            if check_db_connection():
                print('DB connection verified')
                REPORT['passed'].append('database connection')
        except Exception as exc:
            REPORT['failed'].append('database connection')
            print('DB check failed:', exc)

        section('SEEDING')
        try:
            cols = inspect_users_schema()
            print('users schema columns:', cols)
            if 'plan_type' not in cols:
                print('Adding missing columns to users table')
                alter_users_columns()
                cols = inspect_users_schema()
                print('users schema after alter:', cols)
        except Exception as exc:
            REPORT['failed'].append('schema inspection')
            print('Schema inspection failed:', exc)

        for script_name in ['scripts/seed-test-scholarships.js', 'scripts/seed-test-profiles.js']:
            try:
                run_node_script(script_name)
            except Exception as exc:
                REPORT['failed'].append(script_name)
                print(f'Seeding failed for {script_name}:', exc)

        try:
            seed_edge_cases()
        except Exception as exc:
            REPORT['failed'].append('seed edge cases')
            print('Edge-case seeding failed:', exc)

        section('API TESTS')
        test_queries = [
            'AI scholarships in Canada',
            'business scholarships in Japan',
            'cybersecurity phd',
            'urgent scholarships',
            "fully funded master's",
        ]
        test_users = [
            'free.ai.student@scholar.local',
            'free.business.student@scholar.local',
            'premium.cyber.student@scholar.local',
            'premium.engineering.student@scholar.local',
        ]
        for email in test_users:
            try:
                data = run_recommendation_simulation(email, test_queries[0])
                if data is None:
                    REPORT['failed'].append(f'{email} recommendations parse')
            except Exception as exc:
                REPORT['failed'].append(f'{email} recommendation execution')
                print(f'Recommendation test failed for {email}:', exc)

        try:
            run_search_simulation('computer science scholarships')
        except Exception as exc:
            REPORT['failed'].append('scholarships search simulation')
            print('Scholarships search simulation failed:', exc)

        run_free_premium_simulation()

        section('FRONTEND TESTS')
        for path in ['/', '/recommendations', '/dashboard']:
            try:
                resp = http_get(f'{FRONTEND_URL}{path}')
                print(f'GET {path} ->', resp.status_code)
                if resp.status_code < 500:
                    REPORT['passed'].append(f'frontend {path}')
                else:
                    REPORT['failed'].append(f'frontend {path}')
            except Exception as exc:
                REPORT['failed'].append(f'frontend {path}')
                print(f'Frontend request failed for {path}:', exc)

        section('PERFORMANCE')
        start_time = time.time()
        try:
            resp = http_get(f'{BACKEND_URL}/api/recommendations', params={'q': 'scholarships'})
            duration = time.time() - start_time
            print(f'backend /api/recommendations response {resp.status_code} in {duration:.2f}s')
            if duration > 5.0:
                REPORT['warnings'].append(f'/api/recommendations response slow: {duration:.2f}s')
            else:
                REPORT['passed'].append('recommendations latency')
        except Exception as exc:
            REPORT['failed'].append('recommendations latency')
            print('Performance check failed:', exc)

    finally:
        shutdown_services()

    section('SUMMARY')
    print('passed:', len(REPORT['passed']))
    print('failed:', len(REPORT['failed']))
    print('warnings:', len(REPORT['warnings']))
    print('errors:', len(REPORT['errors']))
    if STARTUP_ISSUES:
        print('startup issues:')
        for issue in STARTUP_ISSUES:
            print(' -', issue)
    if REPORT['failed']:
        print('\nFAILED ITEMS:')
        for item in REPORT['failed']:
            print(' -', item)
    if REPORT['warnings']:
        print('\nWARNINGS:')
        for item in REPORT['warnings']:
            print(' -', item)
    if REPORT['errors']:
        print('\nERRORS:')
        for item in REPORT['errors']:
            print(' -', item)
    sys.exit(1 if REPORT['failed'] else 0)
