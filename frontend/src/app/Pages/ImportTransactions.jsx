import { useMemo, useRef, useState } from "react";
import { useContext } from "react";
import {
  FiAlertCircle,
  FiCheck,
  FiCheckCircle,
  FiChevronDown,
  FiClock,
  FiDownload,
  FiFileText,
  FiInfo,
  FiShield,
  FiUploadCloud,
  FiX,
} from "react-icons/fi";
import Header from "../Components/Header";
import MyContext from "../Context/Context";
import {
  getTransactionFingerprint,
  parseCSVFile,
  parseOFXFile,
} from "../utils/transactionImport";
import "../Styles/ImportTransactions.css";

const typeOptions = [
  { value: 1, label: "Receita", detail: "Crédito / entrada" },
  { value: 2, label: "Despesa", detail: "Débito / saída" },
  { value: 3, label: "Investimento", detail: "Aporte / aplicação" },
];

const formatCurrency = (value) => new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
}).format(Number(value) || 0);

const formatDate = (date) => {
  const [year, month, day] = String(date || "").split("-");
  return year && month && day ? `${day}/${month}/${year}` : "—";
};

const readOFX = async (file) => {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  const header = new TextDecoder("ascii").decode(bytes.slice(0, 512));
  const charset = header.match(/CHARSET\s*:\s*([^\r\n<\s]+)/i)?.[1]?.toUpperCase();
  const encoding = charset === "1252" || charset === "WINDOWS-1252"
    ? "windows-1252"
    : charset === "ISO-8859-1" || charset === "8859-1"
      ? "iso-8859-1"
      : "utf-8";
  return parseOFXFile(new TextDecoder(encoding).decode(buffer));
};

