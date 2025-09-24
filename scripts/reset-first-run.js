/*
 * Reset do banco para primeiro uso
 * - Dropar e recriar schema
 * - Criar tenant #1 e admin #1 (admin@teste.com / 123456)
 */
const path = require('path');
const bcrypt = require('bcryptjs');
const db = require(path.join(__dirname, '..', 'src', 'config', 'database'));
const { runMigrations } = require(path.join(__dirname, '..', 'src', 'database', 'migrations'));

async function resetDatabaseFirstRun() {
  const pool = db.pool || db;
  const isPostgres = !!db.isPostgreSQL;
  try {
    console.log('🗑️  Limpando banco (drop all)...');
    const { dropTables } = require(path.join(__dirname, '..', 'src', 'database', 'migrations'));
    await dropTables();

    console.log('🛠️  Rodando migrações...');
    await runMigrations();

    console.log('🏷️  Inserindo tenant #1...');
    const insertTenantSQL = isPostgres
      ? `INSERT INTO tenants (id_tenant, nome_tenant, dominio, status, config_tenant) VALUES (1, $1, $2, $3, $4)`
      : `INSERT INTO tenants (id_tenant, nome_tenant, dominio, status, config_tenant) VALUES (1, ?, ?, ?, ?)`;
    await pool.query(insertTenantSQL, ['Tenant Padrão', 'default.local', 'ativo', isPostgres ? JSON.stringify({}) : '{}']);

    console.log('👤 Inserindo admin #1...');
    const senhaHash = await bcrypt.hash('123456', 12);
    const insertUserSQL = isPostgres
      ? `INSERT INTO usuarios (id_usuario, id_tenant, nome, email, senha_hash, tipo, ativo, timezone) VALUES (1, 1, $1, $2, $3, $4, $5, $6)`
      : `INSERT INTO usuarios (id_usuario, id_tenant, nome, email, senha_hash, tipo, ativo, timezone) VALUES (1, 1, ?, ?, ?, ?, ?, ?)`;
    await pool.query(insertUserSQL, ['Admin Sistema', 'admin@teste.com', senhaHash, 'admin', isPostgres ? true : 1, 'America/Sao_Paulo']);

    console.log('🧹 Removendo quaisquer outros usuários/tenants além do #1 (garantia)...');
    await pool.query(isPostgres ? 'DELETE FROM usuarios WHERE id_usuario != 1' : 'DELETE FROM usuarios WHERE id_usuario != 1');
    await pool.query(isPostgres ? 'DELETE FROM tenants WHERE id_tenant != 1' : 'DELETE FROM tenants WHERE id_tenant != 1');

    console.log('🔧 Reset de sequences/auto-increment para iniciar em 2...');
    if (isPostgres) {
      // Ajustar sequences no PostgreSQL
      const seqs = [
        ['usuarios', 'id_usuario'],
        ['tenants', 'id_tenant'],
        ['clientes', 'id_cliente'],
        ['servicos', 'id_servico'],
        ['agendamentos', 'id_agendamento'],
        ['slots', 'id_slot'],
        ['notificacoes', 'id_notificacao'],
        ['dashboard_cache', 'id_cache'],
        ['audit_logs', 'id_log']
      ];
      for (const [table, col] of seqs) {
        try {
          await pool.query(`SELECT setval(pg_get_serial_sequence('${table}', '${col}'), (SELECT COALESCE(MAX(${col}), 1) FROM ${table}) + 1, false)`);
        } catch (_) {}
      }
    } else {
      // SQLite: garantir AUTOINCREMENT via seq
      try {
        await pool.query("DELETE FROM sqlite_sequence WHERE name IN ('usuarios','tenants','clientes','servicos','agendamentos','slots','notificacoes','dashboard_cache','audit_logs')");
      } catch (_) {}
    }

    console.log('✅ Banco resetado para primeiro uso com admin id=1 e tenant id=1');
  } catch (err) {
    console.error('❌ Falha no reset do banco:', err.message);
    process.exitCode = 1;
  } finally {
    if (typeof db.end === 'function') {
      await db.end();
    }
  }
}

if (require.main === module) {
  resetDatabaseFirstRun();
}

module.exports = resetDatabaseFirstRun;


