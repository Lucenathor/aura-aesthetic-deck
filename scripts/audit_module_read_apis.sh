#!/usr/bin/env bash
set -u

WORKER="https://aura-chat-worker.adrian-7b9.workers.dev"
TENANT="aura-demo"
TOKEN="${AURA_AUDIT_TOKEN:-}"
OUTPUT="/home/ubuntu/aura-presentation/audit/module_read_api_audit.txt"

if [ -z "$TOKEN" ]; then
  echo "Falta AURA_AUDIT_TOKEN; nunca guardes sesiones dentro del repositorio." >&2
  exit 1
fi

mkdir -p "$(dirname "$OUTPUT")"
printf 'AURA — Auditoría de APIs de solo lectura\nGenerada: %s\n\n' "$(date -u +'%Y-%m-%dT%H:%M:%SZ')" > "$OUTPUT"
printf 'MÓDULO\tHTTP\tRESULTADO\tENDPOINT\n' >> "$OUTPUT"

check_api() {
  local module="$1"
  local path="$2"
  local response status body result
  response=$(curl -sS --max-time 15 -w $'\n%{http_code}' -H "User-Agent: Mozilla/5.0 AURA-QA/1.0" -H "Authorization: Bearer ${TOKEN}" "${WORKER}${path}" 2>/dev/null || true)
  status=$(printf '%s\n' "$response" | tail -n1)
  body=$(printf '%s\n' "$response" | sed '$d' | tr '\n' ' ' | cut -c1-240)
  result="OK"
  if [[ ! "$status" =~ ^2[0-9][0-9]$ ]]; then
    result="ERROR_HTTP"
  elif printf '%s' "$body" | grep -qiE '"error"[[:space:]]*:[[:space:]]*"(forbidden|unauthorized|not_found|invalid_token)|<!doctype html>'; then
    result="ERROR_API"
  fi
  printf '%s\t%s\t%s\t%s\n' "$module" "${status:-SIN_RESPUESTA}" "$result" "$path" >> "$OUTPUT"
}

check_api "Sesión" "/api/auth/me"
check_api "Resumen/tenencia" "/api/tenant-meta?tenant=${TENANT}"
check_api "CRM/Pacientes" "/api/leads?tenant=${TENANT}"
check_api "Pipeline" "/api/pipeline?tenant=${TENANT}"
check_api "Agenda/Citas" "/api/appointments?tenant=${TENANT}"
check_api "Agenda/Calendario" "/api/calendar?tenant=${TENANT}"
check_api "Agenda/Profesionales" "/api/professionals?tenant=${TENANT}"
check_api "Agenda/Horarios" "/api/schedule-by-day?tenant=${TENANT}&date=2026-08-12"
check_api "Agenda/Vacaciones" "/api/vacations?tenant=${TENANT}"
check_api "Métricas" "/api/advanced-metrics?tenant=${TENANT}"
check_api "Métricas/recuperado" "/api/recovered?tenant=${TENANT}&period=month"
check_api "Caja" "/api/cashbox?tenant=${TENANT}"
check_api "Caja/bonos" "/api/bonos?tenant=${TENANT}"
check_api "Caja/costes" "/api/business-costs?tenant=${TENANT}"
check_api "Caja/beneficio" "/api/profit?tenant=${TENANT}"
check_api "Inventario/productos" "/api/inv-products?tenant=${TENANT}"
check_api "Inventario/alertas" "/api/inv-alerts?tenant=${TENANT}"
check_api "Inventario/recetas" "/api/inv-recipes?tenant=${TENANT}"
check_api "Ajustes/catálogo" "/api/treatment-catalog?tenant=${TENANT}"
check_api "Ajustes/SMS" "/api/sms-credits?tenant=${TENANT}"
check_api "Ajustes/plantillas SMS" "/api/sms-templates?tenant=${TENANT}"
check_api "Ajustes/fidelización" "/api/loyalty-config?tenant=${TENANT}"
check_api "Ajustes/consentimientos" "/api/consent-templates?tenant=${TENANT}"
check_api "Portal cliente" "/api/portal-info?tenant=${TENANT}"
check_api "Portal/clientes" "/api/portal-clients?tenant=${TENANT}"
check_api "Portal/packs" "/api/packs?tenant=${TENANT}"
check_api "Embudos/contenido" "/api/content?tenant=${TENANT}"
check_api "Embudos/métricas" "/api/funnel-metrics?tenant=${TENANT}"
check_api "Contenido viral" "/api/viral-content?tenant_id=${TENANT}&week=2026-W33"
check_api "Contenido/ranking" "/api/viral-ranking-monthly?tenant_id=${TENANT}"
check_api "Equipo" "/api/team?tenant=${TENANT}"
check_api "WhatsApp/estado" "/api/wa-status?tenant=${TENANT}"
check_api "WhatsApp/chats" "/api/wa-chats?tenant=${TENANT}"
check_api "Llamadas" "/api/call-config?tenant=${TENANT}"

printf '\nRESUMEN\n' >> "$OUTPUT"
printf 'Total: ' >> "$OUTPUT"; awk -F'\t' 'NR>4 && $1!="RESUMEN" {n++} END {print n+0}' "$OUTPUT" >> "$OUTPUT"
printf 'Correctas: ' >> "$OUTPUT"; awk -F'\t' '$3=="OK" {n++} END {print n+0}' "$OUTPUT" >> "$OUTPUT"
printf 'Con error: ' >> "$OUTPUT"; awk -F'\t' '$3 ~ /^ERROR/ {n++} END {print n+0}' "$OUTPUT" >> "$OUTPUT"

cat "$OUTPUT"
