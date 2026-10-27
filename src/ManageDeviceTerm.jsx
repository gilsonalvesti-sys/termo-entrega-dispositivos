import { useMemo, useState } from "react";
import ShipmentManagement from "./ShipmentManagement";
import InventoryDevicesTable from "./ManageInventoryScreen";
import "./ManageDeviceTerm.css";

const sampleLines = [
  { id: 1, operator: "Vivo", line: "(11) 99912-3401", userName: "João Silva" },
  { id: 2, operator: "Claro", line: "(11) 99876-1202", userName: "Maria Souza" },
  { id: 3, operator: "TIM", line: "(21) 99765-4303", userName: "Carlos Lima" },
  { id: 4, operator: "Vivo", line: "(31) 99654-7804", userName: "Ana Pereira" },
  { id: 5, operator: "Claro", line: "(41) 99543-2105", userName: "" },
  { id: 6, operator: "TIM", line: "(51) 99432-6506", userName: "Paulo Santos" },
];

const parseDelimitedRow = (row, delimiter) => {
  const cells = [];
  let value = "";
  let quoted = false;

  for (let index = 0; index < row.length; index += 1) {
    const character = row[index];
    if (character === '"' && row[index + 1] === '"') {
      value += '"';
      index += 1;
    } else if (character === '"') {
      quoted = !quoted;
    } else if (character === delimiter && !quoted) {
      cells.push(value.trim());
      value = "";
    } else {
      value += character;
    }
  }

  cells.push(value.trim());
  return cells;
};

