#!/usr/bin/env python3
"""Run backend tests against a disposable PostgreSQL; never use the project's .env DB."""
import os
from pathlib import Path
import secrets
import subprocess
import sys
import time

ROOT = Path(__file__).resolve().parents[1]
PYTHON = ROOT / 'backend' / '.venv' / 'bin' / 'python'


def main():
    if not PYTHON.exists():
        raise SystemExit('Install backend/.venv and requirements-dev.txt first.')
    name = f'priut-check-{secrets.token_hex(5)}'
    password = secrets.token_hex(20)
    created = False
    try:
        # Password is random for this disposable container, not a project secret.
        subprocess.run(['docker', 'run', '-d', '--rm', '--name', name,
            '-e', 'POSTGRES_USER=test', '-e', f'POSTGRES_PASSWORD={password}',
            '-e', 'POSTGRES_DB=priut_test', '-p', '127.0.0.1::5432', 'postgres:17'],
            check=True, stdout=subprocess.DEVNULL)
        created = True
        for _ in range(30):
            result = subprocess.run(['docker', 'exec', name, 'pg_isready', '-U', 'test', '-d', 'priut_test'],
                                    stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=5)
            if result.returncode == 0:
                break
            time.sleep(1)
        else:
            raise SystemExit('Temporary PostgreSQL did not become ready.')
        address = subprocess.check_output(['docker', 'port', name, '5432/tcp'], text=True).strip()
        port = address.rsplit(':', 1)[1]
        url = f'postgresql+asyncpg://test:{password}@127.0.0.1:{port}/priut_test'
        env = {**os.environ, 'TEST_DATABASE_URL': url, 'DATABASE_URL': url}
        print('Testing against disposable PostgreSQL; real MAX delivery is mocked.', flush=True)
        result = subprocess.run([str(PYTHON), '-m', 'pytest', '-q'], cwd=ROOT/'backend', env=env)
        if result.returncode:
            return result.returncode
        return subprocess.run([str(PYTHON), '-m', 'alembic', 'check'], cwd=ROOT/'backend', env=env).returncode
    finally:
        if created:
            subprocess.run(['docker', 'stop', name], stdout=subprocess.DEVNULL, check=False)


if __name__ == '__main__':
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        sys.exit(130)
