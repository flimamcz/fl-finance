import React, { useState } from 'react';
import { FiDownload, FiFileText, FiFile, FiGrid, FiX } from 'react-icons/fi';
import { jsPDF } from "jspdf";
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import '../Styles/ExportModal.css';

function ExportModal({ isOpen, onClose, transactions, amounts, filters = {} }) {
  const [exportFormat, setExportFormat] = useState('pdf');
  const [exportRange, setExportRange] = useState('all');
  const [includeCharts, setIncludeCharts] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  if (!isOpen) return null;

  // Função para formatar data
  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('pt-BR');
  };

  // Função para garantir que o valor seja número
  const parseAmount = (amount) => {
    if (typeof amount === 'number') return amount;
    if (typeof amount === 'string') {
      const parsed = parseFloat(amount.replace(/[^\d.-]/g, ''));
      return isNaN(parsed) ? 0 : parsed;
    }
    if (amount && typeof amount === 'object' && amount.amount) {
      return parseAmount(amount.amount);
    }
    return 0;
  };

  // Função para filtrar transações por período
  const getFilteredTransactions = () => {
    let filtered = [...transactions];
    
    if (exportRange === 'last30') {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      filtered = filtered.filter(t => new Date(t.date) >= thirtyDaysAgo);
    } else if (exportRange === 'last90') {
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
      filtered = filtered.filter(t => new Date(t.date) >= ninetyDaysAgo);
    } else if (exportRange === 'thisMonth') {
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      filtered = filtered.filter(t => new Date(t.date) >= firstDay);
    }
    
    return filtered;
  };

  // Gerar PDF - CORRIGIDO para tratar os amounts
  const generatePDF = async () => {
    setIsExporting(true);
    
    try {
      const doc = new jsPDF();
      const filteredTransactions = getFilteredTransactions();
      
      // CORREÇÃO: Garantir que os amounts sejam números
      const totalIncome = parseAmount(amounts[0]) || 0;
      const totalExpense = parseAmount(amounts[1]) || 0;
      const totalInvestment = parseAmount(amounts[2]) || 0;
      const balance = totalIncome - totalExpense;

      // Cabeçalho
      doc.setFontSize(20);
      doc.text('Relatório Financeiro', 14, 22);
      
      doc.setFontSize(11);
      doc.setTextColor(100, 100, 100);
      doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 14, 30);
      doc.text(`Período: ${exportRange === 'all' ? 'Todo o período' : exportRange}`, 14, 36);
      doc.text(`Total de transações: ${filteredTransactions.length}`, 14, 42);

      // Resumo
      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);
      doc.text('Resumo Financeiro', 14, 55);

      autoTable(doc, {
        startY: 60,
        head: [['Item', 'Valor']],
        body: [
          ['Receitas Total', `R$ ${totalIncome.toFixed(2)}`],
          ['Despesas Total', `R$ ${totalExpense.toFixed(2)}`],
          ['Investimentos', `R$ ${totalInvestment.toFixed(2)}`],
          ['Saldo Final', `R$ ${balance.toFixed(2)}`],
        ],
        theme: 'grid',
        headStyles: { fillColor: [99, 102, 241] },
        styles: { fontSize: 11, cellPadding: 5 },
      });

      // Transações detalhadas
      if (filteredTransactions.length > 0) {
        doc.setFontSize(14);
        doc.text('Transações Detalhadas', 14, doc.lastAutoTable.finalY + 15);

        const tableData = filteredTransactions.map(t => [
          formatDate(t.date),
          t.description || 'Sem descrição',
          t.typeId === 1 ? 'Receita' : t.typeId === 2 ? 'Despesa' : 'Investimento',
          t.isSalary ? 'Sim' : 'Não',
          t.status ? 'Confirmado' : 'Pendente',
          `R$ ${parseAmount(t.value).toFixed(2)}`,
        ]);

        autoTable(doc, {
          startY: doc.lastAutoTable.finalY + 20,
          head: [['Data', 'Descrição', 'Tipo', 'Salário', 'Status', 'Valor']],
          body: tableData,
          theme: 'grid',
          headStyles: { fillColor: [99, 102, 241] },
          columnStyles: {
            0: { cellWidth: 22 },
            3: { cellWidth: 17 },
            5: { cellWidth: 27, halign: 'right' },
          },
          styles: { fontSize: 10, cellPadding: 3 },
        });

        // Adicionar página com gráficos (se habilitado)
        if (includeCharts) {
          doc.addPage();
          doc.setFontSize(14);
          doc.text('Análise por Categoria', 14, 20);

          // Calcular totais por categoria
          const categories = {};
          filteredTransactions.forEach(t => {
            const type = t.typeId === 1 ? 'Receita' : t.typeId === 2 ? 'Despesa' : 'Investimento';
            if (!categories[type]) categories[type] = 0;
            categories[type] += parseAmount(t.value);
          });

          const totalAll = Object.values(categories).reduce((a, b) => a + b, 0);
          
          const chartData = Object.entries(categories).map(([cat, value]) => [
            cat,
            `R$ ${value.toFixed(2)}`,
            totalAll > 0 ? `${((value / totalAll) * 100).toFixed(1)}%` : '0%'
          ]);

          autoTable(doc, {
            startY: 30,
            head: [['Categoria', 'Valor Total', 'Percentual']],
            body: chartData,
            theme: 'grid',
            headStyles: { fillColor: [16, 185, 129] },
            styles: { fontSize: 11, cellPadding: 5 },
          });
        }
      } else {
        doc.setFontSize(14);
        doc.text('Nenhuma transação encontrada para o período selecionado', 14, 70);
      }

      // Rodapé
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(
          `Página ${i} de ${pageCount} • Finance App • ${new Date().toLocaleDateString('pt-BR')}`,
          doc.internal.pageSize.width / 2,
          doc.internal.pageSize.height - 10,
          { align: 'center' }
        );
      }

      // Salvar arquivo
      doc.save(`relatorio-financeiro-${Date.now()}.pdf`);
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      alert('Erro ao gerar PDF. Verifique o console para mais detalhes.');
    } finally {
      setIsExporting(false);
      onClose();
    }
  };

  // Gerar Excel - CORRIGIDO
  const generateExcel = () => {
    setIsExporting(true);
    
    try {
      const filteredTransactions = getFilteredTransactions();
      
      // CORREÇÃO: Garantir que os amounts sejam números
      const totalIncome = parseAmount(amounts[0]) || 0;
      const totalExpense = parseAmount(amounts[1]) || 0;
      const totalInvestment = parseAmount(amounts[2]) || 0;
      const balance = totalIncome - totalExpense;

      // Dados das transações
      const transactionData = filteredTransactions.map(t => ({
        Data: formatDate(t.date),
        Descrição: t.description || 'Sem descrição',
        Tipo: t.typeId === 1 ? 'Receita' : t.typeId === 2 ? 'Despesa' : 'Investimento',
        Salário: t.isSalary ? 'Sim' : 'Não',
        Status: t.status ? 'Confirmado' : 'Pendente',
        Valor: parseAmount(t.value),
      }));

      // Dados do resumo
      const summaryData = [
        { Item: 'Receitas Total', Valor: totalIncome },
        { Item: 'Despesas Total', Valor: totalExpense },
        { Item: 'Investimentos', Valor: totalInvestment },
        { Item: 'Saldo Final', Valor: balance },
      ];

      // Criar workbook
      const wb = XLSX.utils.book_new();

      // Worksheet de transações
      const ws1 = XLSX.utils.json_to_sheet(transactionData);
      XLSX.utils.book_append_sheet(wb, ws1, 'Transações');

      // Worksheet de resumo
      const ws2 = XLSX.utils.json_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, ws2, 'Resumo');

      // Worksheet de análise por categoria (se habilitado)
      if (includeCharts && filteredTransactions.length > 0) {
        const categories = {};
        filteredTransactions.forEach(t => {
          const type = t.typeId === 1 ? 'Receita' : t.typeId === 2 ? 'Despesa' : 'Investimento';
          if (!categories[type]) categories[type] = 0;
          categories[type] += parseAmount(t.value);
        });

        const totalAll = Object.values(categories).reduce((a, b) => a + b, 0);
        
        const categoryData = Object.entries(categories).map(([categoria, valor]) => ({
          Categoria: categoria,
          'Valor Total': valor,
          'Percentual': totalAll > 0 ? `${((valor / totalAll) * 100).toFixed(1)}%` : '0%'
        }));

        const ws3 = XLSX.utils.json_to_sheet(categoryData);
        XLSX.utils.book_append_sheet(wb, ws3, 'Análise por Categoria');
      }

      // Gerar arquivo
      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([wbout], { type: 'application/octet-stream' });
      saveAs(blob, `relatorio-financeiro-${Date.now()}.xlsx`);
    } catch (error) {
      console.error('Erro ao gerar Excel:', error);
      alert('Erro ao gerar Excel. Verifique o console para mais detalhes.');
    } finally {
      setIsExporting(false);
      onClose();
    }
  };

  // Gerar CSV
  const generateCSV = () => {
    setIsExporting(true);
    
    try {
      const filteredTransactions = getFilteredTransactions();
      
      const csvData = filteredTransactions.map(t => ({
        Data: formatDate(t.date),
        Descrição: t.description || 'Sem descrição',
        Tipo: t.typeId === 1 ? 'Receita' : t.typeId === 2 ? 'Despesa' : 'Investimento',
        Salário: t.isSalary ? 'Sim' : 'Não',
        Status: t.status ? 'Confirmado' : 'Pendente',
        Valor: parseAmount(t.value).toFixed(2),
      }));

      // Converter para CSV
      const headers = ['Data', 'Descrição', 'Tipo', 'Salário', 'Status', 'Valor'];
      const csvRows = [
        headers.join(','),
        ...csvData.map(row => [
          `"${row.Data}"`,
          `"${row.Descrição}"`,
          `"${row.Tipo}"`,
          `"${row.Salário}"`,
          `"${row.Status}"`,
          `"${row.Valor}"`
        ].join(','))
      ];

      const csvString = csvRows.join('\n');
      const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
      saveAs(blob, `transacoes-${Date.now()}.csv`);
    } catch (error) {
      console.error('Erro ao gerar CSV:', error);
      alert('Erro ao gerar CSV. Verifique o console para mais detalhes.');
    } finally {
      setIsExporting(false);
      onClose();
    }
  };

  // Gerar JSON
  const generateJSON = () => {
    setIsExporting(true);
    
    try {
      const filteredTransactions = getFilteredTransactions();
      
      // CORREÇÃO: Garantir que os amounts sejam números
      const totalIncome = parseAmount(amounts[0]) || 0;
      const totalExpense = parseAmount(amounts[1]) || 0;
      const totalInvestment = parseAmount(amounts[2]) || 0;
      const balance = totalIncome - totalExpense;

      const exportData = {
        metadata: {
          exportDate: new Date().toISOString(),
          period: exportRange,
          transactionCount: filteredTransactions.length,
          appVersion: '1.0.0'
        },
        summary: {
          totalIncome: totalIncome,
          totalExpense: totalExpense,
          totalInvestment: totalInvestment,
          balance: balance,
          profitLoss: balance
        },
        transactions: filteredTransactions,
        filters: filters
      };

      const jsonString = JSON.stringify(exportData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      saveAs(blob, `backup-financeiro-${Date.now()}.json`);
    } catch (error) {
      console.error('Erro ao gerar JSON:', error);
      alert('Erro ao gerar JSON. Verifique o console para mais detalhes.');
    } finally {
      setIsExporting(false);
      onClose();
    }
  };

  // Handler do botão exportar
  const handleExport = () => {
    switch (exportFormat) {
      case 'pdf':
        generatePDF();
        break;
      case 'excel':
        generateExcel();
        break;
      case 'csv':
        generateCSV();
        break;
      case 'json':
        generateJSON();
        break;
      default:
        generatePDF();
    }
  };

  // Pré-visualização atualizada
  const filteredTransactions = getFilteredTransactions();
  
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content export-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-header-left">
            <FiDownload size={24} />
            <h2>Exportar Extrato</h2>
          </div>
          <button className="btn-close" onClick={onClose}>
            <FiX />
          </button>
        </div>

        <div className="modal-body">
          {/* Seção 1: Formato */}
          <div className="export-section">
            <h3>Formato do Arquivo</h3>
            <div className="format-grid">
              <button
                className={`format-option ${exportFormat === 'pdf' ? 'active' : ''}`}
                onClick={() => setExportFormat('pdf')}
              >
                <FiFileText size={24} />
                <span>PDF</span>
                <small>Documento formatado</small>
              </button>
              
              <button
                className={`format-option ${exportFormat === 'excel' ? 'active' : ''}`}
                onClick={() => setExportFormat('excel')}
              >
                <FiGrid size={24} />
                <span>Excel</span>
                <small>Planilha editável</small>
              </button>
              
              <button
                className={`format-option ${exportFormat === 'csv' ? 'active' : ''}`}
                onClick={() => setExportFormat('csv')}
              >
                <FiFile size={24} />
                <span>CSV</span>
                <small>Dados brutos</small>
              </button>
              
              <button
                className={`format-option ${exportFormat === 'json' ? 'active' : ''}`}
                onClick={() => setExportFormat('json')}
              >
                <FiFile size={24} />
                <span>JSON</span>
                <small>Backup completo</small>
              </button>
            </div>
          </div>

          {/* Seção 2: Período */}
          <div className="export-section">
            <h3>Período de Exportação</h3>
            <div className="radio-group">
              <label className="radio-option">
                <input
                  type="radio"
                  name="period"
                  value="all"
                  checked={exportRange === 'all'}
                  onChange={(e) => setExportRange(e.target.value)}
                />
                <span>Todas as transações</span>
              </label>
              
              <label className="radio-option">
                <input
                  type="radio"
                  name="period"
                  value="thisMonth"
                  checked={exportRange === 'thisMonth'}
                  onChange={(e) => setExportRange(e.target.value)}
                />
                <span>Este mês</span>
              </label>
              
              <label className="radio-option">
                <input
                  type="radio"
                  name="period"
                  value="last30"
                  checked={exportRange === 'last30'}
                  onChange={(e) => setExportRange(e.target.value)}
                />
                <span>Últimos 30 dias</span>
              </label>
              
              <label className="radio-option">
                <input
                  type="radio"
                  name="period"
                  value="last90"
                  checked={exportRange === 'last90'}
                  onChange={(e) => setExportRange(e.target.value)}
                />
                <span>Últimos 90 dias</span>
              </label>
            </div>
          </div>

          {/* Seção 3: Opções Avançadas */}
          <div className="export-section">
            <h3>Opções Avançadas</h3>
            <div className="checkbox-group">
              <label className="checkbox-option">
                <input
                  type="checkbox"
                  checked={includeCharts}
                  onChange={(e) => setIncludeCharts(e.target.checked)}
                />
                <span>Incluir gráficos e análise (PDF/Excel)</span>
              </label>
              
              <div className="info-text">
                <small>
                  • PDF: Inclui gráficos de categorias<br/>
                  • Excel: Cria aba adicional com análise<br/>
                  • {filteredTransactions.length} transações serão exportadas
                </small>
              </div>
            </div>
          </div>

          {/* Seção 4: Pré-visualização */}
          <div className="export-section">
            <h3>Pré-visualização</h3>
            <div className="preview-card">
              <div className="preview-header">
                <span>📊 Finance App - Relatório</span>
                <small>{new Date().toLocaleDateString('pt-BR')}</small>
              </div>
              <div className="preview-stats">
                <div className="preview-stat">
                  <span>Transações</span>
                  <strong>{filteredTransactions.length}</strong>
                </div>
                <div className="preview-stat">
                  <span>Período</span>
                  <strong>
                    {exportRange === 'all' ? 'Todo período' : 
                     exportRange === 'thisMonth' ? 'Este mês' :
                     exportRange === 'last30' ? '30 dias' : '90 dias'}
                  </strong>
                </div>
                <div className="preview-stat">
                  <span>Formato</span>
                  <strong>{exportFormat.toUpperCase()}</strong>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="modal-actions">
          <button className="btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button 
            className="btn-primary" 
            onClick={handleExport}
            disabled={isExporting || filteredTransactions.length === 0}
          >
            {isExporting ? (
              <>
                <div className="spinner-small"></div>
                Exportando...
              </>
            ) : (
              <>
                <FiDownload />
                Exportar {filteredTransactions.length} transações
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ExportModal;