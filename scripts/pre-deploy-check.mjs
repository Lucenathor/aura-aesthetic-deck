/**
 * PRE-DEPLOY CHECK — AURA Landing Protection
 * ============================================
 * Este script verifica que el index.html (landing) contiene el hero agresivo
 * correcto ANTES de desplegar. Si no lo contiene, BLOQUEA el despliegue.
 *
 * Ejecutar: node scripts/pre-deploy-check.mjs
 * Se ejecuta automáticamente desde deploy.sh
 */

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(import.meta.dirname, '..');
const INDEX = resolve(ROOT, 'mvp/index.html');

// Marcadores obligatorios que DEBEN estar en la landing
const REQUIRED_MARKERS = [
  { text: 'pierden pacientes', desc: 'Píldora hero (clínicas que pierden pacientes)' },
  { text: 'AURA los convierte', desc: 'Línea de conversión (AURA los convierte en citas)' },
  { text: 'composer', desc: 'Input de nombre de clínica (composer)' },
  { text: 'Ver mi demo', desc: 'Botón CTA (Ver mi demo)' },
];

// Marcadores que NO deben estar (indican que se puso el pitch deck por error)
const FORBIDDEN_MARKERS = [
  { text: 'PITCH DECK ANIMADO', desc: 'Pitch deck animado (NO es la landing)' },
  { text: 'El SaaS escalable que', desc: 'Hero del pitch deck (NO es la landing)' },
  { text: '#deck{position:fixed', desc: 'CSS del pitch deck (NO es la landing)' },
];

console.log('🛡️  AURA Pre-Deploy Check');
console.log('========================\n');

if (!existsSync(INDEX)) {
  console.error('❌ FATAL: mvp/index.html NO EXISTE');
  process.exit(1);
}

const html = readFileSync(INDEX, 'utf-8');
let errors = 0;

console.log('✓ Verificando marcadores OBLIGATORIOS en la landing...');
for (const m of REQUIRED_MARKERS) {
  if (!html.includes(m.text)) {
    console.error(`  ❌ FALTA: "${m.text}" — ${m.desc}`);
    errors++;
  } else {
    console.log(`  ✅ ${m.desc}`);
  }
}

console.log('\n✓ Verificando que NO sea el pitch deck...');
for (const m of FORBIDDEN_MARKERS) {
  if (html.includes(m.text)) {
    console.error(`  ❌ DETECTADO: "${m.text}" — ${m.desc}`);
    console.error(`     ⚠️  Parece que index.html es el PITCH DECK, no la landing de ventas.`);
    errors++;
  } else {
    console.log(`  ✅ No es ${m.desc}`);
  }
}

console.log('\n✓ Verificando tamaño del archivo...');
const lines = html.split('\n').length;
if (lines < 500) {
  console.error(`  ❌ El archivo tiene solo ${lines} líneas (debería tener ~2400+)`);
  errors++;
} else {
  console.log(`  ✅ ${lines} líneas (OK)`);
}

console.log('');
if (errors > 0) {
  console.error(`\n🚫 DESPLIEGUE BLOQUEADO — ${errors} error(es) detectado(s)`);
  console.error('   La landing NO es la correcta. Restaura desde GitHub:');
  console.error('   git checkout dd3c1d6 -- mvp/index.html');
  process.exit(1);
} else {
  console.log('✅ Landing verificada correctamente. Despliegue permitido.\n');
  process.exit(0);
}
