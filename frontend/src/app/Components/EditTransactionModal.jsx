import { useState, useEffect, useContext } from "react";
import { FiX, FiCheckCircle, FiClock, FiAlertCircle, FiEdit2 } from "react-icons/fi";
import MyContext from "../Context/Context";
import { API_BASE_URL } from "../Services/request";

function EditTransactionModal({ 
  isOpen, 
  onClose, 
  transaction, 
  typesTransactions,
  onUpdateSuccess 
}) {
  const { getAllTransactions } = useContext(MyContext);
  
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    value: "",
    description: "",
    date: "",
    status: true,
    typeId: 1,
    isSalary: false,
  });
  const [error, setError] = useState("");

  // Preencher o formulário quando a transação mudar
  useEffect(() => {
    if (transaction) {
      setFormData({
        value: transaction.value,
        description: transaction.description,
        date: transaction.date.split('T')[0], // Formato YYYY-MM-DD
        status: transaction.status,
        typeId: transaction.typeId,
        isSalary: transaction.isSalary === true,
      });
      setError("");
    }
  }, [transaction]);

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    
    setFormData(prev => ({
      ...prev,
      ...(name === "typeId" && parseInt(value, 10) !== 1 ? { isSalary: false } : {}),
      [name]: type === 'radio' ? value === 'true' : 
              type === 'select-one' ? parseInt(value) : 
              name === 'value' ? parseFloat(value) || '' : 
              value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // Validar campos
      if (!formData.value || !formData.description || !formData.date) {
        throw new Error("Preencha todos os campos obrigatórios");
      }

      // Preparar dados para envio
      const updateData = {
        id: transaction.id, // ID da transação a ser atualizada
        value: parseFloat(formData.value),
        typeId: parseInt(formData.typeId),
        description: formData.description,
        date: formData.date,
        status: formData.status,
        isSalary: Number(formData.typeId) === 1 && formData.isSalary,
      };

      console.log("🔄 Enviando atualização:", updateData);

      const response = await fetch(`${API_BASE_URL}/transactions`, {
        method: "PATCH", // Note: SEU BACKEND usa PATCH, não PUT
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(updateData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `Erro ${response.status}`);
      }

      console.log("✅ Atualização bem-sucedida:", data);

      // Atualizar a lista de transações
      await getAllTransactions();

      // Fechar modal e notificar sucesso
      onUpdateSuccess("Transação atualizada com sucesso!");
      onClose();

    } catch (error) {
      console.error("❌ Erro na atualização:", error);
      setError(error.message || "Falha ao atualizar transação");
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value || 0);
  };

  // Se o modal não estiver aberto, não renderizar nada
  if (!isOpen || !transaction) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content transaction-entry-modal transaction-modal-edit"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-transaction-title"
      >
        <div className="modal-header">
          <div className="transaction-modal-heading">
            <span className="transaction-modal-icon"><FiEdit2 aria-hidden="true" /></span>
            <div>
              <span className="transaction-modal-eyebrow">Atualizar lançamento</span>
              <h2 id="edit-transaction-title">Editar transação</h2>
              <p>Revise os dados antes de salvar as alterações.</p>
            </div>
          </div>
          <button className="btn-close" onClick={onClose} aria-label="Fechar">
            <FiX />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="transaction-form">
          {error && (
            <div className="form-error">
              <FiAlertCircle /> {error}
            </div>
          )}

          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="edit-value">Valor (R$)*</label>
              <input
                id="edit-value"
                name="value"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0,00"
                value={formData.value}
                onChange={handleChange}
                required
              />
              <span className="form-hint">
                Atual: {formatCurrency(transaction.value)}
              </span>
            </div>

            <div className="form-group">
              <label htmlFor="edit-date">Data*</label>
              <input
                id="edit-date"
                name="date"
                type="date"
                value={formData.date}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="edit-type">Tipo*</label>
              <select
                id="edit-type"
                name="typeId"
                value={formData.typeId}
                onChange={handleChange}
                required
              >
                {typesTransactions.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.type}
                  </option>
                ))}
              </select>
            </div>
            {Number(formData.typeId) === 1 && (
              <div className="form-group salary-checkbox-group">
                <label className="salary-checkbox-label" htmlFor="edit-is-salary">
                  <input
                    id="edit-is-salary"
                    name="isSalary"
                    type="checkbox"
                    checked={formData.isSalary}
                    aria-describedby="edit-is-salary-help"
                    onChange={(event) =>
                      setFormData((previous) => ({
                        ...previous,
                        isSalary: event.target.checked,
                      }))
                    }
                  />
                  <span>Esta entrada é salário</span>
                </label>
                <span className="form-hint" id="edit-is-salary-help">
                  Marque apenas recebimentos de salário; a descrição da transação não é usada para inferir isso.
                </span>
              </div>
            )}

            <div className="form-group">
              <label>Status*</label>
              <div className="radio-group">
                <label className="radio-option">
                  <input
                    type="radio"
                    name="status"
                    value="true"
                    checked={formData.status === true}
                    onChange={handleChange}
                  />
                  <span className="radio-label"><FiCheckCircle />{Number(formData.typeId) === 2 ? " Paga" : " Confirmado"}</span>
                </label>
                <label className="radio-option">
                  <input
                    type="radio"
                    name="status"
                    value="false"
                    checked={formData.status === false}
                    onChange={handleChange}
                  />
                  <span className="radio-label"><FiClock /> Pendente</span>
                </label>
              </div>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="edit-description">Descrição*</label>
            <textarea
              id="edit-description"
              name="description"
              placeholder="Descreva esta transação..."
              value={formData.description}
              onChange={handleChange}
              rows="3"
              required
            />
            <span className="form-hint">
              Caracteres: {formData.description.length}
            </span>
          </div>

          <div className="transaction-preview">
            <div className="preview-heading">
              <span>Resumo do lançamento</span>
              <span className={`preview-status ${formData.status ? "is-confirmed" : "is-pending"}`}>
                {formData.status ? <FiCheckCircle /> : <FiClock />}
                {formData.status
                  ? Number(formData.typeId) === 2 ? "Paga" : "Confirmado"
                  : "Pendente"}
              </span>
            </div>
            <div className="preview-main">
              <span>Valor da transação</span>
              <strong>{formatCurrency(formData.value)}</strong>
            </div>
            <div className="preview-meta">
              <div>
                <span>Tipo</span>
                <strong>{typesTransactions.find((type) => Number(type.id) === Number(formData.typeId))?.type || "Selecione"}</strong>
              </div>
              <div>
                <span>Data</span>
                <strong>{formData.date ? new Date(`${formData.date}T12:00:00`).toLocaleDateString("pt-BR") : "Selecione"}</strong>
              </div>
            </div>
          </div>

          <div className="modal-actions">
            <button
              type="button"
              className="btn-secondary"
              onClick={onClose}
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner"></span>
                  Atualizando...
                </>
              ) : (
                "Salvar Alterações"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default EditTransactionModal;