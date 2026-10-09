import Papa from "papaparse";
import { parseStrict as parseOFX } from "ofx-js";

const MAX_IMPORT_ROWS = 500;

const normalizeText = (value) => String(value ?? "")
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLocaleLowerCase("pt-BR")
  .replace(/[^a-z0-9]/g, "");

const toArray = (value) => value == null ? [] : Array.isArray(value) ? value : [value];

const makeDateKey = (year, month, day) => {
  const dateKey = `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const date = new Date(`${dateKey}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === dateKey
    ? dateKey
    : null;
};

const findHeader = (headers, aliases) => {
  const normalizedAliases = aliases.map(normalizeText);
  return headers.find((header) => normalizedAliases.includes(normalizeText(header)))
    || headers.find((header) => normalizedAliases.some((alias) => alias.length > 5 && normalizeText(header).includes(alias)));
};

export const parseImportAmount = (value) => {
  let text = String(value ?? "").trim();
  if (!text) return null;

  const negativeByParentheses = /^\(.*\)$/.test(text);
  text = text.replace(/[()\sR$€£¥]/gi, "").replace(/[^\d,.-]/g, "");
  if (!text || !/\d/.test(text)) return null;

  const commaIndex = text.lastIndexOf(",");
  const dotIndex = text.lastIndexOf(".");

  if (commaIndex >= 0 && dotIndex >= 0) {
    const decimalIndex = Math.max(commaIndex, dotIndex);
    const integer = text.slice(0, decimalIndex).replace(/[,.]/g, "");
    const fraction = text.slice(decimalIndex + 1).replace(/[,.]/g, "");
    text = `${integer}.${fraction}`;
  } else if (commaIndex >= 0) {
    const digitsAfterSeparator = text.length - commaIndex - 1;
    text = digitsAfterSeparator > 0 && digitsAfterSeparator <= 2
      ? `${text.slice(0, commaIndex).replace(/,/g, "")}.${text.slice(commaIndex + 1)}`
      : text.replace(/,/g, "");
  } else if (dotIndex >= 0) {
    const digitsAfterSeparator = text.length - dotIndex - 1;
    if (digitsAfterSeparator > 2) text = text.replace(/\./g, "");
  }

  const amount = Number(text);
  if (!Number.isFinite(amount)) return null;
  return negativeByParentheses ? -Math.abs(amount) : amount;
};

export const parseImportDate = (value) => {
  const text = String(value ?? "").trim();
  if (!text) return null;

  const isoDate = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoDate) return makeDateKey(isoDate[1], isoDate[2], isoDate[3]);

  const compactDate = text.match(/^(\d{4})(\d{2})(\d{2})/);
  if (compactDate) return makeDateKey(compactDate[1], compactDate[2], compactDate[3]);

  const brazilianDate = text.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})/);
  if (brazilianDate) {
    const [, day, month, rawYear] = brazilianDate;
    const year = rawYear.length === 2 ? `20${rawYear}` : rawYear;
    return makeDateKey(year, month, day);
  }

  const excelSerial = Number(text);
  if (Number.isFinite(excelSerial) && excelSerial > 20000 && excelSerial < 100000) {
    const date = new Date(Date.UTC(1899, 11, 30 + excelSerial));
    return makeDateKey(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
  }

  const parsedDate = new Date(text);
  if (Number.isNaN(parsedDate.getTime())) return null;
  return makeDateKey(parsedDate.getFullYear(), parsedDate.getMonth() + 1, parsedDate.getDate());
};

const parseTransactionType = (typeValue, signedAmount) => {
  const type = normalizeText(typeValue);
  if (/(invest|aporte|aplicacao|buy(mf|stock|debt|other|opt)|reinvest)/.test(type)) return { typeId: 3, inferred: false };
  if (/^(receita|income|credit|credito|deposit|directdep|salary|entrada|div|int)/.test(type)) return { typeId: 1, inferred: false };
  if (/^(despesa|expense|debit|debito|withdrawal|withdraw|payment|purchase|saque|saida|check|atm|pos|fee|srvchg|directdebit)/.test(type)) return { typeId: 2, inferred: false };
  return { typeId: signedAmount < 0 ? 2 : 1, inferred: true };
};

const parseBoolean = (value, fallback) => {
  if (value === undefined || value === null || String(value).trim() === "") return fallback;
  const normalized = normalizeText(value);
  if (["true", "1", "sim", "yes", "confirmado", "confirmed", "pago", "paid", "cleared", "posted"].includes(normalized)) return true;
  if (["false", "0", "nao", "no", "pendente", "pending", "unpaid"].includes(normalized)) return false;
  return fallback;
};

const makeImportRow = ({ date, description, signedAmount, type, status, isSalary, sourceId }, index) => {
  const normalizedDate = parseImportDate(date);
  const amount = parseImportAmount(signedAmount);
  const cleanDescription = String(description ?? "").trim();
  if (!normalizedDate || !cleanDescription || amount === null || amount === 0) return null;

  const { typeId, inferred } = parseTransactionType(type, amount);
  return {
    id: `${index}-${sourceId || normalizedDate}`,
    date: normalizedDate,
    description: cleanDescription.slice(0, 255),
    value: Math.abs(amount),
    typeId,
    typeWasInferred: inferred,
    classificationReason: inferred
      ? amount < 0 ? "Sugerido pelo valor negativo; confira antes de importar." : "Sugerido pelo valor positivo; confira antes de importar."
      : `Tipo informado no arquivo: ${String(type).trim()}`,
    status: parseBoolean(status, true),
    isSalary: typeId === 1 && parseBoolean(isSalary, false),
    selected: true,
  };
};

