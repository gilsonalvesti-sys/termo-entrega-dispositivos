import { useMemo, useState } from "react";
import ShipmentManagement from "./ShipmentManagement";
import "./ManageDeviceTerm.css";

function ManageDeviceTerm({ terms, inventoryUsers, shipments, onAddShipments, onUpdateShipment, onOpenGerenciar }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showSendConfirmation, setShowSendConfirmation] = useState(false);
  const [selectedTermId, setSelectedTermId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [pendingShipments, setPendingShipments] = useState([]);
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

  const users = inventoryUsers;

  const filteredUsers = users.filter((user) => {
    const query = searchQuery.toLowerCase();
    return (
      user.name.toLowerCase().includes(query) ||
      user.email.toLowerCase().includes(query) ||
      user.imei.toLowerCase().includes(query) ||
      user.device.toLowerCase().includes(query)
    );
  });

  const handleUserToggle = (userId) => {
    setSelectedUsers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const downloadTemplate = () => {
    const csvContent = "Login,IMEI\n";
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

        const headers = rows[0]
          .split(/,|;/)
          .map((col) => col.trim().toLowerCase().replace(/^"|"$/g, ""));
        const loginIndex = headers.indexOf("login");
        const imeiIndex = headers.indexOf("imei");

        if (loginIndex === -1 || imeiIndex === -1) {
          reject("O arquivo precisa conter as colunas Login e IMEI.");
          return;
        }

        const entries = rows.slice(1).map((row) => {
          const cells = row
            .split(/,|;/)
            .map((cell) => cell.trim().replace(/^"|"$/g, ""));
          return {
            login: cells[loginIndex] || "",
            imei: cells[imeiIndex] || "",
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
      const matchedIds = entries.reduce((acc, entry) => {
        const email = entry.login.toLowerCase();
        const imei = entry.imei.toLowerCase();
        const user = users.find(
          (u) => u.email.toLowerCase() === email && u.imei.toLowerCase() === imei
        );
        if (user && !acc.includes(user.id)) {
          acc.push(user.id);
        }
        return acc;
      }, []);

      if (matchedIds.length > 0) {
        setSelectedUsers((prev) => Array.from(new Set([...prev, ...matchedIds])));
        setUploadMessage(`${matchedIds.length} usuário(s) marcados com sucesso.`);
        setShowUploadModal(false);
      } else {
        setUploadMessage("Nenhum usuário encontrado com a combinação Login + IMEI informada.");
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
    if (selectedUsers.length === 0) {
      setUploadError("Selecione pelo menos um usuário para enviar.");
      return;
    }

    const selectedTerm = activeTerms.find((term) => term.id === Number(selectedTermId));
    const shipments = selectedUsers.map((userId) => {
      const user = users.find((u) => u.id === userId);
      return {
        id: `${userId}-${Date.now()}`,
        imei: user?.imei || "",
        deviceModel: user?.device || "",
        deviceType: "Dispositivo",
        userName: user?.name || "",
        userLogin: user?.login || user?.email || "",
        term: selectedTerm?.name || "",
        sendDate: new Date().toISOString(),
        status: "Pendente",
        statusDate: "",
        returnDate: "",
        receivedBy: "",
      };
    });

    setPendingShipments(shipments);
    setShowSendConfirmation(true);
    setUploadError("");
  };

  const confirmSend = () => {
    onAddShipments(pendingShipments);
    setShowSendConfirmation(false);
    setShowConfirmation(true);
    setIsModalOpen(false);
    setSelectedTermId("");
    setSearchQuery("");
    setSelectedUsers([]);
    setPendingShipments([]);
    setUploadedFileName("");
    setUploadFile(null);
    setUploadMessage("");
    setShowUploadModal(false);
  };

  const cancelSend = () => {
    setShowSendConfirmation(false);
  };

  return (
    <div className="manage-device-term-container">
      <div className="mdt-header">
        <div className="mdt-line1">Inventário &gt; Dispositivo</div>
        <div className="mdt-line2">
          <button type="button" className="manage-link" onClick={onOpenGerenciar}>
            Gerenciar
          </button>
          <span className="pipe">|</span> <strong>Termo de Responsabilidade</strong>
        </div>
      </div>

      <div className="mdt-body">
        <p>Área para gerenciar o Termo de Responsabilidade. Implemente aqui as ações necessárias.</p>
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
                      <th>Nome usuário</th>
                      <th>e-mail</th>
                      <th>IMEI</th>
                      <th>nome dispositivo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((user) => (
                      <tr key={user.id}>
                        <td>
                          <input
                            type="checkbox"
                            checked={selectedUsers.includes(user.id)}
                            onChange={() => handleUserToggle(user.id)}
                          />
                        </td>
                        <td>{user.name}</td>
                        <td>{user.email}</td>
                        <td>{user.imei}</td>
                        <td>{user.device}</td>
                      </tr>
                    ))}
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
