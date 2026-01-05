import { useState, useEffect, useContext } from "react";
import { FiX, FiCheckCircle, FiClock, FiAlertCircle } from "react-icons/fi";
import MyContext from "../Context/Context";

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
      });
      setError("");
    }
  }, [transaction]);

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    
    setFormData(prev => ({
      ...prev,
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
      };

      console.log("🔄 Enviando atualização:", updateData);

      const response = await fetch("http://192.168.0.10:3001/transactions", {
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
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Editar Transação</h2>
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
                  <span className="radio-label">
                    <FiCheckCircle /> Confirmado
                  </span>
                </label>
                <label className="radio-option">
                  <input
                    type="radio"
                    name="status"
                    value="false"
                    checked={formData.status === false}
                    onChange={handleChange}
                  />
                  <span className="radio-label">
                    <FiClock /> Pendente
                  </span>
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
            <h4>Pré-visualização:</h4>
            <div className="preview-content">
              <p><strong>Valor:</strong> {formatCurrency(formData.value)}</p>
              <p><strong>Tipo:</strong> {
                typesTransactions.find(t => t.id === formData.typeId)?.type || "Desconhecido"
              }</p>
              <p><strong>Data:</strong> {new Date(formData.date).toLocaleDateString('pt-BR')}</p>
              <p><strong>Status:</strong> {formData.status ? "Confirmado" : "Pendente"}</p>
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