const pool = require('../src/config/database');

async function backfillTenants() {
  if (!pool.isPostgreSQL) {
    console.log('Backfill apenas para PostgreSQL. Abortando.');
    return;
  }

  try {
    // Preencher nome/email faltantes com melhor esforço a partir dos usuários do tenant
    const sql = `
      WITH latest_user AS (
        SELECT DISTINCT ON (u.id_tenant)
          u.id_tenant,
          u.nome as user_nome,
          u.email as user_email
        FROM usuarios u
        WHERE u.id_tenant IS NOT NULL
        ORDER BY u.id_tenant, u.created_at DESC NULLS LAST
      ),
      any_email AS (
        SELECT DISTINCT ON (u.id_tenant)
          u.id_tenant,
          u.nome as user_nome_any,
          u.email as user_email_any
        FROM usuarios u
        WHERE u.id_tenant IS NOT NULL AND u.email IS NOT NULL AND u.email <> ''
        ORDER BY u.id_tenant, u.created_at DESC NULLS LAST
      )
      UPDATE tenants t
      SET 
        nome = COALESCE(t.nome, lu.user_nome, ae.user_nome_any, 'Tenant ' || t.id_tenant),
        nome_tenant = COALESCE(t.nome_tenant, lu.user_nome, ae.user_nome_any, 'Tenant ' || t.id_tenant),
        email = COALESCE(t.email, ae.user_email_any, lu.user_email)
      FROM latest_user lu
      LEFT JOIN any_email ae ON ae.id_tenant = lu.id_tenant
      WHERE t.id_tenant = lu.id_tenant
        AND (t.nome IS NULL OR t.nome_tenant IS NULL OR t.email IS NULL)
    `;
    await pool.query(sql);
    console.log('Backfill concluído.');
  } catch (e) {
    console.error('Erro no backfill:', e.message);
    process.exitCode = 1;
  }
}

if (require.main === module) {
  backfillTenants();
}

module.exports = backfillTenants;


