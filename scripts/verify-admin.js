const path = require('path');
const db = require(path.join(__dirname, '..', 'src', 'config', 'database'));

(async function main() {
  try {
    const pool = db.pool || db;
    const resUser = await pool.query("SELECT id_usuario, id_tenant, email, tipo, ativo FROM usuarios WHERE email = $1 LIMIT 1", ['admin@teste.com']);
    const resTenant = await pool.query("SELECT id_tenant, nome_tenant, status FROM tenants WHERE id_tenant = 1 LIMIT 1");

    console.log('USER', resUser.rows && resUser.rows[0] ? resUser.rows[0] : null);
    console.log('TENANT', resTenant.rows && resTenant.rows[0] ? resTenant.rows[0] : null);

    if (resUser.rows && resUser.rows[0] && resUser.rows[0].id_usuario === 1 && resUser.rows[0].id_tenant === 1) {
      console.log('OK');
      process.exit(0);
    } else {
      console.log('MISMATCH');
      process.exit(2);
    }
  } catch (err) {
    console.error('ERROR', err.message);
    process.exit(1);
  } finally {
    if (typeof db.end === 'function') {
      await db.end();
    }
  }
})();


