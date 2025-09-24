const pool = require('../src/config/database');

async function repairAdminId() {
  if (!pool.isPostgreSQL) {
    console.log('Este reparo é apenas para PostgreSQL. Abortando.');
    return;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Garantir tenant 1
    const t = await client.query('SELECT id_tenant FROM tenants WHERE id_tenant = 1');
    if (t.rowCount === 0) {
      await client.query(
        `INSERT INTO tenants (id_tenant, nome_tenant, dominio, status, config_tenant, created_at, updated_at)
         VALUES (1, $1, $2, 'ativo', '{}'::jsonb, NOW(), NOW())`,
        ['Tenant Padrão', 'default.local']
      );
    }

    // Localizar admin por email
    const u = await client.query("SELECT id_usuario FROM usuarios WHERE email = 'admin@teste.com' LIMIT 1");
    if (u.rowCount === 0) {
      console.log('Admin não encontrado por email. Abortando.');
      await client.query('ROLLBACK');
      return;
    }

    const currentId = u.rows[0].id_usuario;
    if (currentId !== 1) {
      // Ajustar referências se existirem (precaução)
      await client.query('UPDATE servicos SET id_usuario = 1 WHERE id_usuario = $1', [currentId]);
      await client.query('UPDATE clientes SET id_usuario = 1 WHERE id_usuario = $1', [currentId]);
      await client.query('UPDATE agendamentos SET id_usuario = 1 WHERE id_usuario = $1', [currentId]);
      await client.query('UPDATE slots SET id_usuario = 1 WHERE id_usuario = $1', [currentId]);

      // Se já existir usuário id=1, remover para abrir espaço
      await client.query('DELETE FROM usuarios WHERE id_usuario = 1');

      // Atualizar o admin para id=1 e tenant=1
      await client.query(
        `UPDATE usuarios SET id_usuario = 1, id_tenant = 1, tipo = 'admin', ativo = true, updated_at = NOW() WHERE id_usuario = $1`,
        [currentId]
      );
    } else {
      // Garantir tenant e flags corretas
      await client.query("UPDATE usuarios SET id_tenant = 1, tipo = 'admin', ativo = true, updated_at = NOW() WHERE id_usuario = 1");
    }

    // Ajustar sequences
    await client.query("SELECT setval(pg_get_serial_sequence('usuarios','id_usuario'), (SELECT COALESCE(MAX(id_usuario), 1) FROM usuarios) + 1, false)");
    await client.query("SELECT setval(pg_get_serial_sequence('tenants','id_tenant'), (SELECT COALESCE(MAX(id_tenant), 1) FROM tenants) + 1, false)");

    await client.query('COMMIT');
    console.log('Admin reparado: id_usuario=1, id_tenant=1.');
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('Falha no reparo do admin:', e.message);
    process.exitCode = 1;
  } finally {
    client.release();
  }
}

if (require.main === module) {
  repairAdminId();
}

module.exports = repairAdminId;


