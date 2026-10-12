import React, { useEffect, useState } from 'react';
import { FiDownload, FiFileText, FiFile, FiGrid, FiX } from 'react-icons/fi';
import { jsPDF } from "jspdf";
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { API_BASE_URL } from "../Services/request";
import { getStoredToken } from "../Services/authStorage";
import '../Styles/ExportModal.css';

function ExportModal({ isOpen, onClose, transactions, filters = {} }) {
  const [exportFormat, setExportFormat] = useState('pdf');
  const [exportRange, setExportRange] = useState('all');
  const [includeCharts, setIncludeCharts] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [includedData, setIncludedData] = useState({
    transactions: true,
    debts: true,
    investments: true,
    categories: true,
  });
  const [debts, setDebts] = useState([]);
  const [investmentMovements, setInvestmentMovements] = useState([]);
  const [categories, setCategories] = useState([]);
  const [investmentBalance, setInvestmentBalance] = useState("0.00");
  const [loadingRelatedData, setLoadingRelatedData] = useState(false);
  const [relatedDataError, setRelatedDataError] = useState("");

  useEffect(() => {
    if (!isOpen) return undefined;
    let active = true;

    const loadRelatedData = async () => {
      setLoadingRelatedData(true);
      setRelatedDataError("");
      try {
        const token = getStoredToken();
        if (!token) throw new Error("Sua sessão expirou. Entre novamente para exportar seus dados.");
        const headers = { Authorization: `Bearer ${token}` };
        const [debtsResponse, investmentsResponse, categoriesResponse] = await Promise.all([
          fetch(`${API_BASE_URL}/debts`, { headers }),
          fetch(`${API_BASE_URL}/investments`, { headers }),
          fetch(`${API_BASE_URL}/transactions/categories`, { headers }),
        ]);
        const [debtsResult, investmentsResult, categoriesResult] = await Promise.all([
          debtsResponse.json(),
          investmentsResponse.json(),
          categoriesResponse.json(),
        ]);

        if (!debtsResponse.ok || debtsResult.error) {
          throw new Error(debtsResult.message || `Falha ao carregar dívidas (${debtsResponse.status}).`);
        }
        if (!investmentsResponse.ok || investmentsResult.error) {
          throw new Error(investmentsResult.message || `Falha ao carregar investimentos (${investmentsResponse.status}).`);
        }
        if (!categoriesResponse.ok || categoriesResult.error) {
          throw new Error(categoriesResult.message || `Falha ao carregar categorias (${categoriesResponse.status}).`);
        }

        if (!active) return;
        setDebts(Array.isArray(debtsResult.data) ? debtsResult.data : []);
        setInvestmentMovements(Array.isArray(investmentsResult.data) ? investmentsResult.data : []);
        setInvestmentBalance(investmentsResult.balance ?? "0.00");
        setCategories(Array.isArray(categoriesResult.data) ? categoriesResult.data : []);
      } catch (error) {
        if (active) setRelatedDataError(error.message || "Não foi possível carregar todos os dados para exportação.");
      } finally {
        if (active) setLoadingRelatedData(false);
      }
    };

    loadRelatedData();
    return () => { active = false; };
  }, [isOpen]);

  const updateIncludedData = (key, checked) => {
    setIncludedData((previous) => ({ ...previous, [key]: checked }));
  };

  if (!isOpen) return null;

  // Função para formatar data
  const formatDate = (date) => {
    const dateKey = String(date ?? "").match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (dateKey) {
      const [, year, month, day] = dateKey;
      return `${day}/${month}/${year}`;
    }
    const parsed = new Date(date);
    return Number.isNaN(parsed.getTime()) ? "" : parsed.toLocaleDateString("pt-BR");
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

  const getTransactionExportType = (transaction) => {
    if (transaction.debtInstallment) return "Pagamento de dívida";
    if (transaction.investmentMovement) {
      return transaction.investmentMovement.type === "withdrawal" ? "Resgate" : "Aporte";
    }
    if (Number(transaction.typeId) === 1) return "Receita";
    if (Number(transaction.typeId) === 2) return "Despesa";
    if (Number(transaction.typeId) === 3) return "Investimento";
    return "Outro";
  };

  // Função para filtrar transações por período
  const getFilteredTransactions = () => {
    let filtered = [...transactions];
    const toLocalDate = (value) => {
      const match = String(value ?? "").match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (match) return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
      return new Date(value);
    };
    
    if (exportRange === 'last30') {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      filtered = filtered.filter(t => toLocalDate(t.date) >= thirtyDaysAgo);
    } else if (exportRange === 'last90') {
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
      filtered = filtered.filter(t => toLocalDate(t.date) >= ninetyDaysAgo);
    } else if (exportRange === 'thisMonth') {
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      filtered = filtered.filter(t => toLocalDate(t.date) >= firstDay);
    }
    
    return filtered;
  };

  const filteredTransactions = getFilteredTransactions();
  const exportTransactions = includedData.transactions ? filteredTransactions : [];
  const exportDebts = includedData.debts ? debts : [];
  const exportInvestmentMovements = includedData.investments ? investmentMovements : [];
  const exportCategories = includedData.categories ? categories : [];
  const exportInstallments = exportDebts.flatMap((debt) =>
    (debt.installments || []).map((installment) => ({
      ...installment,
      debt_name: debt.name,
      creditor: debt.creditor,
    })),
  );
  const exportSummary = exportTransactions.reduce((summary, transaction) => {
    const amount = parseAmount(transaction.value);
    if (Number(transaction.typeId) === 1) summary.income += amount;
    if (Number(transaction.typeId) === 2 && transaction.debtInstallment) summary.debtPayments += amount;
    else if (Number(transaction.typeId) === 2) summary.expense += amount;
    if (Number(transaction.typeId) === 3) summary.investment += amount;
    return summary;
  }, { income: 0, expense: 0, debtPayments: 0, investment: 0 });
  exportSummary.balance = exportSummary.income - exportSummary.expense - exportSummary.debtPayments - exportSummary.investment;

  const selectedRecordCount = exportTransactions.length
    + exportDebts.length
    + exportInstallments.length
    + exportInvestmentMovements.length
    + exportCategories.length;
  const hasSelectedData = Object.values(includedData).some(Boolean);

  const formatDateTime = (value) => value
    ? new Date(value).toLocaleString("pt-BR")
    : "";

  const toCSVCell = (value) => {
    let text = value == null ? "" : String(value);
    if (/^[=+@\-]/.test(text)) text = `'${text}`;
    return `"${text.replace(/"/g, '""')}"`;
  };

  const getCSVRows = () => {
    const headers = ["Grupo", "ID", "Data", "Descrição", "Tipo", "Status", "Valor", "Detalhes"];
    const rows = [headers];
    exportTransactions.forEach((transaction) => rows.push([
      "Transação",
      transaction.id,
      formatDate(transaction.date),
      transaction.description,
      getTransactionExportType(transaction),
      transaction.status ? "Confirmado" : "Pendente",
      parseAmount(transaction.value).toFixed(2),
      JSON.stringify({ category: transaction.category?.name || "", salary: Boolean(transaction.isSalary), debt: transaction.debtInstallment || null, investmentMovement: transaction.investmentMovement || null, createdAt: transaction.createdAt || "" }),
    ]));
    exportDebts.forEach((debt) => rows.push([
      "Dívida", debt.id, formatDate(debt.first_due_date), debt.name, debt.recurring ? "Recorrente" : "Única", "", parseAmount(debt.amount).toFixed(2),
      JSON.stringify({ creditor: debt.creditor || "", installmentCount: debt.installment_count, createdAt: debt.createdAt || "", updatedAt: debt.updatedAt || "" }),
    ]));
    exportInstallments.forEach((installment) => rows.push([
      "Parcela", installment.id, formatDate(installment.due_date), installment.debt_name, `${installment.installment_number}/${installment.debt?.installment_count || ""}`, installment.status, parseAmount(installment.amount).toFixed(2),
      JSON.stringify({ debtId: installment.debt_id, creditor: installment.creditor || "", autoSettle: installment.auto_settle, transactionId: installment.transaction_id, paidAt: installment.paid_at, createdAt: installment.createdAt || "", updatedAt: installment.updatedAt || "" }),
    ]));
    exportInvestmentMovements.forEach((movement) => rows.push([
      "Investimento", movement.id, formatDate(movement.date), movement.description || "", movement.type === "contribution" ? "Aporte" : "Resgate", "Confirmado", parseAmount(movement.amount).toFixed(2),
      JSON.stringify({ transactionId: movement.transaction_id, createdAt: movement.createdAt || "", updatedAt: movement.updatedAt || "" }),
    ]));
    exportCategories.forEach((category) => rows.push([
      "Categoria", category.id, "", category.name, Number(category.type_id) === 1 ? "Receita" : Number(category.type_id) === 2 ? "Despesa" : "Investimento", "", "",
      JSON.stringify({ icon: category.icon || "", color: category.color || "", typeId: category.type_id, createdAt: category.createdAt || "", updatedAt: category.updatedAt || "" }),
    ]));
    return rows;
  };

  // Gerar PDF - CORRIGIDO para tratar os amounts
  const generatePDF = async () => {
    setIsExporting(true);
    
    try {
      const doc = new jsPDF({ orientation: 'landscape' });

      // Cabeçalho
      doc.setFontSize(20);
      doc.text('Backup Financeiro Completo', 14, 22);
      
      doc.setFontSize(11);
      doc.setTextColor(100, 100, 100);
      doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 14, 30);
      doc.text(`Período das transações: ${exportRange === 'all' ? 'Todo o período' : exportRange}`, 14, 36);
      doc.text(`Registros exportados: ${selectedRecordCount}`, 14, 42);

      // Resumo
      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);
      doc.text('Resumo Financeiro', 14, 55);

      autoTable(doc, {
        startY: 60,
        head: [['Item', 'Valor']],
        body: [
          ['Receitas exportadas', `R$ ${exportSummary.income.toFixed(2)}`],
          ['Despesas comuns', `R$ ${exportSummary.expense.toFixed(2)}`],
          ['Pagamentos de dívidas', `R$ ${exportSummary.debtPayments.toFixed(2)}`],
          ['Investimentos no extrato', `R$ ${exportSummary.investment.toFixed(2)}`],
          ['Saldo líquido exportado', `R$ ${exportSummary.balance.toFixed(2)}`],
          ['Saldo investido atual', includedData.investments ? `R$ ${parseAmount(investmentBalance).toFixed(2)}` : 'Não incluído'],
          ['Dívidas cadastradas', String(exportDebts.length)],
          ['Parcelas', String(exportInstallments.length)],
          ['Movimentações de investimento', String(exportInvestmentMovements.length)],
                  ['Categorias', String(exportCategories.length)],
        ],
        theme: 'grid',
        headStyles: { fillColor: [99, 102, 241] },
        styles: { fontSize: 11, cellPadding: 5 },
      });

      let nextY = doc.lastAutoTable.finalY + 15;
      const addSection = (title, headers, rows) => {
        if (!rows.length) return;
        const pageHeight = doc.internal.pageSize.getHeight();
        if (nextY > pageHeight - 24) {
          doc.addPage();
          nextY = 20;
        }
        doc.setFontSize(13);
        doc.setTextColor(0, 0, 0);
        doc.text(title, 14, nextY);
        autoTable(doc, {
          startY: nextY + 5,
          head: [headers],
          body: rows,
          theme: 'grid',
          headStyles: { fillColor: [44, 105, 85] },
          styles: { fontSize: 8, cellPadding: 2, overflow: 'linebreak' },
        });
        nextY = doc.lastAutoTable.finalY + 12;
      };

      addSection('Transações', ['ID', 'Data', 'Descrição', 'Tipo', 'Status', 'Valor', 'Categoria', 'Salário', 'Criada em'], exportTransactions.map((t) => [
        t.id,
        formatDate(t.date),
        t.description || 'Sem descrição',
        getTransactionExportType(t),
        t.status ? 'Confirmado' : 'Pendente',
        `R$ ${parseAmount(t.value).toFixed(2)}`,
        t.category?.name || '',
        t.isSalary ? 'Sim' : 'Não',
        formatDateTime(t.createdAt),
      ]));

      addSection('Dívidas', ['ID', 'Nome', 'Credor', 'Valor', '1º vencimento', 'Recorrente', 'Parcelas', 'Criada em', 'Atualizada em'], exportDebts.map((debt) => [
        debt.id,
        debt.name,
        debt.creditor || '',
        `R$ ${parseAmount(debt.amount).toFixed(2)}`,
        formatDate(debt.first_due_date),
        debt.recurring ? 'Sim' : 'Não',
        debt.installment_count,
        formatDateTime(debt.createdAt),
        formatDateTime(debt.updatedAt),
      ]));

      addSection('Parcelas de dívidas', ['ID', 'Dívida', 'Parcela', 'Vencimento', 'Valor', 'Status', 'Liquidação automática', 'Transação', 'Pago em'], exportInstallments.map((installment) => [
        installment.id,
        installment.debt_name,
        `${installment.installment_number}/${installment.debt?.installment_count || ''}`,
        formatDate(installment.due_date),
        `R$ ${parseAmount(installment.amount).toFixed(2)}`,
        installment.status,
        installment.auto_settle ? 'Sim' : 'Não',
        installment.transaction_id || '',
        formatDateTime(installment.paid_at),
      ]));

      addSection('Movimentações de investimento', ['ID', 'Data', 'Tipo', 'Valor', 'Descrição', 'Transação', 'Criada em'], exportInvestmentMovements.map((movement) => [
        movement.id,
        formatDate(movement.date),
        movement.type === 'contribution' ? 'Aporte' : 'Resgate',
        `R$ ${parseAmount(movement.amount).toFixed(2)}`,
        movement.description || '',
        movement.transaction_id,
        formatDateTime(movement.createdAt),
      ]));

      addSection('Categorias', ['ID', 'Nome', 'Tipo', 'Ícone', 'Cor', 'Criada em', 'Atualizada em'], exportCategories.map((category) => [
        category.id,
        category.name,
        Number(category.type_id) === 1 ? 'Receita' : Number(category.type_id) === 2 ? 'Despesa' : 'Investimento',
        category.icon || '',
        category.color || '',
        formatDateTime(category.createdAt),
        formatDateTime(category.updatedAt),
      ]));

      if (includeCharts && exportTransactions.length > 0) {
        const categories = {};
        exportTransactions.forEach((transaction) => {
          const type = getTransactionExportType(transaction);
          categories[type] = (categories[type] || 0) + parseAmount(transaction.value);
        });
        const total = Object.values(categories).reduce((sum, amount) => sum + amount, 0);
        addSection('Resumo por tipo de transação', ['Tipo', 'Valor', 'Participação'], Object.entries(categories).map(([type, amount]) => [
          type,
          `R$ ${amount.toFixed(2)}`,
          total > 0 ? `${((amount / total) * 100).toFixed(1)}%` : '0%',
        ]));
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
      const wb = XLSX.utils.book_new();
      const addSheet = (name, rows, headers) => {
        const sheet = XLSX.utils.json_to_sheet(rows, { header: headers });
        XLSX.utils.book_append_sheet(wb, sheet, name);
      };

      addSheet('Resumo', [
        { Item: 'Receitas exportadas', Valor: exportSummary.income },
        { Item: 'Despesas comuns', Valor: exportSummary.expense },
        { Item: 'Pagamentos de dívidas', Valor: exportSummary.debtPayments },
        { Item: 'Investimentos no extrato', Valor: exportSummary.investment },
        { Item: 'Saldo líquido exportado', Valor: exportSummary.balance },
        { Item: 'Dívidas cadastradas', Valor: exportDebts.length },
        { Item: 'Parcelas de dívidas', Valor: exportInstallments.length },
        { Item: 'Movimentações de investimento', Valor: exportInvestmentMovements.length },
        { Item: 'Saldo investido atual', Valor: includedData.investments ? parseAmount(investmentBalance) : 0 },
      ], ['Item', 'Valor']);

      if (includedData.transactions) {
        addSheet('Transações', exportTransactions.map((t) => ({
          ID: t.id,
          Data: formatDate(t.date),
          Descrição: t.description || 'Sem descrição',
          Tipo: getTransactionExportType(t),
          Status: t.status ? 'Confirmado' : 'Pendente',
          Valor: parseAmount(t.value),
          Categoria: t.category?.name || '',
          Salário: t.isSalary ? 'Sim' : 'Não',
          'Criada em': formatDateTime(t.createdAt),
        })), ['ID', 'Data', 'Descrição', 'Tipo', 'Status', 'Valor', 'Categoria', 'Salário', 'Criada em']);
      }

      if (includedData.debts) {
        addSheet('Dívidas', exportDebts.map((debt) => ({
          ID: debt.id,
          Nome: debt.name,
          Credor: debt.creditor || '',
          Valor: parseAmount(debt.amount),
          'Primeiro vencimento': formatDate(debt.first_due_date),
          Recorrente: debt.recurring ? 'Sim' : 'Não',
          Parcelas: debt.installment_count,
          'Criada em': formatDateTime(debt.createdAt),
          'Atualizada em': formatDateTime(debt.updatedAt),
        })), ['ID', 'Nome', 'Credor', 'Valor', 'Primeiro vencimento', 'Recorrente', 'Parcelas', 'Criada em', 'Atualizada em']);
        addSheet('Parcelas', exportInstallments.map((installment) => ({
          ID: installment.id,
          'ID da dívida': installment.debt_id,
          Dívida: installment.debt_name,
          Credor: installment.creditor || '',
          Parcela: installment.installment_number,
          Vencimento: formatDate(installment.due_date),
          Valor: parseAmount(installment.amount),
          Status: installment.status,
          'Liquidação automática': installment.auto_settle ? 'Sim' : 'Não',
          'ID da transação': installment.transaction_id || '',
          'Pago em': formatDateTime(installment.paid_at),
          'Criada em': formatDateTime(installment.createdAt),
          'Atualizada em': formatDateTime(installment.updatedAt),
        })), ['ID', 'ID da dívida', 'Dívida', 'Credor', 'Parcela', 'Vencimento', 'Valor', 'Status', 'Liquidação automática', 'ID da transação', 'Pago em', 'Criada em', 'Atualizada em']);
      }

      if (includedData.investments) {
        addSheet('Investimentos', exportInvestmentMovements.map((movement) => ({
          ID: movement.id,
          Data: formatDate(movement.date),
          Tipo: movement.type === 'contribution' ? 'Aporte' : 'Resgate',
          Valor: parseAmount(movement.amount),
          Descrição: movement.description || '',
          'ID da transação': movement.transaction_id,
          'Criada em': formatDateTime(movement.createdAt),
          'Atualizada em': formatDateTime(movement.updatedAt),
        })), ['ID', 'Data', 'Tipo', 'Valor', 'Descrição', 'ID da transação', 'Criada em', 'Atualizada em']);
      }

      if (includedData.categories) {
        addSheet('Categorias', exportCategories.map((category) => ({
          ID: category.id,
          Nome: category.name,
          Tipo: Number(category.type_id) === 1 ? 'Receita' : Number(category.type_id) === 2 ? 'Despesa' : 'Investimento',
          Ícone: category.icon || '',
          Cor: category.color || '',
          'Criada em': formatDateTime(category.createdAt),
          'Atualizada em': formatDateTime(category.updatedAt),
        })), ['ID', 'Nome', 'Tipo', 'Ícone', 'Cor', 'Criada em', 'Atualizada em']);
      }

      if (includeCharts && includedData.transactions && exportTransactions.length > 0) {
        const categories = {};
        exportTransactions.forEach(t => {
          const type = getTransactionExportType(t);
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
      saveAs(blob, `backup-finflow-completo-${Date.now()}.xlsx`);
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
      const csvString = getCSVRows().map((row) => row.map(toCSVCell).join(",")).join("\r\n");
      const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
      saveAs(blob, `backup-finflow-completo-${Date.now()}.csv`);
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
      const exportData = {
        metadata: {
          exportDate: new Date().toISOString(),
          period: exportRange,
          includedData,
          transactionCount: exportTransactions.length,
          debtCount: exportDebts.length,
          installmentCount: exportInstallments.length,
          investmentMovementCount: exportInvestmentMovements.length,
          appVersion: '1.0.0'
        },
        summary: {
          totalIncome: exportSummary.income,
          totalExpense: exportSummary.expense,
          totalDebtPayments: exportSummary.debtPayments,
          totalInvestmentTransactions: exportSummary.investment,
          balance: exportSummary.balance,
          currentInvestmentBalance: includedData.investments ? parseAmount(investmentBalance) : null,
        },
        transactions: exportTransactions,
        debts: exportDebts,
        installments: exportInstallments,
        investments: exportInvestmentMovements,
        categories: exportCategories,
        filters: filters
      };

      const jsonString = JSON.stringify(exportData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      saveAs(blob, `backup-finflow-completo-${Date.now()}.json`);
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
    if (!hasSelectedData || selectedRecordCount === 0 || loadingRelatedData || relatedDataError) return;
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
            <h3>O que incluir</h3>
            {relatedDataError && <div className="export-data-error" role="alert">{relatedDataError}</div>}
            <div className="checkbox-group export-data-groups">
              <label className="checkbox-option">
                <input type="checkbox" checked={includedData.transactions} onChange={(event) => updateIncludedData("transactions", event.target.checked)} />
                <span>Transações ({filteredTransactions.length})</span>
              </label>
              <label className="checkbox-option">
                <input type="checkbox" checked={includedData.debts} onChange={(event) => updateIncludedData("debts", event.target.checked)} />
                <span>Dívidas e parcelas ({loadingRelatedData ? "carregando…" : `${debts.length} dívidas · ${debts.reduce((total, debt) => total + (debt.installments?.length || 0), 0)} parcelas`})</span>
              </label>
              <label className="checkbox-option">
                <input type="checkbox" checked={includedData.investments} onChange={(event) => updateIncludedData("investments", event.target.checked)} />
                <span>Movimentações de investimento ({loadingRelatedData ? "carregando…" : `${investmentMovements.length} registros`})</span>
              </label>
              <label className="checkbox-option">
                <input type="checkbox" checked={includedData.categories} onChange={(event) => updateIncludedData("categories", event.target.checked)} />
                <span>Categorias ({loadingRelatedData ? "carregando…" : `${categories.length} registros`})</span>
              </label>
              {loadingRelatedData && <small className="export-loading-related">Buscando os dados financeiros completos…</small>}
            </div>
          </div>

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
                  • Excel: Separa os dados por abas<br/>
                  • {selectedRecordCount} registros serão exportados
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
                  <span>Conjuntos incluídos</span>
                  <strong>{Object.values(includedData).filter(Boolean).length}/4</strong>
                </div>
                <div className="preview-stat">
                  <span>Registros</span>
                  <strong>{selectedRecordCount}</strong>
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
            disabled={isExporting || loadingRelatedData || Boolean(relatedDataError) || !hasSelectedData || selectedRecordCount === 0}
          >
            {isExporting ? (
              <>
                <div className="spinner-small"></div>
                Exportando...
              </>
            ) : (
              <>
                <FiDownload />
                Exportar {selectedRecordCount} registros
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ExportModal;