function ManageDeviceTerm({
  terms,
  inventoryUsers,
  shipments,
  onAddShipments,
  onUpdateShipment,
  deliveryUsers = inventoryUsers,
  onAddDeliveryTerms,
  deliveryManagementOnly = false,
}) {
  const [activeTab, setActiveTab] = useState(deliveryManagementOnly ? "termo" : "dispositivo");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showSendConfirmation, setShowSendConfirmation] = useState(false);
  const [selectedTermId, setSelectedTermId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedResources, setSelectedResources] = useState([]);
  const [pendingShipments, setPendingShipments] = useState([]);
  const [pendingDeliveryResources, setPendingDeliveryResources] = useState([]);
  const [uploadedFileName, setUploadedFileName] = useState("");
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadError, setUploadError] = useState("");
  const [uploadMessage, setUploadMessage] = useState("");
  const [importFile, setImportFile] = useState(null);
  const [importFileName, setImportFileName] = useState("");
  const [importError, setImportError] = useState("");
  const [importMessage, setImportMessage] = useState("");
  const [importHistory, setImportHistory] = useState([]);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const currentImportUser = inventoryUsers[0]?.login || "sistema";

  const activeTerms = useMemo(
    () => terms.filter((term) => term.status === "Ativo"),
    [terms]
  );

  const users = deliveryUsers;

  const filteredUsers = users.filter((user) => {
    const query = searchQuery.trim().toLowerCase();
    return (
      (user.name || "").toLowerCase().includes(query) ||
      (user.email || "").toLowerCase().includes(query) ||
      (user.login || "").toLowerCase().includes(query) ||
      (user.imei || "").toLowerCase().includes(query) ||
      (user.device || "").toLowerCase().includes(query) ||
      (user.devices || []).some((device) =>
        [device.id, device.imei, device.model, device.type]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(query))
      ) ||
      (user.lines || []).some((line) =>
        [line.number, line.extension, line.ramal, line.operator]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(query))
      )
    );
  });

  const filteredResources = filteredUsers.flatMap((user) => [
    ...(user.devices || [])
      .filter((device) => device.availableForDelivery)
      .map((device) => ({ user, resource: device, category: "device" })),
    ...(user.lines || [])
      .filter((line) => line.availableForDelivery)
      .map((line) => ({ user, resource: line, category: "line" })),
  ]);

  const getResourceKey = (userId, category, resourceId) =>
    `${userId}:${category}:${resourceId}`;

  const handleResourceToggle = (resourceKey) => {
    setSelectedResources((previous) =>
      previous.includes(resourceKey)
        ? previous.filter((key) => key !== resourceKey)
        : [...previous, resourceKey]
    );
  };

  const downloadTemplate = () => {
    const csvContent = "Login,IMEI/ID,Linha,Ramal\n";
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "modelo_upload.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      setUploadFile(file);
      setUploadedFileName(file.name);
      setUploadError("");
      setUploadMessage("");
    }
  };

  const parseCsv = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target.result;
        const rows = text
          .split(/\r\n|\n/)
          .map((row) => row.trim())
          .filter((row) => row.length > 0);

        if (rows.length === 0) {
          reject("Arquivo vazio.");
          return;
        }

        const delimiter = rows[0].includes(";") ? ";" : ",";
        const headers = parseDelimitedRow(rows[0], delimiter)
          .map((col) => col.replace(/^\uFEFF/, "").toLowerCase());
        const loginIndex = headers.indexOf("login");
        const imeiIdIndex = headers.indexOf("imei/id") !== -1
          ? headers.indexOf("imei/id")
          : headers.indexOf("imei");
        const lineIndex = headers.indexOf("linha");
        const extensionIndex = headers.indexOf("ramal");

        if (loginIndex === -1 || imeiIdIndex === -1 || lineIndex === -1 || extensionIndex === -1) {
          reject("O arquivo precisa conter as colunas Login, IMEI/ID, Linha e Ramal.");
          return;
        }

        const entries = rows.slice(1).map((row) => {
          const cells = parseDelimitedRow(row, delimiter);
          return {
            login: cells[loginIndex] || "",
            imeiId: cells[imeiIdIndex] || "",
            line: cells[lineIndex] || "",
            extension: cells[extensionIndex] || "",
          };
        });

        resolve(entries);
      };
      reader.onerror = () => reject("Erro ao ler o arquivo.");
      reader.readAsText(file, "UTF-8");
    });
  };

  const handleUploadConfirm = async () => {
    if (!uploadFile) {
      setUploadError("Selecione um arquivo antes de carregar.");
      return;
    }

    try {
      const entries = await parseCsv(uploadFile);
      const matchedResourceKeys = entries.flatMap((entry) => {
        const login = entry.login.trim().toLowerCase();
        const user = users.find(
          (item) => (item.login || item.email || "").toLowerCase() === login
        );
        if (!user) return [];

        const requestedImeiId = entry.imeiId.trim().toLowerCase();
        const requestedLine = entry.line.trim().toLowerCase();
        const requestedExtension = entry.extension.trim().toLowerCase();
        const resourceKeys = [];

        if (requestedImeiId) {
          (user.devices || []).filter((device) => device.availableForDelivery).forEach((device) => {
            if ([device.imei, device.id].filter(Boolean).some((value) => String(value).toLowerCase() === requestedImeiId)) {
              resourceKeys.push(getResourceKey(user.id, "device", device.id));
            }
          });
        }

        if (requestedLine || requestedExtension) {
          (user.lines || []).filter((line) => line.availableForDelivery).forEach((line) => {
            const lineMatches = !requestedLine || (line.number || "").toLowerCase() === requestedLine;
            const extensionMatches = !requestedExtension ||
              [(line.extension || ""), (line.ramal || "")]
                    .some((value) => String(value).toLowerCase() === requestedExtension);
            if (lineMatches && extensionMatches) {
              resourceKeys.push(getResourceKey(user.id, "line", line.id));
            }
          });
        }
        return resourceKeys;
      });

      if (matchedResourceKeys.length > 0) {
        const uniqueResourceKeys = Array.from(new Set(matchedResourceKeys));
        setSelectedResources((previous) => Array.from(new Set([...previous, ...uniqueResourceKeys])));
        setUploadMessage(`${uniqueResourceKeys.length} recurso(s) marcados com sucesso.`);
        setShowUploadModal(false);
      } else {
        setUploadMessage("Nenhum recurso correspondente foi encontrado para o Login e os identificadores informados.");
      }
      setUploadError("");
    } catch (error) {
      setUploadError(typeof error === "string" ? error : "Erro ao processar o arquivo.");
      setUploadMessage("");
    }
  };

  const formatDateForExport = (value) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toISOString().slice(0, 10);
  };

  const quoteCsvValue = (value) => `"${String(value || "").replace(/"/g, '""')}"`;

  const downloadExportCsv = () => {
    const headers = [
      "Login Usuário",
      "IMEI",
      "Termo",
      "Data Envio",
      "Status",
      "Data Status",
      "Data Devolução",
      "Recebido Por",
    ];
    const rows = shipments.map((shipment) => [
      shipment.userLogin || "",
      shipment.imei,
      shipment.term,
      formatDateForExport(shipment.sendDate),
      shipment.status,
      formatDateForExport(shipment.statusDate),
      formatDateForExport(shipment.returnDate),
      shipment.receivedBy,
    ]);
    const csvContent = [headers, ...rows]
      .map((row) => row.map(quoteCsvValue).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "gestao_envios_export.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const parseImportCsv = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target.result;
        const rows = text
          .split(/\r\n|\n/)
          .map((row) => row.trim())
          .filter((row) => row.length > 0);

        if (rows.length === 0) {
          reject("Arquivo vazio.");
          return;
        }

        const headers = rows[0]
          .split(/,|;/)
          .map((col) => col.trim().toLowerCase().replace(/^"|"$/g, ""));

        const findIndex = (name) => {
          const keys = [name, name.replace(/ã/g, "a").replace(/ç/g, "c")];
          return keys.reduce((index, key) => {
            if (index !== -1) return index;
            return headers.indexOf(key);
          }, -1);
        };

        const loginIndex = findIndex("login usuário");
        const imeiIndex = findIndex("imei");
        const termoIndex = findIndex("termo");
        const envioIndex = findIndex("data envio");
        const statusIndex = findIndex("status");
        const statusDateIndex = findIndex("data status");
        const returnDateIndex = findIndex("data devolução");
        const returnDateIndexAlt = statusDateIndex;
        const recebidosIndex = findIndex("recebido por");

        if (loginIndex === -1 || imeiIndex === -1 || termoIndex === -1 || envioIndex === -1) {
          reject("O arquivo precisa conter as colunas Login Usuário, IMEI, Termo e Data Envio.");
          return;
        }

        const entries = rows.slice(1).map((row) => {
          const cells = row
            .split(/,|;/)
            .map((cell) => cell.trim().replace(/^"|"$/g, ""));
          return {
            login: (cells[loginIndex] || "").trim(),
            imei: (cells[imeiIndex] || "").trim(),
            termo: (cells[termoIndex] || "").trim(),
            dataEnvio: (cells[envioIndex] || "").trim(),
            status: statusIndex !== -1 ? (cells[statusIndex] || "").trim() : "",
            dataStatus: statusDateIndex !== -1 ? (cells[statusDateIndex] || "").trim() : "",
            dataDevolucao: returnDateIndex !== -1 ? (cells[returnDateIndex] || "").trim() : "",
            recebidoPor: recebidosIndex !== -1 ? (cells[recebidosIndex] || "").trim() : "",
          };
        });

        resolve(entries);
      };
      reader.onerror = () => reject("Erro ao ler o arquivo.");
      reader.readAsText(file, "UTF-8");
    });
  };

  const normalizeImportDate = (value) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toISOString().slice(0, 10);
  };

  const findMatchingShipment = (row) => {
    const normalizedSendDate = normalizeImportDate(row.dataEnvio);
    return shipments.find((shipment) => {
      const shipmentDate = normalizeImportDate(shipment.sendDate);
      return (
        (shipment.userLogin || "").toLowerCase() === row.login.toLowerCase() &&
        (shipment.imei || "").toLowerCase() === row.imei.toLowerCase() &&
        (shipment.term || "").toLowerCase() === row.termo.toLowerCase() &&
        shipmentDate === normalizedSendDate
      );
    });
  };

  const processImportFile = async () => {
    if (!importFile) {
      setImportError("Selecione um arquivo antes de processar.");
      return;
    }

    try {
      const rows = await parseImportCsv(importFile);
      let matchedCount = 0;
      let errorCount = 0;
      const updatedShipments = [];

      rows.forEach((row) => {
        const shipment = findMatchingShipment(row);
        if (shipment) {
          matchedCount += 1;
          const updated = {
            ...shipment,
            status: row.status || shipment.status,
            statusDate: row.dataStatus || shipment.statusDate,
            returnDate: row.dataDevolucao || shipment.returnDate,
            receivedBy: row.recebidoPor || shipment.receivedBy,
          };
          updatedShipments.push(updated);
        } else {
          errorCount += 1;
        }
      });

      if (updatedShipments.length > 0) {
        updatedShipments.forEach(onUpdateShipment);
      }

      const finalStatus =
        errorCount === 0 && updatedShipments.length > 0
          ? "Sucesso"
          : updatedShipments.length > 0
          ? "Parcial"
          : "Erro";

      setImportHistory((prev) => [
        {
          fileName: importFileName,
          status: finalStatus,
          user: currentImportUser,
          date: new Date().toLocaleString("pt-BR"),
          out: importFileName,
        },
        ...prev,
      ]);

      setImportMessage(
        finalStatus === "Sucesso"
          ? "Importação concluída com sucesso."
          : finalStatus === "Parcial"
          ? "Importação concluída parcialmente. Alguns registros não foram localizados."
          : "Importação falhou. Nenhum registro correspondente foi encontrado."
      );
      setImportError("");
    } catch (error) {
      setImportError(typeof error === "string" ? error : "Erro ao processar o arquivo.");
      setImportMessage("");
    }
  };

  const handleImportFile = (event) => {
    const file = event.target.files[0];
    if (file) {
      setImportFile(file);
      setImportFileName(file.name);
      setImportError("");
      setImportMessage("");
    }
  };

  const handleSend = () => {
    if (!selectedTermId) {
      setUploadError("Selecione um termo antes de enviar.");
      return;
    }
    const selectedEntries = users.flatMap((user) => [
      ...(user.devices || [])
        .filter((device) => selectedResources.includes(getResourceKey(user.id, "device", device.id)))
        .map((device) => ({ user, resource: device, category: "device" })),
      ...(user.lines || [])
        .filter((line) => selectedResources.includes(getResourceKey(user.id, "line", line.id)))
        .map((line) => ({ user, resource: line, category: "line" })),
    ]);
    if (selectedEntries.length === 0) {
      setUploadError("Selecione pelo menos um recurso para enviar.");
      return;
    }

    const selectedTerm = activeTerms.find((term) => term.id === Number(selectedTermId));
    const sentAt = new Date().toISOString();
    const selectedByUser = selectedEntries.reduce((grouped, entry) => {
      if (!grouped.has(entry.user.id)) {
        grouped.set(entry.user.id, { user: entry.user, resources: [] });
      }
      grouped.get(entry.user.id).resources.push(entry);
      return grouped;
    }, new Map());
    const pendingDeliveryResources = Array.from(selectedByUser.values());
    const shipments = selectedEntries.map(({ user, resource, category }, index) => {
      const ramal = category === "line" ? resource.extension || resource.ramal || "" : "";
      const shipmentResource = {
        type: category === "device" ? "Dispositivo" : ramal ? "Ramal" : "Linha",
        identifier: category === "device"
          ? resource.imei || resource.id
          : resource.number || resource.id,
        ramal,
        model: category === "device" ? resource.model || "" : "",
      };
      return {
        id: `${user.id}-${Date.now()}-${index}`,
        resources: [shipmentResource],
        imei: shipmentResource.identifier,
        deviceModel: shipmentResource.model,
        deviceType: shipmentResource.type,
        userName: user.name || "",
        userLogin: user.login || user.email || "",
        term: selectedTerm?.name || "",
        sendDate: sentAt,
        status: "Pendente",
        statusDate: "",
        returnDate: "",
        receivedBy: "",
      };
    });

    setPendingShipments(shipments);
    setPendingDeliveryResources(pendingDeliveryResources);
    setShowSendConfirmation(true);
    setUploadError("");
  };

  const confirmSend = () => {
    onAddShipments(pendingShipments);
    if (onAddDeliveryTerms) {
      const selectedTerm = activeTerms.find((term) => term.id === Number(selectedTermId));
      const deliveryDate = new Date().toISOString().slice(0, 10);
      const generatedTerms = pendingDeliveryResources.map(({ user, resources }, index) => {
        const items = resources.map(({ resource, category }) => ({
          category,
          identifier: category === "device"
            ? resource.imei || resource.id
            : resource.number || resource.id,
          label: category === "device"
            ? `${resource.type || "Dispositivo"} ${resource.model || ""}`.trim()
            : resource.number,
        }));
        const generatedId = `TE-${new Date().getFullYear()}-${Date.now()}-${index}`;
        return {
          id: generatedId,
          userId: user.id,
          recipientName: user.name,
          recipientEmail: user.email,
          company: user.company || "",
          templateTermId: selectedTerm?.id,
          templateTermName: selectedTerm?.name || "",
          templateTermVersion: selectedTerm?.version || "",
          templateTermText: selectedTerm?.text || "",
          deliveryDate,
          issueDate: deliveryDate,
          firstSendDate: deliveryDate,
          lastSendDate: deliveryDate,
          acceptedDate: null,
          termStatus: "Pendente",
          sendStatus: "Enviado",
          document: {
            fileName: null,
            generatedAt: null,
            itemCount: items.length,
            available: false,
          },
          items,
          events: [
            { date: deliveryDate, type: "created", description: "Termo criado para o destinatário." },
            { date: deliveryDate, type: "sent", description: "Termo enviado ao usuário." },
          ],
        };
      });
      if (generatedTerms.length) onAddDeliveryTerms((previous) => [...generatedTerms, ...previous]);
    }
    setShowSendConfirmation(false);
    setShowConfirmation(true);
    setIsModalOpen(false);
    setSelectedTermId("");
    setSearchQuery("");
    setSelectedResources([]);
    setPendingShipments([]);
    setPendingDeliveryResources([]);
    setUploadedFileName("");
    setUploadFile(null);
    setUploadMessage("");
    setShowUploadModal(false);
  };

  const cancelSend = () => {
    setShowSendConfirmation(false);
  };

  return (
    <div className={`manage-device-term-container${deliveryManagementOnly ? " delivery-management-only" : ""}`}>
      {!deliveryManagementOnly && (
        <div className="mdt-header">
          <div className="mdt-line1">Inventário</div>
        </div>
      )}

      {!deliveryManagementOnly && (
        <div className="inventory-tabs" role="tablist" aria-label="Seções do inventário">
          {[
            ["dispositivo", "Dispositivo"],
            ["linhas", "Linhas"],
          ].map(([tab, label]) => (
          <button
            key={tab}
            id={`inventory-tab-${tab}`}
            type="button"
            role="tab"
            aria-selected={activeTab === tab}
            aria-controls={`inventory-panel-${tab}`}
            className={`inventory-tab ${activeTab === tab ? "active" : ""}`}
            onClick={() => setActiveTab(tab)}
          >
            {label}
          </button>
          ))}
        </div>
      )}

      {activeTab === "dispositivo" && (
        <section
          id="inventory-panel-dispositivo"
          className="mdt-body"
          role="tabpanel"
          aria-labelledby="inventory-tab-dispositivo"
        >
          <h2>Dispositivo</h2>
          <InventoryDevicesTable />
        </section>
      )}

      {activeTab === "linhas" && (
        <section
          id="inventory-panel-linhas"
          className="mdt-body"
          role="tabpanel"
          aria-labelledby="inventory-tab-linhas"
        >
          <h2>Linhas</h2>
          <div className="manage-inventory-table-wrap">
            <table className="manage-inventory-table">
              <thead>
                <tr>
                  <th>Operadora</th>
                  <th>Linha</th>
                  <th>Usuário</th>
                </tr>
              </thead>
              <tbody>
                {sampleLines.map((line) => (
                  <tr key={line.id}>
                    <td>{line.operator}</td>
                    <td>{line.line}</td>
                    <td>{line.userName || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {(deliveryManagementOnly || activeTab === "termo") && (
        <div
          id="inventory-panel-termo"
          role="tabpanel"
          aria-labelledby="inventory-tab-termo"
        >
          <div className="inventory-panel-heading">
            <h2>Termo de Entrega</h2>
          </div>
          <div className="envios-section">
            <div className="envios-header">
              <h3>Envios</h3>
              <button className="envios-action-btn" onClick={() => setIsModalOpen(true)}>
                + Enviar Termo
              </button>
            </div>
          </div>

          <div className="gestao-envios-section">
            <div className="gestao-envios-header">
              <h3>Gestão de Envios</h3>
              <div className="gestao-envios-actions">
                <button className="import-table-btn" onClick={() => setShowImportModal(true)}>
                  IMPORTAR TABELA
                </button>
                <button className="export-table-btn" onClick={downloadExportCsv}>
                  EXPORTAR TABELA
                </button>
              </div>
            </div>
            <ShipmentManagement
              shipments={shipments}
              inventoryUsers={inventoryUsers}
              onUpdateShipment={onUpdateShipment}
            />
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Escolher usuários</h2>
              <button className="modal-close-btn" onClick={() => setIsModalOpen(false)}>
                ✕
              </button>
            </div>

            <div className="modal-body">
              <div className="modal-row">
                <div className="form-group modal-term-group">
                  <label>Termo a ser enviado</label>
                  <select
                    value={selectedTermId}
                    onChange={(e) => setSelectedTermId(e.target.value)}
                  >
                    <option value="">Selecione um termo ativo</option>
                    {activeTerms.map((term) => (
                      <option key={term.id} value={term.id}>
                        {term.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="modal-row modal-actions-row">
                <button
                  type="button"
                  className="upload-button"
                  onClick={() => {
                    setShowUploadModal(true);
                    setUploadError("");
                    setUploadMessage("");
                  }}
                >
                  Upload
                </button>
                <div className="upload-file-name">{uploadedFileName || "Nenhum arquivo selecionado"}</div>
                <div className="search-input-group">
                  <input
                    type="text"
                    placeholder="Buscar por nome, e-mail, IMEI ou dispositivo"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              {uploadError && <div className="upload-error">{uploadError}</div>}

              <div className="users-grid-container">
                <table className="users-grid">
                  <thead>
                    <tr>
                      <th />
                      <th>Nome Usuário</th>
                      <th>Login</th>
                      <th>Tipo</th>
                      <th>Identificador</th>
                      <th>Ramal</th>
                      <th>Modelo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredResources.map(({ user, resource, category }) => {
                      const resourceKey = getResourceKey(user.id, category, resource.id);
                      return (
                        <tr key={resourceKey}>
                          <td>
                            <input
                              type="checkbox"
                              aria-label={`Selecionar ${category === "device" ? "dispositivo" : "linha"} para ${user.name}`}
                              checked={selectedResources.includes(resourceKey)}
                              onChange={() => handleResourceToggle(resourceKey)}
                            />
                          </td>
                          <td>{user.name}</td>
                          <td>{user.login || user.email || "—"}</td>
                          <td>
                            {category === "device"
                              ? "Dispositivo"
                              : resource.extension || resource.ramal
                                ? "Ramal"
                                : "Linha"}
                          </td>
                          <td>{category === "device" ? resource.imei || resource.id : resource.number || "—"}</td>
                          <td>{category === "line" ? resource.extension || resource.ramal || "—" : "—"}</td>
                          <td>{category === "device" ? resource.model || "—" : "—"}</td>
                        </tr>
                      );
                    })}
                    {filteredResources.length === 0 && (
                      <tr><td colSpan="7" className="no-data">Nenhum recurso disponível para envio.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="modal-footer">
              <button type="button" className="btn-cancel" onClick={() => setIsModalOpen(false)}>
                Cancelar
              </button>
              <button type="button" className="btn-send" onClick={handleSend}>
                Enviar
              </button>
            </div>
          </div>
        </div>
      )}

      {showUploadModal && (
        <div className="modal-overlay" onClick={() => setShowUploadModal(false)}>
          <div className="upload-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Upload</h2>
              <button className="modal-close-btn" onClick={() => setShowUploadModal(false)}>
                ✕
              </button>
            </div>
            <div className="modal-body">
              <div className="upload-modal-row">
                <button type="button" className="download-template-btn" onClick={downloadTemplate}>
                  Clique aqui para baixar o modelo
                </button>
              </div>
              <div className="upload-modal-row">
                <label className="upload-button">
                  Escolher Arquivo
                  <input type="file" accept=".csv" onChange={handleUpload} />
                </label>
                <div className="upload-file-name">{uploadedFileName || "Nenhum arquivo selecionado"}</div>
              </div>
              {uploadError && <div className="upload-error">{uploadError}</div>}
              {uploadMessage && <div className="upload-message">{uploadMessage}</div>}
            </div>
            <div className="modal-footer">
              <button type="button" className="btn-cancel" onClick={() => setShowUploadModal(false)}>
                Cancelar
              </button>
              <button type="button" className="btn-send" onClick={handleUploadConfirm}>
                Carregar
              </button>
            </div>
          </div>
        </div>
      )}

      {showImportModal && (
        <div className="modal-overlay" onClick={() => setShowImportModal(false)}>
          <div className="upload-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Edição de Termos</h2>
              <button className="modal-close-btn" onClick={() => setShowImportModal(false)}>
                ✕
              </button>
            </div>
            <div className="modal-body">
              <div className="upload-modal-row">
                <button type="button" className="download-template-btn" onClick={downloadExportCsv}>
                  DOWNLOAD
                </button>
              </div>
              <div className="upload-modal-row">
                <label className="upload-button">
                  Escolher Arquivo
                  <input type="file" accept=".csv" onChange={handleImportFile} />
                </label>
                <div className="upload-file-name">{importFileName || "Nenhum arquivo selecionado"}</div>
              </div>
              {importError && <div className="upload-error">{importError}</div>}
              {importMessage && <div className="upload-message">{importMessage}</div>}
              <div className="import-history-section">
                <h4>Histórico de arquivos processados</h4>
                <div className="import-history-table">
                  <table>
                    <thead>
                      <tr>
                        <th>Arquivo</th>
                        <th>Status</th>
                        <th>Usuário</th>
                        <th>Data</th>
                        <th>Out</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importHistory.length === 0 ? (
                        <tr>
                          <td colSpan="5" className="no-data">
                            Nenhum arquivo processado.
                          </td>
                        </tr>
                      ) : (
                        importHistory.map((item, index) => (
                          <tr key={`${item.fileName}-${index}`}>
                            <td>{item.fileName}</td>
                            <td>{item.status}</td>
                            <td>{item.user}</td>
                            <td>{item.date}</td>
                            <td>{item.out}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn-cancel" onClick={() => setShowImportModal(false)}>
                Cancelar
              </button>
              <button type="button" className="btn-send" onClick={processImportFile}>
                Processar
              </button>
            </div>
          </div>
        </div>
      )}

      {showSendConfirmation && (
        <div className="modal-overlay" onClick={cancelSend}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Confirmar envio</h2>
              <button className="modal-close-btn" onClick={cancelSend}>
                ✕
              </button>
            </div>
            <div className="modal-body">
              <p>Deseja confirmar o envio para os usuários selecionados? Os dados serão registrados em Gestão de Envios.</p>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn-cancel" onClick={cancelSend}>
                Cancelar
              </button>
              <button type="button" className="btn-send" onClick={confirmSend}>
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {showConfirmation && (
        <div className="confirmation-overlay" onClick={() => setShowConfirmation(false)}>
          <div className="confirmation-popup" onClick={(e) => e.stopPropagation()}>
            <p>O termo selecionado foi enviado aos usuários e podem ser acompanhados em ‘Gestão de Envios’.</p>
            <button className="btn-confirm" onClick={() => setShowConfirmation(false)}>
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default ManageDeviceTerm;
