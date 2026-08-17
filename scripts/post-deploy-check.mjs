#!/usr/bin/env node
/**
 * POST-DEPLOY CHECK: Verifica que las rutas críticas de AURA funcionan correctamente.
 * Se ejecuta automáticamente tras cada deploy.
 * Si falla, el deploy se considera ROTO y hay que corregir antes de continuar.
 */
import { execSync } from 'child_process';

const DOMAIN = process.env.DEPLOY_URL || 'https://auracrm.co';
const TESTS = [
  {
    name: 'Embudo /c/* sirve el embudo del tratamiento (NO la landing de AURA)',
    url: `${DOMAIN}/c/aura-demo?t=labios`,
    mustContain: 'Tus labios',
    mustNotContain: 'Escribe el nombre de tu clínica',
    critical: true
  },
  {
    name: 'Landing principal sigue intacta',
    url: `${DOMAIN}/`,
    mustContain: 'WhatsApp',
    critical: true
  },
  {
    name: 'Dashboard accesible',
    url: `${DOMAIN}/dashboard`,
    mustContain: 'AURA',
    critical: false
  }
];

let failures = 0;

for (const test of TESTS) {
  try {
    const html = execSync(
      `curl -sS -L --max-time 10 '${test.url}' -H 'User-Agent: Mozilla/5.0'`,
      { encoding: 'utf-8', timeout: 15000 }
    );
    
    let pass = true;
    if (test.mustContain && !html.includes(test.mustContain)) {
      console.error(`❌ FALLO: "${test.name}"\n   No contiene: "${test.mustContain}"\n   URL: ${test.url}`);
      pass = false;
    }
    if (test.mustNotContain && html.includes(test.mustNotContain)) {
      console.error(`❌ FALLO: "${test.name}"\n   Contiene lo prohibido: "${test.mustNotContain}"\n   URL: ${test.url}`);
      pass = false;
    }
    if (pass) {
      console.log(`✅ OK: ${test.name}`);
    } else {
      if (test.critical) failures++;
    }
  } catch (e) {
    console.error(`⚠️  ERROR de red: "${test.name}" — ${e.message}`);
    if (test.critical) failures++;
  }
}

if (failures > 0) {
  console.error(`\n🚨 ${failures} TEST(S) CRÍTICO(S) FALLARON. EL DEPLOY ESTÁ ROTO.`);
  console.error('   Revisa _redirects y el contenido de _t/index.html');
  process.exit(1);
} else {
  console.log('\n✅ Todos los tests post-deploy pasaron correctamente.');
  process.exit(0);
}

