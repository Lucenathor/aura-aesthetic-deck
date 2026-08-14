#!/usr/bin/env bash
set -u

BASE_URL="https://auracrm.co/dashboard?t=aura-demo&token=agui1780967104"
AUDIT_ROOT="/home/ubuntu/aura-presentation/audit/browser"
PROFILE_DIR="/tmp/aura-audit-chromium"

rm -rf "$PROFILE_DIR"
mkdir -p "$AUDIT_ROOT/dom" "$AUDIT_ROOT/screens"

views=(resumen pacientes pipeline agenda caja whatsapp inventario portal embudo contenido equipo ajustes admin)

for view in "${views[@]}"; do
  url="${BASE_URL}#${view}"
  chromium --headless --no-sandbox --disable-gpu --hide-scrollbars \
    --user-data-dir="$PROFILE_DIR" \
    --window-size=1440,1200 \
    --virtual-time-budget=6500 \
    --run-all-compositor-stages-before-draw \
    --screenshot="$AUDIT_ROOT/screens/${view}.png" \
    --dump-dom "$url" > "$AUDIT_ROOT/dom/${view}.html" 2> "$AUDIT_ROOT/${view}.stderr" || true

  active=$(grep -oP '<section[^>]*class="[^"]*\bon\b[^"]*"[^>]*id="v-[^"]+"|<section[^>]*id="v-[^"]+"[^>]*class="[^"]*\bon\b[^"]*"' "$AUDIT_ROOT/dom/${view}.html" | head -1 | grep -oP 'id="v-[^"]+' | cut -d'"' -f2 || true)
  errors=$(grep -oEi 'no se pudo cargar|error de conexión|error al cargar|error inesperado|forbidden|unauthorized' "$AUDIT_ROOT/dom/${view}.html" | sort -u | tr '\n' ',' | sed 's/,$//' || true)
  screenshot_state="NO"
  [[ -s "$AUDIT_ROOT/screens/${view}.png" ]] && screenshot_state="SÍ"
  printf '%s\t%s\t%s\t%s\n' "$view" "${active:-SIN_ACTIVA}" "$screenshot_state" "${errors:-ninguno}" >> "$AUDIT_ROOT/resultados.tsv"
done

printf 'VISTA\tSECCIÓN_ACTIVA\tCAPTURA\tERRORES_VISIBLES\n' > "$AUDIT_ROOT/resumen.tsv"
sort "$AUDIT_ROOT/resultados.tsv" >> "$AUDIT_ROOT/resumen.tsv"
cat "$AUDIT_ROOT/resumen.tsv"
