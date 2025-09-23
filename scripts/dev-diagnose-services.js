#!/usr/bin/env node

(async () => {
  try {
    const pool = require('../src/config/database');
    console.log('🔎 Listando usuários...');
    const users = await pool.query('SELECT id_usuario, id_tenant, nome, whatsapp FROM usuarios ORDER BY id_usuario');
    console.log(users.rows);

    const marias = (users.rows || []).filter(u => (u.nome || '').toLowerCase().includes('maria'));
    console.log('\n👤 Usuários que parecem ser "Maria":', marias);

    // Serviços por usuário
    const perUser = {};
    for (const u of users.rows || []) {
      const res = await pool.query('SELECT id_servico, nome_servico, valor, duracao_min, id_usuario FROM servicos WHERE id_usuario = ? ORDER BY id_servico DESC', [u.id_usuario]);
      perUser[u.id_usuario] = res.rows;
    }
    console.log('\n📊 Quantidade de serviços por usuário:', Object.fromEntries(Object.entries(perUser).map(([k,v]) => [k, v.length])));

    if (marias.length > 0) {
      for (const u of marias) {
        console.log(`\n💇 Serviços da usuária ${u.nome} (id_usuario=${u.id_usuario}):`);
        console.log(perUser[u.id_usuario] || []);
      }
    }

    // Amostra dos 10 serviços mais recentes
    const recent = await pool.query('SELECT s.id_servico, s.nome_servico, s.valor, s.duracao_min, s.id_usuario, u.nome as usuario_nome FROM servicos s LEFT JOIN usuarios u ON s.id_usuario = u.id_usuario ORDER BY s.id_servico DESC LIMIT 10');
    console.log('\n🧾 Serviços recentes (top 10):', recent.rows);

    process.exit(0);
  } catch (e) {
    console.error('❌ Erro no diagnóstico:', e);
    process.exit(1);
  }
})();



