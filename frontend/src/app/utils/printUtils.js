export const printTransactions = (transactions, amounts) => {
  const printWindow = window.open('', '_blank');
  
  const totalIncome = amounts[0]?.amount || 0;
  const totalExpense = amounts[1]?.amount || 0;
  const totalInvestment = amounts[2]?.amount || 0;
  const balance = totalIncome - totalExpense;
  
  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <title>Relatório Financeiro</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          margin: 20px;
          color: #333;
        }
        h1, h2, h3 {
          color: #6366f1;
        }
        .header {
          text-align: center;
          margin-bottom: 30px;
          border-bottom: 2px solid #6366f1;
          padding-bottom: 20px;
        }
        .summary {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 15px;
          margin-bottom: 30px;
        }
        .summary-card {
          padding: 15px;
          border-radius: 8px;
          text-align: center;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
        }
        .summary-card.income { border-top: 4px solid #10b981; }
        .summary-card.expense { border-top: 4px solid #ef4444; }
        .summary-card.investment { border-top: 4px solid #f59e0b; }
        .summary-card.balance { border-top: 4px solid #6366f1; }
        .summary-value {
          font-size: 20px;
          font-weight: bold;
          margin-top: 10px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 20px;
        }
        th {
          background-color: #6366f1;
          color: white;
          padding: 12px;
          text-align: left;
        }
        td {
          padding: 10px;
          border-bottom: 1px solid #e2e8f0;
        }
        tr:hover {
          background-color: #f8fafc;
        }
        .income-row { color: #10b981; }
        .expense-row { color: #ef4444; }
        .investment-row { color: #f59e0b; }
        .footer {
          margin-top: 40px;
          padding-top: 20px;
          border-top: 1px solid #e2e8f0;
          text-align: center;
          color: #64748b;
          font-size: 12px;
        }
        @media print {
          .no-print { display: none; }
          @page { margin: 0.5cm; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Finance App - Relatório Financeiro</h1>
        <p>Gerado em: ${new Date().toLocaleDateString('pt-BR')}</p>
      </div>
      
      <div class="summary">
        <div class="summary-card income">
          <h3>Receitas</h3>
          <div class="summary-value">R$ ${totalIncome.toFixed(2)}</div>
        </div>
        <div class="summary-card expense">
          <h3>Despesas</h3>
          <div class="summary-value">R$ ${totalExpense.toFixed(2)}</div>
        </div>
        <div class="summary-card investment">
          <h3>Investimentos</h3>
          <div class="summary-value">R$ ${totalInvestment.toFixed(2)}</div>
        </div>
        <div class="summary-card balance">
          <h3>Saldo</h3>
          <div class="summary-value">R$ ${balance.toFixed(2)}</div>
        </div>
      </div>
      
      <h2>Transações (${transactions.length})</h2>
      <table>
        <thead>
          <tr>
            <th>Data</th>
            <th>Descrição</th>
            <th>Tipo</th>
            <th>Status</th>
            <th>Valor</th>
          </tr>
        </thead>
        <tbody>
          ${transactions.map(t => `
            <tr class="${t.typeId === 1 ? 'income-row' : t.typeId === 2 ? 'expense-row' : 'investment-row'}">
              <td>${new Date(t.date).toLocaleDateString('pt-BR')}</td>
              <td>${t.description}</td>
              <td>${t.typeId === 1 ? 'Receita' : t.typeId === 2 ? 'Despesa' : 'Investimento'}</td>
              <td>${t.status ? 'Confirmado' : 'Pendente'}</td>
              <td>R$ ${parseFloat(t.value).toFixed(2)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      
      <div class="footer">
        <p>Finance App • Gerência Financeira Pessoal • ${new Date().getFullYear()}</p>
        <p>Total de transações: ${transactions.length} • Total geral: R$ ${transactions.reduce((acc, t) => acc + parseFloat(t.value), 0).toFixed(2)}</p>
      </div>
      
      <div class="no-print">
        <button onclick="window.print()" style="padding: 10px 20px; background: #6366f1; color: white; border: none; border-radius: 5px; cursor: pointer; margin-top: 20px;">
          Imprimir Relatório
        </button>
        <button onclick="window.close()" style="padding: 10px 20px; background: #ef4444; color: white; border: none; border-radius: 5px; cursor: pointer; margin-top: 20px; margin-left: 10px;">
          Fechar
        </button>
      </div>
    </body>
    </html>
  `);
  
  printWindow.document.close();
};