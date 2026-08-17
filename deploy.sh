#!/bin/bash
# ============================================================
# AURA — Script de despliegue seguro
# ============================================================
# USO: ./deploy.sh [worker|pages|all]
#
# Este script:
# 1. Verifica la sintaxis JS del dashboard
# 2. Verifica que la landing sea la correcta (NO el pitch deck)
# 3. Despliega Worker y/o Pages según el argumento
# 4. Purga la caché de Cloudflare
# 5. Hace push a GitHub como backup
# ============================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

# Token de Cloudflare — exportar antes de ejecutar:
# export CLOUDFLARE_API_TOKEN='tu-token-aqui'
if [ -z "$CLOUDFLARE_API_TOKEN" ]; then
  echo -e "${RED}❌ Falta CLOUDFLARE_API_TOKEN. Exporta antes de ejecutar:${NC}"
  echo "   export CLOUDFLARE_API_TOKEN='cfat_...'"
  exit 1
fi

MODE="${1:-all}"

echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}  AURA — Despliegue Seguro${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# PASO 1: Verificar sintaxis JS
echo -e "${GREEN}[1/5]${NC} Verificando sintaxis JavaScript..."
node scripts/check_html_scripts.mjs
if [ $? -ne 0 ]; then
  echo -e "${RED}❌ Error de sintaxis. Corrige antes de desplegar.${NC}"
  exit 1
fi
echo ""

# PASO 2: Verificar landing (CRÍTICO)
echo -e "${GREEN}[2/5]${NC} Verificando integridad de la landing..."
node scripts/pre-deploy-check.mjs
if [ $? -ne 0 ]; then
  echo -e "${RED}❌ DESPLIEGUE CANCELADO — La landing no es correcta.${NC}"
  exit 1
fi

# PASO 3: Desplegar
if [ "$MODE" = "worker" ] || [ "$MODE" = "all" ]; then
  echo -e "${GREEN}[3/5]${NC} Desplegando Worker..."
  cd worker && npx wrangler deploy && cd ..
  echo ""
fi

if [ "$MODE" = "pages" ] || [ "$MODE" = "all" ]; then
  echo -e "${GREEN}[4/5]${NC} Desplegando Pages..."
  npx wrangler pages deploy mvp --project-name aura-mvp --branch main --commit-dirty=true
  echo ""
fi

# PASO 4: Purgar caché
echo -e "${GREEN}[5/5]${NC} Purgando caché de Cloudflare..."
curl -sS -X POST 'https://api.cloudflare.com/client/v4/zones/2f820fa534a00cba90dd70d603206ad3/purge_cache' \
  -H 'X-Auth-Email: adrian@lucenathor.com' \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"purge_everything":true}' > /dev/null 2>&1
echo -e "${GREEN}✅ Caché purgada${NC}"
echo ""

# PASO 5: Push a GitHub
echo -e "${GREEN}[BACKUP]${NC} Sincronizando con GitHub..."
git add -A 2>/dev/null || true
git commit -m "deploy: $(date '+%Y-%m-%d %H:%M') — $MODE" 2>/dev/null || true
git push origin main --force 2>/dev/null || true
echo ""

echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  ⏳ Verificando rutas críticas post-deploy...${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# PASO 6: Post-deploy check (embudos, landing, dashboard)
sleep 5  # Esperar propagación de Cloudflare
echo -e "${GREEN}[POST-DEPLOY]${NC} Verificando que los embudos de clientes funcionan..."
node scripts/post-deploy-check.mjs
if [ $? -ne 0 ]; then
  echo -e "${RED}🚨 POST-DEPLOY FALLIDO — Los embudos NO funcionan correctamente.${NC}"
  echo -e "${RED}   Revisa mvp/_redirects y mvp/_t/index.html${NC}"
  echo -e "${RED}   La regla DEBE ser: /c/*  /_t/  200${NC}"
  exit 1
fi

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  ✅ DESPLIEGUE COMPLETADO Y VERIFICADO — auracrm.co OK${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