const findCSVColumns = (headers) => ({
  date: findHeader(headers, ["data", "date", "dtposted", "posteddate", "transactiondate", "datadatransacao"]),
  description: findHeader(headers, ["descricao", "description", "memo", "payee", "name", "historico", "history", "details", "merchant", "lancamento"]),
  amount: findHeader(headers, ["valor", "amount", "value", "trnamt", "transactionamount", "montante"]),
  debit: findHeader(headers, ["debito", "debit", "withdrawal", "saque"]),
  credit: findHeader(headers, ["credito", "credit", "deposit", "entrada"]),
  type: findHeader(headers, ["tipo", "type", "transactiontype", "natureza"]),
  status: findHeader(headers, ["status", "situacao"]),
  isSalary: findHeader(headers, ["salario", "salary", "issalary"]),
});

export const parseCSVText = (text) => new Promise((resolve, reject) => {
  Papa.parse(text, {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (header) => header.trim(),
    complete: ({ data, errors, meta }) => {
      try {
        const columns = findCSVColumns(meta.fields || []);
        if (!columns.date || !columns.description || (!columns.amount && !columns.debit && !columns.credit)) {
          throw new Error("Não encontrei as colunas necessárias. O CSV precisa ter data, descrição e valor ou colunas de débito/crédito.");
        }
        if (data.length > MAX_IMPORT_ROWS) {
          throw new Error(`O arquivo contém ${data.length} linhas. Importe no máximo ${MAX_IMPORT_ROWS} por vez.`);
        }

        const rows = [];
        const issues = errors.map((error) => `Linha ${error.row + 2}: ${error.message}`);
        data.forEach((record, index) => {
          let signedAmount = columns.amount ? parseImportAmount(record[columns.amount]) : null;
          if (signedAmount === null && (columns.debit || columns.credit)) {
            const debit = columns.debit ? parseImportAmount(record[columns.debit]) : null;
            const credit = columns.credit ? parseImportAmount(record[columns.credit]) : null;
            if (credit !== null && credit !== 0) signedAmount = Math.abs(credit);
            else if (debit !== null && debit !== 0) signedAmount = -Math.abs(debit);
          }

          const row = makeImportRow({
            date: record[columns.date],
            description: record[columns.description],
            signedAmount,
            type: columns.type ? record[columns.type] : "",
            status: columns.status ? record[columns.status] : undefined,
            isSalary: columns.isSalary ? record[columns.isSalary] : undefined,
          }, index);

          if (row) rows.push(row);
          else issues.push(`Linha ${index + 2}: data, descrição ou valor ausente/inválido.`);
        });

        if (!rows.length) throw new Error(issues[0] || "Nenhuma transação válida foi encontrada no CSV.");
        resolve({ rows, issues });
      } catch (error) {
        reject(error);
      }
    },
    error: reject,
  });
});

export const parseCSVFile = async (file) => parseCSVText(await file.text());

export const parseOFXFile = (text) => {
  const parsed = parseOFX(text);
  const responses = toArray(parsed?.OFX?.BANKMSGSRSV1?.STMTTRNRS);
  const transactions = responses.flatMap((response) =>
    toArray(response?.STMTRS).flatMap((statement) => toArray(statement?.BANKTRANLIST?.STMTTRN)),
  );

  if (!transactions.length) {
    throw new Error("Não encontrei lançamentos bancários neste OFX/QFX. Exporte um extrato de conta bancária e tente novamente.");
  }
  if (transactions.length > MAX_IMPORT_ROWS) {
    throw new Error(`O arquivo contém ${transactions.length} lançamentos. Importe no máximo ${MAX_IMPORT_ROWS} por vez.`);
  }

  const rows = [];
  const issues = [];
  transactions.forEach((transaction, index) => {
    const row = makeImportRow({
      date: transaction.DTPOSTED,
      description: transaction.NAME || transaction.MEMO || transaction.TRNTYPE,
      signedAmount: transaction.TRNAMT,
      type: transaction.TRNTYPE,
      sourceId: transaction.FITID,
    }, index);
    if (row) rows.push(row);
    else issues.push(`Lançamento ${index + 1}: data, descrição ou valor inválido.`);
  });

  if (!rows.length) throw new Error(issues[0] || "Nenhuma transação válida foi encontrada no OFX/QFX.");
  return { rows, issues };
};

export const getTransactionFingerprint = (transaction) => {
  const date = parseImportDate(transaction.date) || "";
  const amountInCents = Math.round(parseImportAmount(transaction.value) * 100);
  const description = normalizeText(transaction.description);
  return `${date}|${amountInCents}|${Number(transaction.typeId)}|${description}`;
};