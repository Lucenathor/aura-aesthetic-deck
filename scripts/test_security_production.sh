#!/usr/bin/env bash
set -euo pipefail

API="${AURA_API_BASE:-https://aura-chat-worker.adrian-7b9.workers.dev}"
SITE="${AURA_SITE_BASE:-https://auracrm.co}"
PASS=0
FAIL=0

check_code(){
  local name="$1" expected="$2"; shift 2
  local got
  got=$(curl -sS -o /tmp/aura_security_response -w '%{http_code}' --max-time 20 "$@" || true)
  if [ "$got" = "$expected" ]; then printf 'OK\t%s\tHTTP %s\n' "$name" "$got"; PASS=$((PASS+1));
  else printf 'FALLO\t%s\tesperado %s, recibido %s\n' "$name" "$expected" "$got"; FAIL=$((FAIL+1)); fi
}

check_code "OTP exige Turnstile" 400 -X POST "$API/api/auth/request-code" -H 'Content-Type: application/json' --data '{"email":"security-probe@example.invalid"}'
check_code "Alta de lead exige Turnstile" 400 -X POST "$API/api/leads" -H 'Content-Type: application/json' --data '{"tenant_id":"aura-demo","name":"Security probe","phone":"600000000"}'
check_code "Reserva pública exige capacidad de lead" 403 -X POST "$API/api/appointments" -H 'Content-Type: application/json' --data '{"tenant_id":"aura-demo","lead_id":"not-a-lead","date_iso":"2030-01-01T10:00:00Z"}'
check_code "Mutación de lead exige capacidad" 403 -X POST "$API/api/lead-chatted" -H 'Content-Type: application/json' --data '{"lead_id":"not-a-lead"}'
check_code "Chat ligado a lead exige capacidad" 403 -X POST "$API/chat" -H 'Content-Type: application/json' --data '{"tenant_id":"aura-demo","lead_id":"not-a-lead","messages":[]}'
check_code "Webhook Twilio status exige firma" 403 -X POST "$API/api/call-status?call_id=probe" -H 'Content-Type: application/x-www-form-urlencoded' --data 'CallStatus=completed'
check_code "Webhook Twilio recording exige firma" 403 -X POST "$API/api/call-recording?call_id=probe" -H 'Content-Type: application/x-www-form-urlencoded' --data 'RecordingUrl=https://example.invalid/audio'
check_code "Métricas exigen sesión" 403 "$API/api/advanced-metrics?tenant=aura-demo"

evil_headers=$(curl -sS -D - -o /dev/null -X OPTIONS "$API/api/advanced-metrics?tenant=aura-demo" -H 'Origin: https://evil.example' -H 'Access-Control-Request-Method: GET' | tr -d '\r')
if ! printf '%s\n' "$evil_headers" | grep -qi '^access-control-allow-origin:'; then printf 'OK\tCORS bloquea origen ajeno\n'; PASS=$((PASS+1)); else printf 'FALLO\tCORS permite origen ajeno\n'; FAIL=$((FAIL+1)); fi

good_headers=$(curl -sS -D - -o /dev/null -X OPTIONS "$API/api/advanced-metrics?tenant=aura-demo" -H 'Origin: https://auracrm.co' -H 'Access-Control-Request-Method: GET' | tr -d '\r')
if printf '%s\n' "$good_headers" | grep -qi '^access-control-allow-origin: https://auracrm.co$'; then printf 'OK\tCORS permite AURA\n'; PASS=$((PASS+1)); else printf 'FALLO\tCORS no permite AURA\n'; FAIL=$((FAIL+1)); fi

worker_headers=$(curl -sS -D - -o /dev/null "$API/api/auth/me" | tr -d '\r')
for h in 'strict-transport-security:' 'x-content-type-options: nosniff' 'cache-control: no-store'; do
  if printf '%s\n' "$worker_headers" | grep -qi "^$h"; then printf 'OK\tWorker header %s\n' "$h"; PASS=$((PASS+1)); else printf 'FALLO\tWorker sin %s\n' "$h"; FAIL=$((FAIL+1)); fi
done

if [ "${AURA_SKIP_PAGES:-0}" != "1" ]; then
  pages_headers=$(curl -sS -D - -o /dev/null "$SITE/login" | tr -d '\r')
  for h in 'content-security-policy:' 'strict-transport-security:' 'x-frame-options: DENY'; do
    if printf '%s\n' "$pages_headers" | grep -qi "^$h"; then printf 'OK\tPages header %s\n' "$h"; PASS=$((PASS+1)); else printf 'FALLO\tPages sin %s\n' "$h"; FAIL=$((FAIL+1)); fi
  done
  curl -sS --max-time 20 "$SITE/login" -o /tmp/aura_security_login.html
  if grep -q '0x4AAAAAAEYnYxmFSrnwB2Bm' /tmp/aura_security_login.html; then printf 'OK\tLogin carga Turnstile\n'; PASS=$((PASS+1)); else printf 'FALLO\tLogin sin Turnstile\n'; FAIL=$((FAIL+1)); fi
  curl -sS --max-time 20 "$SITE/c/aura-demo" -o /tmp/aura_security_funnel.html
  if grep -q 'turnstile.render' /tmp/aura_security_funnel.html; then printf 'OK\tEmbudo carga Turnstile\n'; PASS=$((PASS+1)); else printf 'FALLO\tEmbudo sin Turnstile\n'; FAIL=$((FAIL+1)); fi
fi

rm -f /tmp/aura_security_response /tmp/aura_security_login.html /tmp/aura_security_funnel.html
printf '\nResultado: %s OK, %s fallos\n' "$PASS" "$FAIL"
test "$FAIL" -eq 0