function ImportTransactions() {
  const { transactions, importTransactions } = useContext(MyContext);
  const fileInput = useRef(null);
  const [rows, setRows] = useState([]);
  const [fileName, setFileName] = useState("");
  const [issues, setIssues] = useState([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [parsing, setParsing] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [importing, setImporting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const existingFingerprints = useMemo(
    () => new Set(transactions.map(getTransactionFingerprint)),
    [transactions],
  );

  const rowsWithDuplicateStatus = useMemo(() => {
    const fileFingerprints = new Set();
    return rows.map((row) => {
      const fingerprint = getTransactionFingerprint(row);
      const duplicateInAccount = existingFingerprints.has(fingerprint);
      const duplicateInFile = fileFingerprints.has(fingerprint);
      fileFingerprints.add(fingerprint);
      return {
        ...row,
        duplicate: duplicateInAccount || duplicateInFile,
        duplicateReason: duplicateInAccount
          ? "Já existe no extrato da conta"
          : duplicateInFile
            ? "Registro repetido neste arquivo"
            : "",
      };
    });
  }, [rows, existingFingerprints]);

  const visibleRows = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("pt-BR");
    if (!query) return rowsWithDuplicateStatus;
    return rowsWithDuplicateStatus.filter((row) =>
      row.description.toLocaleLowerCase("pt-BR").includes(query)
      || formatDate(row.date).includes(query)
      || typeOptions.find((type) => type.value === row.typeId)?.label.toLocaleLowerCase("pt-BR").includes(query),
    );
  }, [rowsWithDuplicateStatus, search]);

  const selectedRows = rowsWithDuplicateStatus.filter((row) => row.selected);
  const duplicateCount = rowsWithDuplicateStatus.filter((row) => row.duplicate).length;
  const selectionSummary = useMemo(() => selectedRows.reduce((summary, row) => {
    summary.count[row.typeId] += 1;
    summary.total[row.typeId] += row.value;
    return summary;
  }, {
    count: { 1: 0, 2: 0, 3: 0 },
    total: { 1: 0, 2: 0, 3: 0 },
  }), [selectedRows]);

  const handleFile = async (file) => {
    if (!file) return;
    setError("");
    setNotice("");
    setIssues([]);
    setRows([]);
    setSearch("");

    const extension = file.name.split(".").pop()?.toLowerCase();
    if (!["csv", "ofx", "qfx"].includes(extension)) {
      setError("Selecione um arquivo CSV, OFX ou QFX.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("O arquivo ultrapassa o limite de 5 MB.");
      return;
    }

    setParsing(true);
    setFileName(file.name);
    try {
      const parsed = extension === "csv"
        ? await parseCSVFile(file)
        : await readOFX(file);
      const fileFingerprints = new Set();
      const records = parsed.rows.map((row) => {
        const fingerprint = getTransactionFingerprint(row);
        const duplicateInFile = fileFingerprints.has(fingerprint);
        fileFingerprints.add(fingerprint);
        return {
          ...row,
          selected: row.selected
            && !existingFingerprints.has(fingerprint)
            && !duplicateInFile,
        };
      });
      setRows(records);
      setIssues(parsed.issues || []);
    } catch (parseError) {
      setError(parseError.message || "Não foi possível ler este arquivo.");
      setFileName("");
    } finally {
      setParsing(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  };

  const updateRow = (rowId, changes) => {
    setRows((previous) => previous.map((row) => {
      if (row.id !== rowId) return row;
      const updated = { ...row, ...changes };
      if (changes.typeId !== undefined && changes.typeId !== 1) updated.isSalary = false;
      return updated;
    }));
  };

  const selectEligibleRows = () => {
    const eligibleIds = new Set(rowsWithDuplicateStatus.filter((row) => !row.duplicate).map((row) => row.id));
    setRows((previous) => previous.map((row) => eligibleIds.has(row.id) ? { ...row, selected: true } : row));
  };

  const importSelected = async () => {
    setImporting(true);
    setError("");
    try {
      const batch = selectedRows.map(({ value, typeId, description, date, status, isSalary }) => ({
        value,
        typeId,
        description,
        date,
        status,
        isSalary: typeId === 1 && isSalary,
      }));
      await importTransactions(batch);
      setNotice(`${batch.length} ${batch.length === 1 ? "transação importada" : "transações importadas"} com sucesso.`);
      setRows([]);
      setFileName("");
      setIssues([]);
      setConfirmOpen(false);
    } catch (importError) {
      setConfirmOpen(false);
      setError(importError.message || "A importação não foi concluída. Nenhuma linha foi gravada.");
    } finally {
      setImporting(false);
    }
  };

  const downloadTemplate = () => {
    const csv = "Data,Descrição,Tipo,Status,Salário,Valor\n06/10/2026,Salário mensal,Receita,Confirmado,Sim,4696.02\n06/10/2026,Conta de internet,Despesa,Pendente,Não,123.48\n";
    const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "modelo-importacao-finflow.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="transaction-import-page">
      <Header />
      <main className="transaction-import-content" id="main-content">
        <header className="transaction-import-heading">
          <div>
            <p className="transaction-import-eyebrow">Extratos e arquivos financeiros</p>
            <h1>Importar transações</h1>
            <p>Traga lançamentos de CSV, OFX ou QFX, revise a classificação e importe com segurança.</p>
          </div>
          <span className="transaction-import-heading-icon"><FiUploadCloud aria-hidden="true" /></span>
        </header>

        {error && <div className="import-feedback error" role="alert"><FiAlertCircle aria-hidden="true" />{error}</div>}
        {notice && <div className="import-feedback success" role="status"><FiCheckCircle aria-hidden="true" />{notice}</div>}

        <section className="import-workspace">
          <div className="import-main-column">
            <section className="import-upload-panel" aria-labelledby="import-file-title">
              <div className="import-panel-heading">
                <div><h2 id="import-file-title">Selecione o arquivo</h2><p>O arquivo é processado localmente; só as linhas confirmadas são enviadas.</p></div>
                <button className="import-template-button" type="button" onClick={downloadTemplate}><FiDownload aria-hidden="true" />Modelo CSV</button>
              </div>
              <button
                className={`import-dropzone ${parsing ? "is-loading" : ""} ${dragging ? "is-dragging" : ""}`}
                type="button"
                onClick={() => fileInput.current?.click()}
                onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
                onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setDragging(false); }}
                onDrop={(event) => { event.preventDefault(); setDragging(false); handleFile(event.dataTransfer.files?.[0]); }}
                disabled={parsing}
              >
                <span className="import-dropzone-icon">{parsing ? <span className="import-spinner" /> : <FiUploadCloud aria-hidden="true" />}</span>
                <strong>{parsing ? "Lendo arquivo..." : fileName || "Escolher CSV, OFX ou QFX"}</strong>
                <span>{parsing ? "Validando datas e valores" : "Até 5 MB · CSV exportado por bancos ou pelo FinFlow"}</span>
                <span className="import-file-picker-label">Procurar arquivo</span>
              </button>
              <input
                ref={fileInput}
                className="import-file-input"
                type="file"
                accept=".csv,.ofx,.qfx,text/csv,application/x-ofx,application/ofx"
                onChange={(event) => handleFile(event.target.files?.[0])}
                aria-label="Selecionar arquivo CSV, OFX ou QFX"
              />
              <div className="import-format-notes">
                <span><FiFileText aria-hidden="true" />CSV: data, descrição e valor (ou débito/crédito).</span>
                <span><FiInfo aria-hidden="true" />OFX/QFX: o sinal sugere entrada ou saída; revise o tipo antes de importar.</span>
              </div>
            </section>

            {issues.length > 0 && (
              <details className="import-issues">
                <summary><FiAlertCircle aria-hidden="true" />{issues.length} linha(s) não puderam ser importadas <FiChevronDown aria-hidden="true" /></summary>
                <ul>{issues.slice(0, 8).map((issue, index) => <li key={`${index}-${issue}`}>{issue}</li>)}</ul>
                {issues.length > 8 && <small>Mais {issues.length - 8} avisos não exibidos.</small>}
              </details>
            )}

            {rowsWithDuplicateStatus.length > 0 && (
              <section className="import-preview-panel" aria-labelledby="import-preview-title">
                <div className="import-preview-heading">
                  <div><h2 id="import-preview-title">Revisar lançamentos</h2><p>{rowsWithDuplicateStatus.length} linhas válidas{duplicateCount ? ` · ${duplicateCount} possíveis duplicatas` : ""}</p></div>
                  <div className="import-preview-tools">
                    <label className="import-search"><span className="visually-hidden">Buscar no arquivo</span><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar lançamento" /></label>
                    <button type="button" onClick={selectEligibleRows}>Selecionar válidas</button>
                  </div>
                </div>
                <p className="import-classification-note"><FiInfo aria-hidden="true" />Confirme por que cada linha é crédito, débito ou investimento. Valores pendentes continuam pendentes.</p>
                <div className="import-table-wrap">
                  <table className="import-table">
                    <thead><tr><th scope="col"><span className="visually-hidden">Importar</span></th><th scope="col">Data e descrição</th><th scope="col">Valor do arquivo</th><th scope="col">Classificação</th><th scope="col">Status</th></tr></thead>
                    <tbody>
                      {visibleRows.map((row) => (
                        <tr key={row.id} className={`${row.duplicate ? "is-duplicate" : ""} ${!row.selected ? "is-unselected" : ""}`}>
                          <td><input type="checkbox" checked={row.selected} onChange={(event) => updateRow(row.id, { selected: event.target.checked })} aria-label={`Importar ${row.description}`} /></td>
                          <td className="import-description-cell">
                            <strong>{row.description}</strong>
                            <span>{formatDate(row.date)}{row.typeWasInferred && <span className="import-review-tag">Revisar tipo</span>}</span>
                            {row.duplicate && <small className="import-duplicate-note"><FiAlertCircle aria-hidden="true" />{row.duplicateReason}; desmarcada por segurança.</small>}
                            {row.typeWasInferred && <small className="import-reason">{row.classificationReason}</small>}
                          </td>
                          <td className={`import-amount type-${row.typeId}`}>{row.value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</td>
                          <td>
                            <label className="import-type-select-label">
                              <span className="visually-hidden">Classificar {row.description}</span>
                              <select value={row.typeId} onChange={(event) => updateRow(row.id, { typeId: Number(event.target.value) })}>
                                {typeOptions.map((type) => <option key={type.value} value={type.value}>{type.label} · {type.detail}</option>)}
                              </select>
                            </label>
                            {row.typeId === 1 && <label className="import-salary-option"><input type="checkbox" checked={row.isSalary} onChange={(event) => updateRow(row.id, { isSalary: event.target.checked })} />Salário</label>}
                          </td>
                          <td><label className="import-status-select-label"><span className="visually-hidden">Status de {row.description}</span><select value={row.status ? "confirmed" : "pending"} onChange={(event) => updateRow(row.id, { status: event.target.value === "confirmed" })}><option value="confirmed">{row.typeId === 2 ? "Paga" : "Confirmada"}</option><option value="pending">Pendente</option></select></label></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="import-preview-footer">
                  <span>{selectedRows.length} de {rowsWithDuplicateStatus.length} selecionadas</span>
                  <button className="import-submit-button" type="button" onClick={() => setConfirmOpen(true)} disabled={selectedRows.length === 0 || importing}>
                    Revisar e importar <FiCheck aria-hidden="true" />
                  </button>
                </div>
              </section>
            )}
          </div>

          <aside className="import-guide-column">
            <section className="import-guide-panel">
              <div className="import-guide-heading"><FiShield aria-hidden="true" /><h2>Antes de confirmar</h2></div>
              <ol>
                <li>Revise o tipo de cada linha: receita é crédito, despesa é débito e investimento é aporte.</li>
                <li>Confira as linhas sinalizadas; duplicatas vêm desmarcadas inicialmente.</li>
                <li>Transações importadas preservam o status indicado no arquivo, quando disponível.</li>
              </ol>
              <p>O arquivo é interpretado neste navegador. Apenas os lançamentos selecionados são enviados à sua conta.</p>
            </section>
            <section className="import-type-legend" aria-labelledby="import-type-legend-title">
              <h2 id="import-type-legend-title">Classificações</h2>
              {typeOptions.map((type) => <div className={`import-legend-item type-${type.value}`} key={type.value}><strong>{type.label}</strong><span>{type.detail}</span></div>)}
            </section>
          </aside>
        </section>
      </main>

      {confirmOpen && (
        <div className="import-confirm-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !importing) setConfirmOpen(false); }}>
          <section className="import-confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="import-confirm-title" aria-describedby="import-confirm-description">
            <button className="import-dialog-close" type="button" onClick={() => setConfirmOpen(false)} disabled={importing} aria-label="Fechar"><FiX /></button>
            <span className="import-confirm-icon"><FiUploadCloud aria-hidden="true" /></span>
            <h2 id="import-confirm-title">Confirmar importação</h2>
            <p id="import-confirm-description">{selectedRows.length} lançamentos do arquivo {fileName ? `“${fileName}”` : "selecionado"} serão adicionados.</p>
            <div className="import-confirm-breakdown">
              {typeOptions.map((type) => <div key={type.value}><span>{type.label} <small>({type.detail})</small></span><strong>{selectionSummary.count[type.value]} · {formatCurrency(selectionSummary.total[type.value])}</strong></div>)}
            </div>
            <p className="import-confirm-warning"><FiInfo aria-hidden="true" />A importação é atômica: em caso de erro, nenhuma linha deste lote será gravada.</p>
            <div className="import-confirm-actions">
              <button type="button" onClick={() => setConfirmOpen(false)} disabled={importing}>Voltar à revisão</button>
              <button className="confirm-import-button" type="button" onClick={importSelected} disabled={importing}>{importing ? "Importando..." : "Confirmar importação"}</button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

export default ImportTransactions;