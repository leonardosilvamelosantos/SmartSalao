const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./data/agendamento_dev.db');

// Testar a query do Agendamento.findByUsuario
const query = `
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
  WHERE a.id_usuario = $1
`;

console.log('Testando query de agendamentos:');
db.all(query, [1], (err, rows) => {
  if (err) {
    console.error('Erro na query:', err);
  } else {
    console.log('Resultado da query:', rows);
    console.log(`Total de registros: ${rows.length}`);
  }
  db.close();
});
