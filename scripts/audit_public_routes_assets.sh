#!/usr/bin/env bash
set -u

BASE_URL="https://auracrm.co"
ROOT_DIR="/home/ubuntu/aura-presentation/mvp"
OUTPUT="/home/ubuntu/aura-presentation/audit/public_route_asset_audit.txt"

mkdir -p "$(dirname "$OUTPUT")"
: > "$OUTPUT"

check_url() {
  local url="$1"
  local label="$2"
  local headers status content_type
  headers=$(curl -sSI --max-time 15 -H "User-Agent: Mozilla/5.0 AURA-QA/1.0" "$url" 2>/dev/null || true)
  status=$(printf '%s\n' "$headers" | awk '/^HTTP\// {code=$2} END {print code+0}')
  content_type=$(printf '%s\n' "$headers" | awk -F': ' 'tolower($1)=="content-type" {print $2}' | tail -1 | tr -d '\r')
  printf '%s\t%s\t%s\t%s\n' "$label" "$status" "$content_type" "$url" >> "$OUTPUT"
}

printf 'AURA — Auditoría de rutas y assets\nGenerada: %s\n\n' "$(date -u +'%Y-%m-%dT%H:%M:%SZ')" >> "$OUTPUT"
printf 'TIPO\tHTTP\tCONTENT-TYPE\tURL\n' >> "$OUTPUT"

routes=(
  "/"
  "/dashboard"
  "/dashboard.html"
  "/c/clinica-elvira"
  "/legal/aviso-legal.html"
  "/legal/privacidad.html"
  "/legal/cookies.html"
  "/legal/terminos.html"
  "/favicon.ico"
  "/favicon-16.png"
  "/favicon-32.png"
  "/favicon-512.png"
  "/apple-touch-icon.png"
  "/portal-manifest.json"
)

for route in "${routes[@]}"; do
  check_url "${BASE_URL}${route}" "RUTA"
done

while IFS= read -r asset; do
  rel="${asset#$ROOT_DIR}"
  check_url "${BASE_URL}${rel}" "ASSET"
done < <(find "$ROOT_DIR/assets" -maxdepth 1 -type f | sort)

printf '\nERRORES (HTTP distinto de 200/301/302/307/308):\n' >> "$OUTPUT"
awk -F'\t' 'NR>4 && $2 !~ /^(200|301|302|307|308)$/ {print}' "$OUTPUT" >> "$OUTPUT"

printf '\nPOSIBLES HTML DEVUELTOS COMO ASSET:\n' >> "$OUTPUT"
awk -F'\t' '$1=="ASSET" && $3 ~ /^text\/html/ {print}' "$OUTPUT" >> "$OUTPUT"

cat "$OUTPUT"
