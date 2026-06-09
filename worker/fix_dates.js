const now = Date.now();
const sql = `
UPDATE treatments_log SET created_at = ${now - 3600000} WHERE id='t_fake1';
UPDATE treatments_log SET created_at = ${now - 7200000} WHERE id='t_fake2';
UPDATE treatments_log SET created_at = ${now - 14400000} WHERE id='t_fake3';
UPDATE appointments SET created_at = ${now - 86400000} WHERE id='a_fake1';
UPDATE appointments SET created_at = ${now - 172800000} WHERE id='a_fake2';
UPDATE appointments SET created_at = ${now - 432000000} WHERE id='a_fake3';
`;
require('fs').writeFileSync('fix_dates.sql', sql);
