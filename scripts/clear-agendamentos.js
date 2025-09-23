const pool = require('../src/config/postgresql');

(async () => {
  try {
    console.log('🧹 Limpando tabela agendamentos...');
    const start = Date.now();

    // Remover todos os agendamentos
    await pool.query('DELETE FROM agendamentos');

    // Opcional: resetar sequência se existir (PostgreSQL)
    try {
      await pool.query("SELECT setval(pg_get_serial_sequence('agendamentos','id_agendamento'), COALESCE((SELECT MAX(id_agendamento)+1 FROM agendamentos), 1), false)");
    } catch (e) {
      // Ignorar se a sequência não existir
    }

    const { rows } = await pool.query('SELECT COUNT(*)::int AS total FROM agendamentos');
    const total = rows[0]?.total || 0;
    console.log(`✅ Limpeza concluída em ${Date.now() - start}ms. Registros atuais: ${total}`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro ao limpar agendamentos:', error.message);
    process.exit(1);
  }
})();


