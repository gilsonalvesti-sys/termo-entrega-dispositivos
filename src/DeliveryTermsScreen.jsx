import { useState } from "react";
import "./DeliveryTermsScreen.css";
import TermModalForm from "./TermModalForm";
import StatusSwitch from "./StatusSwitch";
import AutomaticDelivery from "./AutomaticDelivery";

function DeliveryTermsScreen({ terms, setTerms }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [acceptanceDeadline, setAcceptanceDeadline] = useState(false);
  const [deadlineDays, setDeadlineDays] = useState("");
  const [emailNotification, setEmailNotification] = useState(false);

  // Filter terms based on search
  const filteredTerms = terms.filter((term) =>
    term.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Handle opening modal
  const handleNewTerm = () => {
    setIsModalOpen(true);
  };

  // Handle saving new term
  const handleSaveNewTerm = (formData) => {
    const newTerm = {
      id: Math.max(...terms.map((t) => t.id), 0) + 1,
      name: formData.name,
      version: formData.version,
      addedDate: new Date().toISOString().split("T")[0],
      status: "Ativo",
      text: formData.text,
    };
    setTerms([...terms, newTerm]);
    setIsModalOpen(false);
  };

  // Handle toggling status
  const handleToggleStatus = (termId) => {
    setTerms(
      terms.map((term) =>
        term.id === termId
          ? {
              ...term,
              status: term.status === "Ativo" ? "Inativo" : "Ativo",
            }
          : term
      )
    );
  };

  // Format date for display
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("pt-BR");
  };

  return (
    <div className="delivery-terms-container">
      <div className="header-section">
        <div className="breadcrumb">Empresas &gt; Configurações &gt; Termo de Entrega</div>
        <h1>Funcionalidades</h1>
      </div>

      <div className="controls-section">
        <div className="search-box">
          <input
            type="text"
            placeholder="Buscar por nome do termo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
        <button className="btn-novo-termo" onClick={handleNewTerm}>
          + NOVO TERMO
        </button>
      </div>

      <div className="terms-grid-container">
        {filteredTerms.length > 0 ? (
          <table className="terms-grid">
            <thead>
              <tr>
                <th>Nome do Termo</th>
                <th>Versão</th>
                <th>Adicionado em</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredTerms.map((term) => (
                <tr key={term.id}>
                  <td>{term.name}</td>
                  <td>{term.version}</td>
                  <td>{formatDate(term.addedDate)}</td>
                  <td>
                    <StatusSwitch
                      isActive={term.status === "Ativo"}
                      onToggle={handleToggleStatus}
                      id={term.id}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="no-results">
            <p>Nenhum termo encontrado</p>
          </div>
        )}
      </div>

      <section className="acceptance-deadline-section">
        <div className="deadline-checkbox-group">
          <input
            type="checkbox"
            id="term-acceptance-deadline"
            checked={acceptanceDeadline}
            onChange={(event) => setAcceptanceDeadline(event.target.checked)}
          />
          <label htmlFor="term-acceptance-deadline">
            <strong>Definir prazo para aceite</strong>
          </label>
        </div>
        {acceptanceDeadline && (
          <div className="term-deadline-input">
            <label htmlFor="term-deadline-days">Prazo em dias para o aceite de todos os termos:</label>
            <div className="term-deadline-input-group">
              <input
                type="number"
                id="term-deadline-days"
                value={deadlineDays}
                onChange={(event) => setDeadlineDays(event.target.value)}
                placeholder="___"
                min="1"
              />
              <span>dias</span>
            </div>
          </div>
        )}

        <div className="notification-option">
          <div className="deadline-checkbox-group">
            <input
              type="checkbox"
              id="term-email-notification"
              checked={emailNotification}
              onChange={(event) => setEmailNotification(event.target.checked)}
            />
            <label htmlFor="term-email-notification">
              <strong>Enviar e-mail de notificação</strong>
            </label>
          </div>
          <p className="term-notification-description">
            Será enviado um e-mail para os usuários com o link do Connect.
          </p>
        </div>
      </section>

      <AutomaticDelivery />

      <TermModalForm
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveNewTerm}
      />
    </div>
  );
}

export default DeliveryTermsScreen;
