import { useMemo, useState } from "react";
import { demoUsers } from "./usersData";
import ManageDeviceTerm from "./ManageDeviceTerm";
import "./UsersManagementScreen.css";

const categoryLabels = {
  device: "Dispositivos",
  line: "Linhas",
};

const categoryTitle = {
  device: "Dispositivos",
  line: "Linhas",
};

const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("pt-BR");
};

const normalizeTermStatus = (status) => {
  if (status === "Aceito" || status === "Cancelado" || status === "Recusado") return status;
  return "Pendente";
};

const getTermStatusDate = (term) => {
  if (term.statusDate) return term.statusDate;
  const status = normalizeTermStatus(term.termStatus);
  if (status === "Aceito") return term.acceptedDate;
  if (status === "Cancelado") {
    return [...(term.events || [])].reverse().find((event) => event.type === "cancelled")?.date;
  }
  return null;
};

const getResourceSummary = (items = []) => {
  const counts = { device: 0, line: 0 };

  items.forEach((item) => {
    if (counts[item.category] !== undefined) {
      counts[item.category] += 1;
    }
  });

  return Object.entries(counts)
    .filter(([, count]) => count > 0)
    .map(([category, count]) => `${count} ${categoryLabels[category]}`)
    .join(", ") || "Nenhum item";
};

const getBadgeClass = (value) => {
  const normalized = (value || "").toLowerCase();
  if (normalized.includes("aceito") || normalized.includes("enviado")) return "status-success";
  if (normalized.includes("pendente") || normalized.includes("em aberto")) return "status-pending";
  if (normalized.includes("cancel") || normalized.includes("recus")) return "status-cancelled";
  return "status-default";
};

