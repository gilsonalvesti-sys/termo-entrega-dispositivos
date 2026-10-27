import { useMemo, useState } from "react";
import { demoDeliveryTerms, demoUsers } from "./usersData";
import "./UsersManagementScreen.css";

const categoryLabels = {
  device: "Dispositivos",
  line: "Linhas",
  sim: "SIM cards",
};

const categoryTitle = {
  device: "Dispositivos",
  line: "Linhas",
  sim: "SIM cards",
};

const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("pt-BR");
};

const getResourceSummary = (items = []) => {
  const counts = { device: 0, line: 0, sim: 0 };

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
  if (normalized.includes("cancel")) return "status-cancelled";
  return "status-default";
};

function UsersManagementScreen() {
  const [users] = useState(demoUsers);
  const [terms, setTerms] = useState(demoDeliveryTerms);
  const [searchTerm, setSearchTerm] = useState("");
  const [view, setView] = useState("list");
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [selectedTermId, setSelectedTermId] = useState(null);
  const [wizardStep, setWizardStep] = useState(1);
  const [wizardUserId, setWizardUserId] = useState(null);
  const [wizardCategory, setWizardCategory] = useState("device");
  const [wizardSearch, setWizardSearch] = useState({ device: "", line: "", sim: "" });
  const [wizardSelections, setWizardSelections] = useState({ device: [], line: [], sim: [] });
  const [deliveryDate, setDeliveryDate] = useState(new Date().toISOString().slice(0, 10));
  const [confirmationTermId, setConfirmationTermId] = useState(null);
  const [documentNotice, setDocumentNotice] = useState("");

  const selectedUser = users.find((user) => user.id === selectedUserId) || null;
  const currentUserTerms = useMemo(
    () =>
      terms
        .filter((term) => term.userId === selectedUserId)
        .sort((a, b) => new Date(b.deliveryDate || b.issueDate) - new Date(a.deliveryDate || a.issueDate)),
    [selectedUserId, terms]
  );

  const selectedTerm = terms.find((term) => term.id === selectedTermId) || null;

  const filteredUsers = users.filter((user) => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return true;
    return (
      user.name.toLowerCase().includes(query) ||
      user.email.toLowerCase().includes(query) ||
      (user.role || "").toLowerCase().includes(query)
    );
  });

  const getUserCounts = (user) => ({
    devices: user.devices.length,
    lines: user.lines.length,
    sims: user.sims.length,
    terms: terms.filter((term) => term.userId === user.id).length,
  });

  const getWizardOptions = (user) => ({
    device: (user?.devices || []).filter((device) => device.availableForDelivery),
    line: (user?.lines || []).filter((line) => line.availableForDelivery),
    sim: (user?.sims || []).filter((sim) => sim.availableForDelivery),
  });

  const wizardOptions = getWizardOptions(users.find((user) => user.id === wizardUserId) || selectedUser);
  const selectionCounts = {
    device: wizardSelections.device.length,
    line: wizardSelections.line.length,
    sim: wizardSelections.sim.length,
  };

  const totalSelectedItems = Object.values(selectionCounts).reduce((sum, count) => sum + count, 0);

  const openUserHistory = (userId) => {
    setSelectedUserId(userId);
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
    setWizardCategory("device");
    setWizardSearch({ device: "", line: "", sim: "" });
    setWizardSelections({ device: [], line: [], sim: [] });
    setDeliveryDate(new Date().toISOString().slice(0, 10));
    setView("wizard");
    setWizardStep(1);
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

  const removeWizardItem = (category, itemId) => {
    setWizardSelections((previous) => ({
      ...previous,
      [category]: (previous[category] || []).filter((id) => id !== itemId),
    }));
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
    if (!wizardUserId || totalSelectedItems === 0) return;

    const user = users.find((item) => item.id === wizardUserId);
    const selectedItems = getSelectedItems();
    const currentYear = new Date().getFullYear();
    const currentCounter = terms.filter((term) => String(term.id).startsWith(`TE-${currentYear}-`)).length + 1;
    const generatedId = `TE-${currentYear}-${String(currentCounter).padStart(3, "0")}`;
    const documentDate = new Date().toISOString().slice(0, 10);
    const generated = {
      id: generatedId,
      userId: user.id,
      recipientName: user.name,
      recipientEmail: user.email,
      company: user.company,
      deliveryDate: deliveryDate || documentDate,
      issueDate: documentDate,
      firstSendDate: null,
      lastSendDate: null,
      acceptedDate: null,
      termStatus: "Em aberto",
      sendStatus: "Pendente",
      document: {
        fileName: `${generatedId}.pdf`,
        generatedAt: documentDate,
        itemCount: selectedItems.length,
        available: false,
      },
      items: selectedItems.map((item) => ({
        category: item.category,
        identifier: item.id,
        label:
          item.category === "device"
            ? `${item.type} ${item.model}`
            : item.category === "line"
              ? item.number
              : item.iccid,
      })),
      events: [
        { date: documentDate, type: "created", description: "Termo criado para o destinatário." },
        {
          date: documentDate,
          type: "document",
          description: "Geração do documento não foi realizada no projeto atual; estrutura pronta para integração futura.",
        },
      ],
    };

    setTerms((previous) => [generated, ...previous]);
    setConfirmationTermId(generated.id);
    setSelectedTermId(generated.id);
    setView("confirmation");
  };

  const confirmCancelTerm = (termId) => {
    setTerms((previous) =>
      previous.map((term) => {
        if (term.id !== termId) return term;
        const now = new Date().toISOString().slice(0, 10);
        return {
          ...term,
          termStatus: "Cancelado",
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
    setTerms((previous) =>
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

  const handleDocumentAction = (action) => {
    if (!selectedTerm) return;

    if (action === "view") {
      setDocumentNotice(
        "Sem PDF real disponível nesta implementação. A estrutura está pronta para integração futura com geração/armazenamento do documento."
      );
      return;
    }

    if (action === "download") {
      const payload = [
        `Termo: ${selectedTerm.id}`,
        `Destinatário: ${selectedTerm.recipientName}`,
        `E-mail: ${selectedTerm.recipientEmail}`,
        `Itens: ${selectedTerm.items.length}`,
        `Data de geração: ${formatDate(selectedTerm.document?.generatedAt)}`,
      ].join("\n");

      const blob = new Blob([payload], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${selectedTerm.id}-documento.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setDocumentNotice("Download do documento demonstrativo realizado como arquivo de texto, sem simulação de PDF real.");
    }
  };

  const renderUserList = () => (
    <div className="users-screen">
      <div className="page-header">
        <div className="breadcrumb">Usuários</div>
        <h1>Usuários</h1>
      </div>

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
              <th>Cargo</th>
              <th>Dispositivos</th>
              <th>Linhas</th>
              <th>SIM cards</th>
              <th>Termos</th>
              <th>Ação</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((user) => {
              const counts = getUserCounts(user);
              return (
                <tr key={user.id}>
                  <td>{user.name}</td>
                  <td>{user.email}</td>
                  <td>{user.role || "—"}</td>
                  <td>{counts.devices}</td>
                  <td>{counts.lines}</td>
                  <td>{counts.sims}</td>
                  <td>{counts.terms}</td>
                  <td>
                    <button className="action-link" onClick={() => openUserHistory(user.id)}>
                      Consultar
                    </button>
                  </td>
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
    </div>
  );

  const renderUserHistory = () => {
    if (!selectedUser) return null;

    return (
      <div className="users-screen">
        <div className="page-header">
          <div className="breadcrumb">Usuários &gt; Histórico</div>
          <h1>{selectedUser.name}</h1>
        </div>

        <div className="user-summary card">
          <div className="summary-row">
            <div>
              <label>Nome</label>
              <strong>{selectedUser.name}</strong>
            </div>
            <div>
              <label>E-mail</label>
              <strong>{selectedUser.email}</strong>
            </div>
            <div>
              <label>Empresa</label>
              <strong>{selectedUser.company || "—"}</strong>
            </div>
          </div>

          <div className="summary-row compact">
            <div>
              <label>Dispositivos</label>
              <strong>{selectedUser.devices.length}</strong>
            </div>
            <div>
              <label>Linhas</label>
              <strong>{selectedUser.lines.length}</strong>
            </div>
            <div>
              <label>SIM cards</label>
              <strong>{selectedUser.sims.length}</strong>
            </div>
            <div>
              <label>Termos emitidos</label>
              <strong>{currentUserTerms.length}</strong>
            </div>
          </div>

          <div className="action-row">
            <button className="primary-btn" onClick={() => openNewDelivery(selectedUser.id)}>
              Nova entrega
            </button>
            <button className="secondary-btn" onClick={() => setView("list")}>
              Voltar
            </button>
          </div>
        </div>

        <div className="section-header">
          <h2>Histórico de termos</h2>
        </div>

        {currentUserTerms.length === 0 ? (
          <div className="empty-state card">
            <p>Nenhum termo registrado para este usuário.</p>
            <button className="primary-btn" onClick={() => openNewDelivery(selectedUser.id)}>
              Nova entrega
            </button>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Identificador</th>
                  <th>Data de entrega</th>
                  <th>Itens</th>
                  <th>Recursos</th>
                  <th>Aceite</th>
                  <th>Envio</th>
                  <th>Ação</th>
                </tr>
              </thead>
              <tbody>
                {currentUserTerms.map((term) => (
                  <tr key={term.id}>
                    <td>{term.id}</td>
                    <td>{formatDate(term.deliveryDate)}</td>
                    <td>{term.items.length}</td>
                    <td>{getResourceSummary(term.items)}</td>
                    <td>
                      <span className={`badge ${getBadgeClass(term.termStatus)}`}>{term.termStatus}</span>
                    </td>
                    <td>
                      <span className={`badge ${getBadgeClass(term.sendStatus)}`}>{term.sendStatus}</span>
                    </td>
                    <td>
                      <button className="action-link" onClick={() => openTermDetail(term.id)}>
                        Consultar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  const renderTermDetail = () => {
    if (!selectedTerm) return null;

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
              <strong>{selectedTerm.termStatus}</strong>
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
          {selectedTerm.termStatus !== "Cancelado" && selectedTerm.termStatus !== "Aceito" && (
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
    const currentItems = availableOptions[wizardCategory] || [];
    const filteredItems = currentItems.filter((item) => {
      const query = (wizardSearch[wizardCategory] || "").toLowerCase();
      if (!query) return true;
      if (wizardCategory === "device") {
        return `${item.type} ${item.model} ${item.id}`.toLowerCase().includes(query);
      }
      if (wizardCategory === "line") {
        return `${item.number} ${item.operator} ${item.id}`.toLowerCase().includes(query);
      }
      return `${item.iccid} ${item.operator} ${item.id}`.toLowerCase().includes(query);
    });

    return (
      <div className="users-screen">
        <div className="page-header">
          <div className="breadcrumb">Usuários &gt; Nova entrega</div>
          <h1>Novo Termo de Entrega</h1>
        </div>

        <div className="wizard-shell card">
          <div className="wizard-steps">
            <span className={wizardStep === 1 ? "step active" : "step"}>1. Selecionar itens</span>
            <span className={wizardStep === 2 ? "step active" : "step"}>2. Conferir entrega</span>
            <span className={wizardStep === 3 ? "step active" : "step"}>3. Confirmar</span>
          </div>

          {wizardStep === 1 && (
            <>
              <div className="selection-header">
                <h2>Destinatário</h2>
                <strong>{selectedUser.name} · {selectedUser.email}</strong>
              </div>

              <div className="category-tabs">
                {Object.keys(categoryLabels).map((category) => (
                  <button
                    key={category}
                    className={wizardCategory === category ? "tab active" : "tab"}
                    onClick={() => setWizardCategory(category)}
                  >
                    {categoryLabels[category]} ({selectionCounts[category]})
                  </button>
                ))}
              </div>

              <div className="search-box-row">
                <input
                  type="text"
                  value={wizardSearch[wizardCategory] || ""}
                  onChange={(event) =>
                    setWizardSearch((previous) => ({
                      ...previous,
                      [wizardCategory]: event.target.value,
                    }))
                  }
                  placeholder={`Buscar ${categoryLabels[wizardCategory].toLowerCase()}...`}
                />
              </div>

              <div className="selection-list">
                {filteredItems.length > 0 ? (
                  filteredItems.map((item) => {
                    const selected = (wizardSelections[wizardCategory] || []).includes(item.id);
                    return (
                      <label key={item.id} className={selected ? "select-item selected" : "select-item"}>
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => toggleWizardItem(wizardCategory, item.id)}
                        />
                        <div className="item-meta">
                          <strong>{item.id}</strong>
                          {wizardCategory === "device" && (
                            <span>
                              {item.type} · {item.model}
                            </span>
                          )}
                          {wizardCategory === "line" && (
                            <span>
                              {item.number} · {item.operator}
                            </span>
                          )}
                          {wizardCategory === "sim" && (
                            <span>
                              {item.iccid} · {item.operator}
                            </span>
                          )}
                        </div>
                      </label>
                    );
                  })
                ) : (
                  <p className="empty-inline">Nenhum item disponível para entrega nesta categoria.</p>
                )}
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
                    <span>SIM cards</span>
                    <strong>{selectionCounts.sim}</strong>
                  </div>
                  <div>
                    <span>Total</span>
                    <strong>{totalSelectedItems}</strong>
                  </div>
                </div>

                <div className="selected-tags">
                  {Object.keys(categoryLabels).map((category) =>
                    (wizardSelections[category] || []).map((itemId) => (
                      <button
                        key={`${category}-${itemId}`}
                        type="button"
                        className="tag-remove"
                        onClick={() => removeWizardItem(category, itemId)}
                      >
                        {itemId} ×
                      </button>
                    ))
                  )}
                </div>

                <div className="wizard-actions">
                  <button className="secondary-btn" onClick={() => setView("userHistory")}>
                    Cancelar
                  </button>
                  <button
                    className="primary-btn"
                    disabled={totalSelectedItems === 0}
                    onClick={() => setWizardStep(2)}
                  >
                    Avançar
                  </button>
                </div>
              </div>
            </>
          )}

          {wizardStep === 2 && (
            <>
              <div className="selection-header">
                <h2>Conferir entrega</h2>
              </div>

              <div className="review-grid">
                <div className="review-box">
                  <label>Destinatário</label>
                  <strong>{selectedUser.name}</strong>
                  <small>{selectedUser.email}</small>
                </div>
                <div className="review-box">
                  <label>Data da entrega</label>
                  <input type="date" value={deliveryDate} onChange={(event) => setDeliveryDate(event.target.value)} />
                </div>
              </div>

              <div className="review-items">
                {getSelectedItems().map((item, idx) => (
                  <div key={`${item.category}-${item.id}-${idx}`} className="review-item">
                    <span>{categoryLabels[item.category]}</span>
                    <strong>{item.id}</strong>
                    <small>
                      {item.category === "device" ? `${item.type} · ${item.model}` : item.category === "line" ? item.number : item.iccid}
                    </small>
                  </div>
                ))}
              </div>

              <div className="wizard-actions">
                <button className="secondary-btn" onClick={() => setWizardStep(1)}>
                  Voltar e editar
                </button>
                <button className="secondary-btn" onClick={() => setView("userHistory")}>
                  Cancelar
                </button>
                <button className="primary-btn" onClick={handleGenerateTerm}>
                  Gerar termo
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  };

  const renderConfirmation = () => {
    const term = terms.find((item) => item.id === confirmationTermId) || null;
    if (!term) return null;

    return (
      <div className="users-screen">
        <div className="page-header">
          <div className="breadcrumb">Usuários &gt; Confirmação</div>
          <h1>Confirmação</h1>
        </div>

        <div className="card confirmation-card">
          <h2>Termo criado com sucesso</h2>
          <div className="confirmation-line">
            <label>Identificador</label>
            <strong>{term.id}</strong>
          </div>
          <div className="confirmation-line">
            <label>Destinatário</label>
            <strong>{term.recipientName}</strong>
          </div>
          <div className="confirmation-line">
            <label>Quantidade de itens</label>
            <strong>{term.items.length}</strong>
          </div>
          <div className="confirmation-line">
            <label>Resumo dos recursos</label>
            <strong>{getResourceSummary(term.items)}</strong>
          </div>
          <div className="confirmation-line">
            <label>Situação do documento</label>
            <strong>Não gerado no projeto atual</strong>
          </div>
          <div className="confirmation-line">
            <label>Situação do envio</label>
            <strong>{term.sendStatus}</strong>
          </div>

          <div className="action-row">
            <button className="primary-btn" onClick={() => openTermDetail(term.id)}>
              Consultar termo
            </button>
            <button className="secondary-btn" onClick={() => setView("userHistory")}>
              Voltar à ficha do usuário
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (view === "userHistory") return renderUserHistory();
  if (view === "termDetail") return renderTermDetail();
  if (view === "wizard") return renderCreateWizard();
  if (view === "confirmation") return renderConfirmation();
  return renderUserList();
}

export default UsersManagementScreen;
