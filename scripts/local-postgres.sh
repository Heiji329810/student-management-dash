#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
# Uses only this repository's private cluster, socket directory, and localhost port.
pg_bin="${STUDENT_PG_BIN:-$PWD/.local/pgsql/usr/bin}"
pg_share="${STUDENT_PG_SHARE:-$PWD/.local/pgsql/usr/share/postgresql}"
pg_data="$PWD/.local/pgdata"
mkdir -p "$PWD/.local/socket"
if [ ! -x "$pg_bin/initdb" ]; then
  echo 'Set STUDENT_PG_BIN and STUDENT_PG_SHARE to a PostgreSQL installation. See README.' >&2
  exit 1
fi
if [ ! -f "$pg_data/PG_VERSION" ]; then
  "$pg_bin/initdb" -D "$pg_data" -L "$pg_share" --auth-local=trust --auth-host=scram-sha-256 --username=student_dash >/dev/null
  chmod 700 "$PWD/.local/socket"
fi
if ! "$pg_bin/pg_ctl" -D "$pg_data" status >/dev/null 2>&1; then
  "$pg_bin/pg_ctl" -D "$pg_data" -l "$PWD/.local/postgres.log" -o "-p 55439 -k $PWD/.local/socket -h 127.0.0.1" start
fi
if [ ! -f .env ]; then
  python - <<'PY'
import secrets,os
from pathlib import Path
p=Path('.env');p.write_text('DATABASE_URL=postgresql://student_dash:'+secrets.token_urlsafe(32)+'@127.0.0.1:55439/student_dash\nBETTER_AUTH_SECRET='+secrets.token_urlsafe(48)+'\nBETTER_AUTH_URL=http://localhost:4100\nAPP_ORIGIN=http://localhost:5173\nPORT=4100\nNODE_ENV=development\nTZ=Asia/Taipei\n');p.chmod(0o600)
PY
fi
# Password travels through stdin, not command-line arguments or output.
node --env-file=.env --input-type=module -e 'const url=new URL(process.env.DATABASE_URL); if(url.hostname!=="127.0.0.1" || url.port!=="55439" || url.pathname!=="/student_dash" || url.username!=="student_dash")throw Error("Local setup requires the isolated example URL"); process.stdout.write("ALTER ROLE student_dash PASSWORD '\''"+decodeURIComponent(url.password).replaceAll("'\''","'\'''\''")+"'\'';\n");' | psql -h "$PWD/.local/socket" -p 55439 -U student_dash -d postgres -v ON_ERROR_STOP=1 >/dev/null
if ! psql -h "$PWD/.local/socket" -p 55439 -U student_dash -d postgres -Atc "SELECT 1 FROM pg_database WHERE datname='student_dash'" | rg -q '^1$'; then
 createdb -h "$PWD/.local/socket" -p 55439 -U student_dash student_dash
fi
echo 'Private PostgreSQL ready on localhost:55439; local secrets are in ignored .env.'