function UsersManagementScreen({
  availableTerms = [],
  deliveryTerms,
  setDeliveryTerms,
  inventoryUsers = [],
  shipments = [],
  onAddShipments,
  onUpdateShipment,
}) {
  const [users] = useState(demoUsers);
  const [searchTerm, setSearchTerm] = useState("");
  const [view, setView] = useState("list");
  const [activeManagementTab, setActiveManagementTab] = useState("manage");
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [activeUserTab, setActiveUserTab] = useState("userData");
  const [selectedTermId, setSelectedTermId] = useState(null);
  const [wizardUserId, setWizardUserId] = useState(null);
  const [wizardSelections, setWizardSelections] = useState({ device: [], line: [] });
  const [showTermReview, setShowTermReview] = useState(false);
  const [deliveryDate, setDeliveryDate] = useState(new Date().toISOString().slice(0, 10));
  const [selectedTemplateTermId, setSelectedTemplateTermId] = useState("");
  const [operationMessage, setOperationMessage] = useState("");
  const [documentNotice, setDocumentNotice] = useState("");

  const selectedUser = users.find((user) => user.id === selectedUserId) || null;
  const currentUserTerms = useMemo(
    () =>
      deliveryTerms
        .filter((term) => term.userId === selectedUserId)
        .sort((a, b) => new Date(b.deliveryDate || b.issueDate) - new Date(a.deliveryDate || a.issueDate)),
    [selectedUserId, deliveryTerms]
  );

  const selectedTerm = deliveryTerms.find((term) => term.id === selectedTermId) || null;
  const activeAvailableTerms = availableTerms.filter((term) => term.status === "Ativo");
  const selectedTemplateTerm = activeAvailableTerms.find(
    (term) => String(term.id) === String(selectedTemplateTermId)
  ) || null;

  const filteredUsers = users.filter((user) => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return true;
    return (
      user.name.toLowerCase().includes(query) ||
      user.email.toLowerCase().includes(query) ||
      (user.role || "").toLowerCase().includes(query)
    );
  });

  const getWizardOptions = (user) => ({
    device: (user?.devices || []).filter((device) => device.availableForDelivery),
    line: (user?.lines || []).filter((line) => line.availableForDelivery),
  });

  const wizardOptions = getWizardOptions(users.find((user) => user.id === wizardUserId) || selectedUser);
  const selectionCounts = {
    device: wizardSelections.device.length,
    line: wizardSelections.line.length,
  };

  const totalSelectedItems = Object.values(selectionCounts).reduce((sum, count) => sum + count, 0);

  const openUserHistory = (userId) => {
    setSelectedUserId(userId);
    setActiveUserTab("userData");
    setOperationMessage("");
    setView("userHistory");
  };

  const openTermDetail = (termId) => {
    setSelectedTermId(termId);
    setView("termDetail");
  };

  const openNewDelivery = (userId = selectedUserId) => {
    const user = users.find((item) => item.id === userId);
    setSelectedUserId(userId);
    setWizardUserId(userId);
    setWizardSelections({ device: [], line: [] });
    setShowTermReview(false);
    setDeliveryDate(new Date().toISOString().slice(0, 10));
    setSelectedTemplateTermId("");
    setOperationMessage("");
    setView("wizard");
    if (!user) return;
  };

  const toggleWizardItem = (category, itemId) => {
    setWizardSelections((previous) => {
      const selected = previous[category] || [];
      const next = selected.includes(itemId)
        ? selected.filter((id) => id !== itemId)
        : [...selected, itemId];

      return { ...previous, [category]: next };
    });
  };

  const getSelectedItems = () => {
    const user = users.find((item) => item.id === wizardUserId || item.id === selectedUserId);
    const options = getWizardOptions(user);
    return Object.keys(options).flatMap((category) =>
      (options[category] || [])
        .filter((item) => (wizardSelections[category] || []).includes(item.id))
        .map((item) => ({ ...item, category }))
    );
  };

  const handleGenerateTerm = () => {
    if (!wizardUserId || totalSelectedItems === 0 || !selectedTemplateTerm || !deliveryDate) return;
    setShowTermReview(true);
  };

  const handleConfirmTermSend = () => {
    const user = users.find((item) => item.id === wizardUserId);
    if (!user || !selectedTemplateTerm || totalSelectedItems === 0 || !deliveryDate) return;
    const selectedItems = getSelectedItems();
    const currentYear = new Date().getFullYear();
    const currentCounter = deliveryTerms.filter((term) => String(term.id).startsWith(`TE-${currentYear}-`)).length + 1;
    const generatedId = `TE-${currentYear}-${String(currentCounter).padStart(3, "0")}`;
    const sentAt = new Date();
    const documentDate = sentAt.toISOString().slice(0, 10);
    const generated = {
      id: generatedId,
      userId: user.id,
      recipientName: user.name,
      recipientEmail: user.email,
      company: user.company,
      templateTermId: selectedTemplateTerm.id,
      templateTermName: selectedTemplateTerm.name,
      templateTermVersion: selectedTemplateTerm.version,
      templateTermText: selectedTemplateTerm.text || "",
      deliveryDate,
      issueDate: documentDate,
      firstSendDate: documentDate,
      lastSendDate: documentDate,
      acceptedDate: null,
      termStatus: "Pendente",
      sendStatus: "Enviado",
      document: {
        fileName: null,
        generatedAt: null,
        itemCount: selectedItems.length,
        available: false,
      },
      items: selectedItems.map((item) => ({
        category: item.category,
        identifier: item.id,
        label:
          item.category === "device"
            ? `${item.type} ${item.model}`
            : item.number,
      })),
      events: [
        { date: documentDate, type: "created", description: "Termo criado para o destinatário." },
        { date: documentDate, type: "sent", description: "Termo enviado ao usuário." },
      ],
    };

    setDeliveryTerms((previous) => [generated, ...previous]);
    onAddShipments(
      selectedItems.map((item) => ({
        imei: item.category === "device" ? item.imei || item.id : item.number,
        deviceModel: item.category === "device" ? item.model || item.label : item.number,
        deviceType: item.category === "device" ? item.type || "Dispositivo" : "Linha",
        userName: user.name,
        userLogin: user.login || user.email,
        term: `${selectedTemplateTerm.name} (v${selectedTemplateTerm.version})`,
        sendDate: sentAt.toISOString(),
        status: "Pendente",
        statusDate: "",
        returnDate: "",
        receivedBy: "",
      }))
    );
    setOperationMessage(`Termo ${generated.id} gerado e enviado ao usuário.`);
    setShowTermReview(false);
    setActiveUserTab("terms");
    setView("userHistory");
    window.alert("Termo gerado e enviado ao usuário");
  };

  const confirmCancelTerm = (termId) => {
    setDeliveryTerms((previous) =>
      previous.map((term) => {
        if (term.id !== termId) return term;
        const now = new Date().toISOString().slice(0, 10);
        return {
          ...term,
          termStatus: "Cancelado",
          statusDate: now,
          sendStatus: "Cancelado",
          document: { ...term.document, available: false },
          events: [
            ...(term.events || []),
            { date: now, type: "cancelled", description: "Cancelamento registrado com suporte do fluxo local." },
          ],
        };
      })
    );
  };

  const resendTerm = (termId) => {
    setDeliveryTerms((previous) =>
      previous.map((term) => {
        if (term.id !== termId) return term;
        const now = new Date().toISOString().slice(0, 10);
        return {
          ...term,
          sendStatus: "Reenviado",
          lastSendDate: now,
          events: [
            ...(term.events || []),
            { date: now, type: "resent", description: "Reenvio registrado no fluxo local de demonstração." },
          ],
        };
      })
    );
  };

  const handleDocumentAction = (action, term = selectedTerm) => {
    if (!term) return;

    if (action === "view") {
      setDocumentNotice(
        "Sem PDF real disponível nesta implementação. A estrutura está pronta para integração futura com geração/armazenamento do documento."
      );
      return;
    }

    if (action === "download") {
      const payload = [
        `Termo: ${term.id}`,
        `Destinatário: ${term.recipientName}`,
        `E-mail: ${term.recipientEmail}`,
        `Itens: ${term.items.length}`,
        `Data de geração: ${formatDate(term.document?.generatedAt)}`,
      ].join("\n");

      const blob = new Blob([payload], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${term.id}-documento.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      if (term.id === selectedTerm?.id) {
        setDocumentNotice("Download do documento demonstrativo realizado como arquivo de texto, sem simulação de PDF real.");
      }
    }
  };

  const renderUserList = () => (
    <div className="users-screen">
      <div className="page-header">
        <div className="breadcrumb">Usuários</div>
        <h1>Usuários</h1>
      </div>

      <div className="category-tabs users-management-tabs" role="tablist" aria-label="Seções de usuários">
        <button
          type="button"
          role="tab"
          aria-selected={activeManagementTab === "manage"}
          className={activeManagementTab === "manage" ? "tab active" : "tab"}
          onClick={() => setActiveManagementTab("manage")}
        >
          Gerenciar
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeManagementTab === "delivery"}
          className={activeManagementTab === "delivery" ? "tab active" : "tab"}
          onClick={() => setActiveManagementTab("delivery")}
        >
          Termo de Entrega
        </button>
      </div>

      {activeManagementTab === "manage" ? (
      <>
      <div className="toolbar">
        <input
          type="text"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder="Buscar por nome ou e-mail"
          className="search-input"
        />
      </div>

      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>E-mail</th>
              <th>Termos</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((user) => {
              const termCount = deliveryTerms.filter((term) => term.userId === user.id).length;
              return (
                <tr key={user.id}>
                  <td>
                    <button className="action-link" onClick={() => openUserHistory(user.id)}>
                      {user.name}
                    </button>
                  </td>
                  <td>{user.email}</td>
                  <td>{termCount}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filteredUsers.length === 0 && (
          <div className="empty-state card">
            <p>Nenhum usuário encontrado para a busca informada.</p>
          </div>
        )}
      </div>
      </>
      ) : (
        <ManageDeviceTerm
          terms={availableTerms}
          inventoryUsers={inventoryUsers}
          shipments={shipments}
          onAddShipments={onAddShipments}
          onUpdateShipment={onUpdateShipment}
          deliveryManagementOnly
        />
      )}
    </div>
  );

  const renderUserHistory = () => {
    if (!selectedUser) return null;

    return (
      <div className="users-screen">
        <div className="page-header">
          <div className="breadcrumb">Usuários &gt; Histórico</div>
          <h1>Histórico</h1>
        </div>

        <div className="history-overview">
          <section className="card history-user-card">
            <div><strong>{selectedUser.name}</strong></div>
            <div><strong>{selectedUser.email}</strong></div>
            <div><strong>{selectedUser.login || selectedUser.email}</strong></div>
          </section>
          <section className="card history-counts-card" aria-label="Totais do usuário">
            <div><label>Dispositivos</label><strong>{selectedUser.devices.length}</strong></div>
            <div><label>Linhas</label><strong>{selectedUser.lines.length}</strong></div>
            <div><label>Termos emitidos</label><strong>{currentUserTerms.length}</strong></div>
          </section>
        </div>

        <div className="history-actions">
          <div className="action-row">
            <button className="primary-btn" onClick={() => openNewDelivery(selectedUser.id)}>
              Nova entrega
            </button>
            <button className="secondary-btn" onClick={() => setView("list")}>
              Voltar
            </button>
          </div>
        </div>

        <div className="category-tabs history-tabs" role="tablist" aria-label="Histórico do usuário">
          <button
            type="button"
            role="tab"
            aria-selected={activeUserTab === "userData"}
            className={activeUserTab === "userData" ? "tab active" : "tab"}
            onClick={() => setActiveUserTab("userData")}
          >
            Dados do Usuário
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeUserTab === "resources"}
            className={activeUserTab === "resources" ? "tab active" : "tab"}
            onClick={() => setActiveUserTab("resources")}
          >
            Recursos vinculados
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeUserTab === "terms"}
            className={activeUserTab === "terms" ? "tab active" : "tab"}
            onClick={() => setActiveUserTab("terms")}
          >
            Termos
          </button>
        </div>

        {activeUserTab === "userData" && (
          <section className="card detail-card" role="tabpanel">
            <h2>Dados do Usuário</h2>
            <div className="detail-grid user-data-grid">
              <div><label>Nome</label><strong>{selectedUser.name}</strong></div>
              <div><label>E-mail</label><strong>{selectedUser.email}</strong></div>
              <div><label>Matrícula</label><strong>{selectedUser.employeeId || "—"}</strong></div>
              <div><label>Gestor</label><strong>{selectedUser.manager || "—"}</strong></div>
              <div><label>Status</label><strong>{selectedUser.status || "—"}</strong></div>
              <div><label>Empresa</label><strong>{selectedUser.company || "—"}</strong></div>
              <div><label>Cargo</label><strong>{selectedUser.role || "—"}</strong></div>
              <div><label>Grupo de usuários</label><strong>{selectedUser.userGroup || "—"}</strong></div>
              <div className="user-data-address"><label>Endereço</label><strong>{selectedUser.address || "—"}</strong></div>
            </div>
          </section>
        )}

        {activeUserTab === "resources" && (
          <div className="linked-resources" role="tabpanel">
            <section className="card detail-card">
              <h2>Linhas</h2>
              {selectedUser.lines.length === 0 ? (
                <p className="empty-inline">Nenhuma linha vinculada a este usuário.</p>
              ) : (
                <div className="table-wrapper">
                  <table className="data-table">
                    <thead><tr><th>Número</th><th>Ramal</th><th>Operadora</th></tr></thead>
                    <tbody>
                      {selectedUser.lines.map((line) => (
                        <tr key={line.id}>
                          <td>{line.number}</td><td>{line.extension || line.ramal || "—"}</td>
                          <td>{line.operator || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
            <section className="card detail-card">
              <h2>Dispositivos</h2>
              {selectedUser.devices.length === 0 ? (
                <p className="empty-inline">Nenhum dispositivo vinculado a este usuário.</p>
              ) : (
                <div className="table-wrapper">
                  <table className="data-table">
                    <thead><tr><th>IMEI/ID</th><th>Tipo</th><th>Modelo</th><th>Fabricante</th><th>Status</th></tr></thead>
                    <tbody>
                      {selectedUser.devices.map((device) => (
                        <tr key={device.id}>
                          <td>{device.imei || device.id || "—"}</td><td>{device.type}</td><td>{device.model}</td>
                          <td>{device.manufacturer || device.model?.split(" ")[0] || "—"}</td>
                          <td>{device.status || "Vinculado"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        )}

        {activeUserTab === "terms" && (
          <>
            <div className="section-header"><h2>Histórico de termos</h2></div>
            {operationMessage && <p className="operation-message">{operationMessage}</p>}
            {currentUserTerms.length === 0 ? (
              <div className="empty-state card"><p>Nenhum termo registrado para este usuário.</p></div>
            ) : (
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Termo</th><th>Data de entrega</th><th>Data de envio</th><th>Itens</th>
                      <th>Recursos</th><th>Status</th><th>Data Status</th><th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentUserTerms.map((term) => (
                      <tr key={term.id}>
                        <td>
                          {term.templateTermName
                            ? `${term.templateTermName}${term.templateTermVersion ? ` (v${term.templateTermVersion})` : ""}`
                            : "Termo de Entrega"}
                        </td>
                        <td>{formatDate(term.deliveryDate)}</td>
                        <td>{formatDate(term.firstSendDate || term.lastSendDate)}</td>
                        <td>{term.items.filter((item) => item.category !== "sim").length}</td>
                        <td>{getResourceSummary(term.items)}</td>
                        <td>
                          {(() => {
                            const status = normalizeTermStatus(term.termStatus);
                            return <span className={`badge ${getBadgeClass(status)}`}>{status}</span>;
                          })()}
                        </td>
                        <td>{formatDate(getTermStatusDate(term))}</td>
                        <td>
                          <div className="term-row-actions">
                            <button
                              type="button"
                              className="icon-action"
                              aria-label={`Consultar termo ${term.id}`}
                              title="Consultar"
                              onClick={() => openTermDetail(term.id)}
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
                              disabled={!term.document?.available}
                              onClick={() => handleDocumentAction("download", term)}
                            >
                              <svg viewBox="0 0 24 24" aria-hidden="true">
                                <path d="M12 3v12m0 0 5-5m-5 5-5-5M4 20h16" />
                              </svg>
                            </button>
                            <button
                              type="button"
                              className="icon-action icon-action-danger"
                              aria-label={`Cancelar termo ${term.id}`}
                              title="Cancelar"
                              disabled={["Cancelado", "Aceito", "Recusado"].includes(normalizeTermStatus(term.termStatus))}
                              onClick={() => confirmCancelTerm(term.id)}
                            >
                              <svg viewBox="0 0 24 24" aria-hidden="true">
                                <path d="m6 6 12 12M18 6 6 18" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  const renderTermDetail = () => {
    if (!selectedTerm) return null;
    const selectedTermStatus = normalizeTermStatus(selectedTerm.termStatus);

    return (
      <div className="users-screen">
        <div className="page-header">
          <div className="breadcrumb">Usuários &gt; Termo</div>
          <h1>{selectedTerm.id}</h1>
        </div>

        <div className="card detail-card">
          <div className="detail-grid">
            <div>
              <label>Nome</label>
              <strong>{selectedTerm.recipientName}</strong>
            </div>
            <div>
              <label>E-mail</label>
              <strong>{selectedTerm.recipientEmail}</strong>
            </div>
            <div>
              <label>Termo selecionado</label>
              <strong>
                {selectedTerm.templateTermName
                  ? `${selectedTerm.templateTermName} (v${selectedTerm.templateTermVersion})`
                  : "—"}
              </strong>
            </div>
            <div>
              <label>Empresa</label>
              <strong>{selectedTerm.company || "—"}</strong>
            </div>
          </div>

          <div className="detail-grid">
            <div>
              <label>Data da entrega</label>
              <strong>{formatDate(selectedTerm.deliveryDate)}</strong>
            </div>
            <div>
              <label>Data de emissão</label>
              <strong>{formatDate(selectedTerm.issueDate)}</strong>
            </div>
            <div>
              <label>Primeiro envio</label>
              <strong>{formatDate(selectedTerm.firstSendDate)}</strong>
            </div>
            <div>
              <label>Último envio</label>
              <strong>{formatDate(selectedTerm.lastSendDate)}</strong>
            </div>
            <div>
              <label>Data do aceite</label>
              <strong>{formatDate(selectedTerm.acceptedDate)}</strong>
            </div>
            <div>
              <label>Situação do termo</label>
              <strong>{selectedTermStatus}</strong>
            </div>
            <div>
              <label>Situação do envio</label>
              <strong>{selectedTerm.sendStatus}</strong>
            </div>
          </div>
        </div>

        <div className="card detail-card">
          <h2>Itens do termo</h2>
          <div className="item-list">
            {selectedTerm.items.map((item, idx) => (
              <div key={`${item.category}-${item.identifier}-${idx}`} className="item-row">
                <div>
                  <strong>{categoryTitle[item.category] || item.category}</strong>
                </div>
                <div>{item.identifier}</div>
                <div>{item.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="card detail-card">
          <h2>Documento</h2>
          <div className="document-row">
            <div>
              <label>Nome / identificador</label>
              <strong>{selectedTerm.document?.fileName || "Sem documento"}</strong>
            </div>
            <div>
              <label>Data de geração</label>
              <strong>{formatDate(selectedTerm.document?.generatedAt)}</strong>
            </div>
            <div>
              <label>Quantidade de itens</label>
              <strong>{selectedTerm.document?.itemCount || selectedTerm.items.length}</strong>
            </div>
          </div>

          <div className="action-row">
            <button
              className="secondary-btn"
              onClick={() => handleDocumentAction("view")}
              disabled={!selectedTerm.document?.available}
            >
              Visualizar
            </button>
            <button
              className="secondary-btn"
              onClick={() => handleDocumentAction("download")}
              disabled={!selectedTerm.document?.available}
            >
              Baixar
            </button>
          </div>

          {documentNotice && <p className="document-notice">{documentNotice}</p>}
        </div>

        <div className="card detail-card">
          <h2>Histórico de eventos</h2>
          <div className="timeline">
            {(selectedTerm.events || []).map((event, idx) => (
              <div key={`${event.type}-${idx}`} className="timeline-item">
                <div className="timeline-dot" />
                <div className="timeline-content">
                  <strong>{formatDate(event.date)}</strong>
                  <p>{event.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="action-row large-gap">
          <button className="secondary-btn" onClick={() => setView("userHistory")}>
            Voltar ao histórico
          </button>
          {(selectedTerm.sendStatus === "Pendente" || selectedTerm.sendStatus === "Enviado") && (
            <button className="primary-btn" onClick={() => resendTerm(selectedTerm.id)}>
              Reenviar
            </button>
          )}
          {selectedTermStatus === "Pendente" && (
            <button className="danger-btn" onClick={() => confirmCancelTerm(selectedTerm.id)}>
              Cancelar
            </button>
          )}
        </div>
      </div>
    );
  };

  const renderCreateWizard = () => {
    if (!selectedUser) return null;

    const availableOptions = wizardOptions;
    const selectableItems = Object.entries(availableOptions).flatMap(([category, items]) =>
      items.map((item) => ({ category, item }))
    );
    const selectedItems = getSelectedItems();
    const allItemsSelected =
      selectableItems.length > 0 &&
      selectableItems.every(({ category, item }) => wizardSelections[category].includes(item.id));
    const toggleSelectAll = () => {
      setWizardSelections(
        allItemsSelected
          ? { device: [], line: [] }
          : {
              device: availableOptions.device.map((item) => item.id),
              line: availableOptions.line.map((item) => item.id),
            }
      );
    };

    return (
      <div className="users-screen">
        <div className="page-header">
          <div className="breadcrumb">Usuários &gt; Nova entrega</div>
          <h1>Novo Termo de Entrega</h1>
        </div>

        <div className="wizard-shell card">
          <div className="wizard-term-header">
            <div className="wizard-field">
              <label htmlFor="delivery-template-term">Termo</label>
              <select
                id="delivery-template-term"
                value={selectedTemplateTermId}
                onChange={(event) => setSelectedTemplateTermId(event.target.value)}
              >
                <option value="">Selecione um termo</option>
                {activeAvailableTerms.map((term) => (
                  <option key={term.id} value={term.id}>
                    {term.name} (v{term.version})
                  </option>
                ))}
              </select>
              {activeAvailableTerms.length === 0 && (
                <small>Nenhum termo ativo foi cadastrado em Empresas.</small>
              )}
            </div>
            <div className="wizard-field">
              <label htmlFor="delivery-date">Data de Entrega</label>
              <input
                id="delivery-date"
                type="date"
                value={deliveryDate}
                onChange={(event) => setDeliveryDate(event.target.value)}
              />
            </div>
          </div>

          <div className="selection-header">
            <h2>Destinatário</h2>
            <strong>{selectedUser.name} · {selectedUser.email}</strong>
          </div>

          <label className="select-all-option">
            <input
              type="checkbox"
              checked={allItemsSelected}
              disabled={selectableItems.length === 0}
              onChange={toggleSelectAll}
            />
            <span>Selecionar todos os itens vinculados</span>
          </label>

          <div className="wizard-resource-sections">
            <section className="card detail-card">
              <h2>Linhas</h2>
              {availableOptions.line.length === 0 ? (
                <p className="empty-inline">Nenhuma linha vinculada e disponível para entrega.</p>
              ) : (
                <div className="table-wrapper">
                  <table className="data-table wizard-resource-table">
                    <thead>
                      <tr><th>Selecionar</th><th>Número</th><th>Ramal</th><th>Operadora</th></tr>
                    </thead>
                    <tbody>
                      {availableOptions.line.map((line) => (
                        <tr key={line.id}>
                          <td>
                            <input
                              type="checkbox"
                              aria-label={`Selecionar linha ${line.number}`}
                              checked={wizardSelections.line.includes(line.id)}
                              onChange={() => toggleWizardItem("line", line.id)}
                            />
                          </td>
                          <td>{line.number}</td><td>{line.extension || line.ramal || "—"}</td>
                          <td>{line.operator || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section className="card detail-card">
              <h2>Dispositivos</h2>
              {availableOptions.device.length === 0 ? (
                <p className="empty-inline">Nenhum dispositivo vinculado e disponível para entrega.</p>
              ) : (
                <div className="table-wrapper">
                  <table className="data-table wizard-resource-table">
                    <thead>
                      <tr>
                        <th>Selecionar</th><th>IMEI/ID</th><th>Tipo</th><th>Modelo</th><th>Fabricante</th>
                      </tr>
                    </thead>
                    <tbody>
                      {availableOptions.device.map((device) => (
                        <tr key={device.id}>
                          <td>
                            <input
                              type="checkbox"
                              aria-label={`Selecionar dispositivo ${device.imei || device.id}`}
                              checked={wizardSelections.device.includes(device.id)}
                              onChange={() => toggleWizardItem("device", device.id)}
                            />
                          </td>
                          <td>{device.imei || device.id}</td><td>{device.type}</td><td>{device.model}</td>
                          <td>{device.manufacturer || device.model?.split(" ")[0] || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>

          <div className="summary-panel">
            <h3>Resumo da seleção</h3>
            <div className="summary-grid">
              <div>
                <span>Dispositivos</span>
                <strong>{selectionCounts.device}</strong>
              </div>
              <div>
                <span>Linhas</span>
                <strong>{selectionCounts.line}</strong>
              </div>
              <div>
                <span>Total</span>
                <strong>{totalSelectedItems}</strong>
              </div>
            </div>

            {totalSelectedItems === 0 && (
              <p className="empty-inline">Selecione pelo menos um item para continuar.</p>
            )}

            <div className="wizard-actions">
              <button className="secondary-btn" onClick={() => setView("userHistory")}>
                Cancelar
              </button>
              <button
                className="primary-btn"
                disabled={totalSelectedItems === 0 || !selectedTemplateTerm || !deliveryDate}
                onClick={handleGenerateTerm}
              >
                Gerar Termo
              </button>
            </div>
          </div>
        </div>

        {showTermReview && (
          <div className="term-review-backdrop">
            <section
              className="term-review-modal card"
              role="dialog"
              aria-modal="true"
              aria-labelledby="term-review-title"
            >
              <h2 id="term-review-title">Confirmar geração do termo</h2>
              <div className="term-review-summary">
                <div><label>Usuário</label><strong>{selectedUser.name}</strong></div>
                <div><label>E-mail</label><strong>{selectedUser.email}</strong></div>
                <div><label>Termo</label><strong>{selectedTemplateTerm?.name} (v{selectedTemplateTerm?.version})</strong></div>
                <div><label>Data de entrega</label><strong>{formatDate(deliveryDate)}</strong></div>
              </div>
              <h3>Itens selecionados ({selectedItems.length})</h3>
              {selectedItems.length ? (
                <div className="table-wrapper">
                  <table className="data-table term-review-table">
                    <thead>
                      <tr><th>Tipo</th><th>Identificador</th><th>Ramal</th><th>Modelo</th><th>Operadora</th></tr>
                    </thead>
                    <tbody>
                      {selectedItems.map((item) => (
                        <tr key={`${item.category}-${item.id}`}>
                          <td>{categoryLabels[item.category]}</td>
                          <td>{item.category === "device" ? item.imei || item.id : item.number}</td>
                          <td>{item.category === "line" ? item.extension || item.ramal || "—" : "—"}</td>
                          <td>{item.category === "device" ? item.model || "—" : "—"}</td>
                          <td>{item.category === "line" ? item.operator || "—" : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="empty-inline">Nenhum item selecionado.</p>
              )}
              <div className="wizard-actions">
                <button className="secondary-btn" onClick={() => setShowTermReview(false)}>
                  Voltar
                </button>
                <button className="primary-btn" onClick={handleConfirmTermSend}>
                  Enviar
                </button>
              </div>
            </section>
          </div>
        )}
      </div>
    );
  };

  if (view === "userHistory") return renderUserHistory();
  if (view === "termDetail") return renderTermDetail();
  if (view === "wizard") return renderCreateWizard();
  return renderUserList();
}

export default UsersManagementScreen;
