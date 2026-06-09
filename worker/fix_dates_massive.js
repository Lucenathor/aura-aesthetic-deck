const now = Date.now();
const HOUR = 3600000;
let sql = '';
// Forzar que la mitad de los cobros (10) sean de hoy
for(let i=0; i<10; i++) {
  sql += `UPDATE treatments_log SET created_at = ${now - (i * HOUR)} WHERE id='t_demo${i}';\n`;
}
// Forzar que algunas citas sean de hoy o mañana
sql += `UPDATE appointments SET created_at = ${now - 86400000}, date_iso = '${new Date(now).toISOString()}' WHERE id='a_demo0';\n`;
sql += `UPDATE appointments SET created_at = ${now - 86400000}, date_iso = '${new Date(now + 86400000).toISOString()}' WHERE id='a_demo1';\n`;

require('fs').writeFileSync('fix_dates_massive.sql', sql);
