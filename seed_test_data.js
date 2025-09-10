const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./data/agendamento_dev.db');

console.log('Inserindo dados de teste...');

// Inserir cliente de teste
db.run(`
  INSERT INTO tenant_teste_clientes (nome, whatsapp, email, id_usuario, criado_em)
  VALUES ('João Cliente Teste', '+5511999999999', 'cliente@teste.com', 1, datetime('now'))
`, function(err) {
  if (err) {
    console.error('Erro ao inserir cliente:', err);
  } else {
    const clienteId = this.lastID;
    console.log('Cliente inserido com ID:', clienteId);

    // Inserir agendamento de teste
    db.run(`
      INSERT INTO tenant_teste_agendamentos (
        id_usuario, id_cliente, id_servico, start_at, end_at,
        status, observacoes, criado_em
      ) VALUES (?, ?, 1, datetime('now', '+1 day'), datetime('now', '+1 day', '+30 minutes'), 'agendado', 'Agendamento de teste', datetime('now'))
    `, [1, clienteId], function(err) {
      if (err) {
        console.error('Erro ao inserir agendamento:', err);
      } else {
        console.log('Agendamento inserido com ID:', this.lastID);
      }

      // Verificar dados inseridos
      db.all(`
        SELECT
          a.*,
          c.nome as cliente_nome,
          c.whatsapp as cliente_whatsapp,
          s.nome_servico,
          s.duracao_min,
          s.valor
        FROM tenant_teste_agendamentos a
        JOIN tenant_teste_clientes c ON a.id_cliente = c.id_cliente
        JOIN tenant_teste_servicos s ON a.id_servico = s.id_servico
        WHERE a.id_usuario = 1
      `, [], (err, rows) => {
        if (err) {
          console.error('Erro ao verificar dados:', err);
        } else {
          console.log('Dados encontrados:', rows.length);
          console.log('Primeiro registro:', rows[0]);
        }
        db.close();
      });
    });
  }
});
