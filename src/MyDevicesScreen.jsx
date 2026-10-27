import { useMemo, useState } from "react";
import "./MyDevicesScreen.css";

const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("pt-BR");
};

const getTermStatus = (term) =>
  term.termStatus === "Aceito" || term.termStatus === "Cancelado" || term.termStatus === "Recusado"
    ? term.termStatus
    : "Pendente";

const getTermStatusDate = (term) => {
  if (term.statusDate) return term.statusDate;
  const status = getTermStatus(term);
  if (status === "Aceito") return term.acceptedDate;
  if (status === "Cancelado" || status === "Recusado") {
    const eventType = status === "Cancelado" ? "cancelled" : "refused";
    return [...(term.events || [])].reverse().find((event) => event.type === eventType)?.date;
  }
  return null;
};

function MyDevicesScreen({ user, terms = [], setTerms }) {
  const [activeTab, setActiveTab] = useState("summary");
  const [selectedTermId, setSelectedTermId] = useState(null);
  const userTerms = useMemo(
    () =>
      terms
        .filter((term) => term.userId === user.id)
        .sort((a, b) => new Date(b.deliveryDate || b.issueDate) - new Date(a.deliveryDate || a.issueDate)),
    [terms, user.id]
  );
  const selectedTerm = userTerms.find((term) => term.id === selectedTermId) || null;

  const respondToTerm = (termId, status) => {
    const now = new Date();
    const statusDate = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, "0"),
      String(now.getDate()).padStart(2, "0"),
    ].join("-");
    setTerms((previousTerms) =>
      previousTerms.map((term) =>
        term.id === termId
          ? {
              ...term,
              termStatus: status,
              statusDate,
              acceptedDate: status === "Aceito" ? statusDate : null,
              events: [
                ...(term.events || []),
                {
                  date: statusDate,
                  type: status === "Aceito" ? "accepted" : "refused",
                  description: status === "Aceito" ? "Termo aceito pelo usuário." : "Termo recusado pelo usuário.",
                },
              ],
            }
          : term
      )
    );
    setSelectedTermId(null);
  };

  const downloadTerm = (term) => {
    const payload = [
      `Termo: ${term.templateTermName || "Termo de Entrega"}`,
      `Identificador: ${term.id}`,
      `Usuário: ${term.recipientName}`,
      `E-mail: ${term.recipientEmail}`,
      `Data de entrega: ${formatDate(term.deliveryDate)}`,
      `Itens: ${(term.items || []).filter((item) => item.category !== "sim").length}`,
      ...(term.templateTermText ? ["", term.templateTermText] : []),
    ].join("\n");
    const url = URL.createObjectURL(new Blob([payload], { type: "text/plain;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${term.id}-termo.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const renderStatusBadge = (status) => {
    const className =
      status === "Aceito"
        ? "status-success"
        : status === "Cancelado" || status === "Recusado"
          ? "status-cancelled"
          : "status-pending";
    return <span className={`badge ${className}`}>{status}</span>;
  };

  return (
    <div className="my-devices-screen">
      <header className="page-header">
        <div className="breadcrumb">Meus Dispositivos</div>
        <h1>Meus Dispositivos</h1>
      </header>

      <div className="category-tabs my-devices-tabs" role="tablist" aria-label="Minha conta">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "summary"}
          className={activeTab === "summary" ? "tab active" : "tab"}
          onClick={() => setActiveTab("summary")}
        >
          Resumo
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "terms"}
          className={activeTab === "terms" ? "tab active" : "tab"}
          onClick={() => setActiveTab("terms")}
        >
          Termos
        </button>
      </div>

      {activeTab === "summary" ? (
        <section className="card detail-card" role="tabpanel">
          <h2>Dados do usuário</h2>
          <div className="detail-grid my-devices-profile">
            <div><label>Nome</label><strong>{user.name}</strong></div>
            <div><label>E-mail</label><strong>{user.email}</strong></div>
            <div><label>Login</label><strong>{user.login || user.email}</strong></div>
            <div><label>Cargo</label><strong>{user.role || "—"}</strong></div>
            <div><label>Matrícula</label><strong>{user.employeeId || "—"}</strong></div>
            <div><label>Centro de custo</label><strong>{user.costCenter || "—"}</strong></div>
            <div><label>Empresa</label><strong>{user.company || "—"}</strong></div>
            <div><label>Gestor</label><strong>{user.manager || "—"}</strong></div>
            <div><label>Status</label><strong>{user.status || "—"}</strong></div>
            <div><label>Grupo de usuários</label><strong>{user.userGroup || "—"}</strong></div>
            <div className="my-devices-address"><label>Endereço</label><strong>{user.address || "—"}</strong></div>
          </div>
        </section>
      ) : (
        <section role="tabpanel">
          <div className="section-header"><h2>Termos recebidos</h2></div>
          {userTerms.length === 0 ? (
            <div className="empty-state card"><p>Nenhum termo recebido.</p></div>
          ) : (
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Termo</th><th>Data de entrega</th><th>Data de envio</th><th>Itens</th>
                    <th>Status</th><th>Data Status</th><th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {userTerms.map((term) => {
                    const status = getTermStatus(term);
                    return (
                      <tr key={term.id}>
                        <td>
                          {term.templateTermName
                            ? `${term.templateTermName}${term.templateTermVersion ? ` (v${term.templateTermVersion})` : ""}`
                            : "Termo de Entrega"}
                        </td>
                        <td>{formatDate(term.deliveryDate)}</td>
                        <td>{formatDate(term.firstSendDate || term.lastSendDate)}</td>
                        <td>{(term.items || []).filter((item) => item.category !== "sim").length}</td>
                        <td>{renderStatusBadge(status)}</td>
                        <td>{formatDate(getTermStatusDate(term))}</td>
                        <td>
                          <div className="my-device-term-actions">
                            <button
                              type="button"
                              className="icon-action"
                              aria-label={`Consultar termo ${term.id}`}
                              title="Consultar"
                              onClick={() => setSelectedTermId(term.id)}
                            >
                              <svg viewBox="0 0 24 24" aria-hidden="true">
                                <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
                                <circle cx="12" cy="12" r="3" />
                              </svg>
                            </button>
                            <button
                              type="button"
                              className="icon-action"
                              aria-label={`Baixar termo ${term.id}`}
                              title="Baixar"
                              onClick={() => downloadTerm(term)}
                            >
                              <svg viewBox="0 0 24 24" aria-hidden="true">
                                <path d="M12 3v12m0 0 5-5m-5 5-5-5M4 20h16" />
                              </svg>
                            </button>
                            {status === "Pendente" && (
                              <>
                                <button
                                  type="button"
                                  className="icon-action icon-action-accept"
                                  aria-label={`Aceitar termo ${term.id}`}
                                  title="Aceitar"
                                  onClick={() => respondToTerm(term.id, "Aceito")}
                                >
                                  <svg viewBox="0 0 24 24" aria-hidden="true">
                                    <path d="m5 12 5 5L20 7" />
                                  </svg>
                                </button>
                                <button
                                  type="button"
                                  className="icon-action icon-action-danger"
                                  aria-label={`Recusar termo ${term.id}`}
                                  title="Recusar"
                                  onClick={() => respondToTerm(term.id, "Recusado")}
                                >
                                  <svg viewBox="0 0 24 24" aria-hidden="true">
                                    <path d="m6 6 12 12M18 6 6 18" />
                                  </svg>
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {selectedTerm && (
        <div className="term-review-backdrop">
          <section
            className="term-review-modal card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="my-device-term-title"
          >
            <h2 id="my-device-term-title">Termo recebido</h2>
            <div className="term-review-summary">
              <div><label>Termo</label><strong>{selectedTerm.templateTermName || "Termo de Entrega"}</strong></div>
              <div><label>Identificador</label><strong>{selectedTerm.id}</strong></div>
              <div><label>Data de entrega</label><strong>{formatDate(selectedTerm.deliveryDate)}</strong></div>
              <div><label>Status</label>{renderStatusBadge(getTermStatus(selectedTerm))}</div>
            </div>
            <h3>Itens do termo</h3>
            {(selectedTerm.items || []).length === 0 ? (
              <p className="empty-inline">Nenhum item registrado neste termo.</p>
            ) : (
              <div className="table-wrapper">
                <table className="data-table">
                  <thead><tr><th>Tipo</th><th>Identificador</th><th>Descrição</th></tr></thead>
                  <tbody>
                    {selectedTerm.items.filter((item) => item.category !== "sim").map((item, index) => (
                      <tr key={`${item.category}-${item.identifier}-${index}`}>
                        <td>{item.category === "device" ? "Dispositivo" : "Linha"}</td>
                        <td>{item.identifier}</td>
                        <td>{item.label || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {selectedTerm.templateTermText && (
              <div className="my-device-term-text">
                <h3>Conteúdo do termo</h3>
                <div>{selectedTerm.templateTermText}</div>
              </div>
            )}
            {getTermStatus(selectedTerm) === "Pendente" && (
              <div className="wizard-actions">
                <button type="button" className="danger-btn" onClick={() => respondToTerm(selectedTerm.id, "Recusado")}>
                  Recusar termo
                </button>
                <button type="button" className="primary-btn" onClick={() => respondToTerm(selectedTerm.id, "Aceito")}>
                  Aceitar termo
                </button>
              </div>
            )}
            <div className="wizard-actions">
              <button type="button" className="secondary-btn" onClick={() => setSelectedTermId(null)}>
                Fechar
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

export default MyDevicesScreen;
