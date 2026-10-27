import { useState } from "react";
import "./AutomaticDelivery.css";
import StatusSwitch from "./StatusSwitch";
import DeliveryHistory from "./DeliveryHistory";
import "./DeliveryHistory.css";

function AutomaticDelivery() {
  const [isEnabled, setIsEnabled] = useState(false);
  const [selectedTerm, setSelectedTerm] = useState("");
  const [emailNotification, setEmailNotification] = useState(false);
  const [acceptanceDeadline, setAcceptanceDeadline] = useState(false);
  const [deadlineDays, setDeadlineDays] = useState("");
  const [history, setHistory] = useState([]);
  const [previousState, setPreviousState] = useState(false);

  const terms = [
    { id: 1, name: "Termo Padrão v1.0" },
    { id: 2, name: "Termo Atualizado" },
    { id: 3, name: "Termo Antigo" },
    { id: 4, name: "Termo de Revisão" },
  ];

  const handleToggle = (id) => {
    setIsEnabled(!isEnabled);
  };

  const handleSave = () => {
    if (isEnabled !== previousState) {
      const situation = isEnabled ? "Ativação" : "Desativação";
      const termName = terms.find((t) => t.id == selectedTerm)?.name || "Termo desconhecido";
      
      const newEntry = {
        date: new Date(),
        situation: situation,
        termName: termName,
      };
      
      setHistory([newEntry, ...history]);
      setPreviousState(isEnabled);
    }
    console.log({
      isEnabled,
      selectedTerm,
      emailNotification,
      acceptanceDeadline,
      deadlineDays,
    });
  };

  const handleCancel = () => {
    setIsEnabled(previousState);
    setSelectedTerm("");
    setEmailNotification(false);
    setAcceptanceDeadline(false);
    setDeadlineDays("");
  };

  return (
    <div className="automatic-delivery-container">
      <div className="ad-section">
        <h3>ENVIO AUTOMÁTICO</h3>

        <div className="ad-toggle-section">
          <StatusSwitch
            isActive={isEnabled}
            onToggle={handleToggle}
            id="auto-delivery"
          />
        </div>

        <div className="ad-select-section">
          <label htmlFor="term-select">Selecionar termo</label>
          <select
            id="term-select"
            value={selectedTerm}
            onChange={(e) => setSelectedTerm(e.target.value)}
            className="ad-select"
            disabled={!isEnabled}
          >
            <option value="">Selecione um termo</option>
            {terms.map((term) => (
              <option key={term.id} value={term.id}>
                {term.name}
              </option>
            ))}
          </select>
        </div>

        <div className="ad-options-section">
          <h4>Opções de envio</h4>

          <div className="ad-option">
            <div className="ad-checkbox-group">
              <input
                type="checkbox"
                id="email-notification"
                checked={emailNotification}
                onChange={(e) => setEmailNotification(e.target.checked)}
                disabled={!isEnabled}
              />
              <label htmlFor="email-notification">
                <strong>Enviar e-mail de notificação</strong>
              </label>
            </div>
            <p className="ad-option-description">
              Será enviado um e-mail para os usuários com o link do Connect
            </p>
          </div>

          <div className="ad-option">
            <div className="ad-checkbox-group">
              <input
                type="checkbox"
                id="deadline"
                checked={acceptanceDeadline}
                onChange={(e) => setAcceptanceDeadline(e.target.checked)}
                disabled={!isEnabled}
              />
              <label htmlFor="deadline">
                <strong>Definir prazo para aceite</strong>
              </label>
            </div>
            {acceptanceDeadline && (
              <div className="ad-deadline-input">
                <p>Prazo em dias para o termo ser aceito:</p>
                <div className="ad-input-group">
                  <input
                    type="number"
                    value={deadlineDays}
                    onChange={(e) => setDeadlineDays(e.target.value)}
                    placeholder="___"
                    className="ad-input"
                    min="1"
                    disabled={!isEnabled}
                  />
                  <span>dias</span>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="ad-buttons">
          <button className="ad-btn-cancel" onClick={handleCancel}>
            CANCELAR
          </button>
          <button className="ad-btn-save" onClick={handleSave}>
            SALVAR
          </button>
        </div>

        <div className="ad-info-box">
          <div className="ad-info-icon">ℹ</div>
          <p>
            Ao habilitar esta funcionalidade, o termo será enviado automaticamente
            quando novos vínculos de usuários com dispositivos e linhas forem
            realizados.
          </p>
        </div>

        <DeliveryHistory history={history} />
      </div>
    </div>
  );
}

export default AutomaticDelivery;
