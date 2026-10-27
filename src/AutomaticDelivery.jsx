import { useState } from "react";
import "./AutomaticDelivery.css";
import StatusSwitch from "./StatusSwitch";
import DeliveryHistory from "./DeliveryHistory";
import "./DeliveryHistory.css";

function AutomaticDelivery() {
  const [isEnabled, setIsEnabled] = useState(false);
  const [selectedTerm, setSelectedTerm] = useState("");
  const [history, setHistory] = useState([]);
  const [previousState, setPreviousState] = useState(false);

  const terms = [
    { id: 1, name: "Termo Padrão v1.0" },
    { id: 2, name: "Termo Atualizado" },
    { id: 3, name: "Termo Antigo" },
    { id: 4, name: "Termo de Revisão" },
  ];

  const handleToggle = () => {
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
    console.log({ isEnabled, selectedTerm });
  };

  const handleCancel = () => {
    setIsEnabled(previousState);
    setSelectedTerm("");
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
