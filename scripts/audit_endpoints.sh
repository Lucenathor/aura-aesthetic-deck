#!/usr/bin/env bash
# Auditoría de endpoints AURA en producción (solo lecturas / acciones idempotentes seguras)
W="https://aura-chat-worker.adrian-7b9.workers.dev"
T="clinica-elvira"
pass=0; fail=0
chk(){ # nombre, url, jq_grep_esperado
  local name="$1"; local url="$2"; local expect="$3"
  local out; out=$(curl -s --max-time 20 "$url")
  if echo "$out" | grep -q "$expect"; then echo "OK   $name"; pass=$((pass+1));
  else echo "FAIL $name -> $(echo "$out" | head -c 160)"; fail=$((fail+1)); fi
}
echo "===== AUDITORÍA ENDPOINTS AURA ====="
chk "tenant config"        "$W/api/tenant/$T"                       '"name"'
chk "slots"                "$W/api/slots?tenant=$T"                 '"slots"'
chk "schedule-by-day"      "$W/api/schedule-by-day?tenant=$T"       '"schedule"'
chk "vacations"            "$W/api/vacations?tenant=$T"             '"vacations"'
chk "appointments"         "$W/api/appointments?tenant=$T"          '"appointments"'
chk "appointments x prof"  "$W/api/appointments?tenant=$T&professional=x" '"appointments"'
chk "calendar config"      "$W/api/calendar?tenant=$T"             '"config"'
chk "professionals"        "$W/api/professionals?tenant=$T"        '"professionals"'
chk "blocks"               "$W/api/blocks?tenant=$T"               '"blocks"'
chk "waitlist"             "$W/api/waitlist?tenant=$T"             '"waitlist"'
chk "leads"                "$W/api/leads?tenant=$T"                '"leads"'
chk "pipeline"             "$W/api/pipeline?tenant=$T"             '"stages"'
chk "sms-templates"        "$W/api/sms-templates?tenant=$T"        '{'
chk "sms-credits"          "$W/api/sms-credits?tenant=$T"          'credits'
chk "funnel-metrics"       "$W/api/funnel-metrics?tenant=$T"       '{'
chk "treatments"           "$W/api/treatments?tenant=$T&lead=x"    '{'
chk "dashboard overview"   "$W/api/dashboard/$T"                   'total_leads'
chk "auth/me (sin token)"  "$W/api/auth/me?token=zzz"              '"auth":false'
echo "-----------------------------------"
echo "PASS=$pass  FAIL=$fail"
