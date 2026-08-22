#!/usr/bin/env bash
set -u

ROOT="/home/ubuntu/aura-presentation"
BASE="http://127.0.0.1:4173/dashboard.html"
OUT="$ROOT/audit/graphs-responsive"
PROFILE="/tmp/aura-graphs-chromium"

LINE=$(grep '^BASE_URL=' "$ROOT/scripts/audit_dashboard_browser.sh")
TOKEN=${LINE##*token=}
TOKEN=${TOKEN%\"}
if [ -z "$TOKEN" ]; then
  echo "No se pudo recuperar el token de auditoría existente" >&2
  exit 1
fi

rm -rf "$PROFILE" "$OUT"
mkdir -p "$OUT"
printf 'TENANT\tVIEWPORT\tEMPTY_CHARTS\tEMPTY_SPARKS\tCANVASES\tSCREENSHOT\n' > "$OUT/results.tsv"

tenants=(aura-demo clinicaespana)
viewports=(desktop tablet tablet-long mobile mobile-long)
sizes=(1440,1200 1024,1000 1024,1900 390,844 390,2600)

for tenant in "${tenants[@]}"; do
  mkdir -p "$OUT/$tenant"
  for i in "${!viewports[@]}"; do
    viewport=${viewports[$i]}
    size=${sizes[$i]}
    dom="$OUT/$tenant/$viewport.html"
    shot="$OUT/$tenant/$viewport.png"
    stderr="$OUT/$tenant/$viewport.stderr"
    chromium --headless --no-sandbox --disable-gpu --hide-scrollbars \
      --user-data-dir="$PROFILE-$tenant-$viewport" \
      --window-size="$size" \
      --virtual-time-budget=10000 \
      --run-all-compositor-stages-before-draw \
      --screenshot="$shot" \
      --dump-dom "$BASE?t=$tenant&token=$TOKEN#resumen" > "$dom" 2> "$stderr" || true
    empty_charts=$(grep -oE 'class="[^"]*aura-chart-box[^"]*is-empty[^"]*"' "$dom" | wc -l | tr -d ' ')
    empty_sparks=$(grep -oE 'class="[^"]*aura-spark[^"]*is-empty[^"]*"' "$dom" | wc -l | tr -d ' ')
    canvases=$(grep -o '<canvas' "$dom" | wc -l | tr -d ' ')
    screenshot="NO"; [ -s "$shot" ] && screenshot="SÍ"
    printf '%s\t%s\t%s\t%s\t%s\t%s\n' "$tenant" "$viewport" "$empty_charts" "$empty_sparks" "$canvases" "$screenshot" >> "$OUT/results.tsv"
  done
done

cat "$OUT/results.tsv"
