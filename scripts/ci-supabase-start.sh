#!/usr/bin/env bash
# Start the throwaway local Supabase on CI, trying again when the start itself fails.
#   scripts/ci-supabase-start.sh <services to leave out, comma separated>
#
# `supabase start` sometimes fails on the runner before any migration runs (starting or
# pulling a container): twice on 2026-11-16, both passed on a re-run. Each failed try is
# cleaned up and shown as a warning; three failures (a real migration error fails every
# time) fail the job as before.
set -u
exclude="${1:?services to leave out}"
attempts=3
for attempt in $(seq 1 "$attempts"); do
  if supabase start -x "$exclude"; then
    [ "$attempt" -gt 1 ] && echo "::notice::supabase start succeeded on attempt $attempt of $attempts"
    exit 0
  fi
  echo "::warning::supabase start failed (attempt $attempt of $attempts)"
  [ "$attempt" -eq "$attempts" ] && break
  supabase stop --no-backup || true
  sleep $((attempt * 15))
done
echo "::error::supabase start failed $attempts times"
exit 1
