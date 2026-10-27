import { useMemo, useState } from "react";
import "./ShipmentManagement.css";

const getShipmentResources = (shipment) =>
  shipment.resources?.length
    ? shipment.resources
    : [{
        type: shipment.deviceType || "",
        identifier: shipment.imei || "",
        ramal: "",
        model: shipment.deviceModel || "",
      }];

function ShipmentManagement({ shipments, inventoryUsers, onUpdateShipment }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [actionType, setActionType] = useState(null);
  const [activeShipment, setActiveShipment] = useState(null);
  const [statusDate, setStatusDate] = useState("");
  const [returnDate, setReturnDate] = useState("");
  const [receivedById, setReceivedById] = useState("");
  const [actionError, setActionError] = useState("");

  const filteredShipments = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return shipments;
    return shipments.filter((shipment) =>
      [
        shipment.userName,
        shipment.userLogin,
        shipment.term,
        shipment.status,
        shipment.receivedBy,
        ...getShipmentResources(shipment).flatMap((resource) => [
          resource.type,
          resource.identifier,
          resource.ramal,
          resource.model,
        ]),
      ]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(query))
    );
  }, [searchQuery, shipments]);

  const openActionModal = (shipment, type) => {
    setActionError("");
    setActiveShipment(shipment);
    setActionType(type);
    setStatusDate(shipment.statusDate || "");
    setReturnDate(shipment.returnDate || "");
    setReceivedById(
      inventoryUsers.find((user) => user.name === shipment.receivedBy)?.id || ""
    );
  };

  const closeActionModal = () => {
    setActionType(null);
    setActiveShipment(null);
    setStatusDate("");
    setReturnDate("");
    setReceivedById("");
    setActionError("");
  };

  const handleCancelShipment = () => {
    if (!statusDate) {
      setActionError("Informe a data do status para cancelar o envio.");
      return;
    }
    onUpdateShipment({
      ...activeShipment,
      status: "Cancelado",
      statusDate,
    });
    closeActionModal();
  };

  const handleReturnShipment = () => {
    if (!returnDate || !receivedById) {
      setActionError("Preencha Data Devolução e Recebido Por.");
      return;
    }
    const user = inventoryUsers.find((item) => item.id.toString() === receivedById.toString());
    onUpdateShipment({
      ...activeShipment,
      returnDate,
      receivedBy: user ? `${user.name} (${user.login})` : "",
    });
    closeActionModal();
  };

  const handleReenviar = (shipment) => {
    onUpdateShipment({
      ...shipment,
      status: "Pendente",
      statusDate: "",
      returnDate: "",
      receivedBy: "",
      sendDate: new Date().toISOString(),
    });
  };

  const formatDate = (value) => {
    if (!value) return "";
    const date = new Date(value);
    return date.toLocaleDateString("pt-BR") + " " + date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="shipment-management-container">
      <div className="shipment-header">
        <div>
          <div className="breadcrumb">Gestão de Envios</div>
          <h1>Registros de Envios</h1>
        </div>
        <div className="shipment-search">
          <input
            type="text"
            placeholder="Buscar IMEI, modelo, tipo, usuário, termo ou status"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="shipment-grid-container">
        <table className="shipment-grid">
          <thead>
            <tr>
              <th>Nome Usuário</th>
              <th>Login</th>
              <th>Tipo</th>
              <th>Identificador</th>
              <th>Ramal</th>
              <th>Modelo</th>
              <th>Termo</th>
              <th>Data Envio</th>
              <th>Status</th>
              <th>Data Status</th>
              <th>Data Devolução</th>
              <th>Recebido por</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {filteredShipments.length === 0 ? (
              <tr>
                <td colSpan="13" className="no-data">
                  Nenhum envio registrado.
                </td>
              </tr>
            ) : (
              filteredShipments.map((shipment) => (
                <tr key={shipment.id}>
                  <td>{shipment.userName}</td>
                  <td>{shipment.userLogin || "—"}</td>
                  <td>
                    <div className="shipment-resource-values">
                      {getShipmentResources(shipment).map((resource, index) => (
                        <span key={`${resource.identifier}-${index}`}>{resource.type || "—"}</span>
                      ))}
                    </div>
                  </td>
                  <td>
                    <div className="shipment-resource-values">
                      {getShipmentResources(shipment).map((resource, index) => (
                        <span key={`${resource.identifier}-${index}`}>{resource.identifier || "—"}</span>
                      ))}
                    </div>
                  </td>
                  <td>
                    <div className="shipment-resource-values">
                      {getShipmentResources(shipment).map((resource, index) => (
                        <span key={`${resource.identifier}-${index}`}>{resource.ramal || "—"}</span>
                      ))}
                    </div>
                  </td>
                  <td>
                    <div className="shipment-resource-values">
                      {getShipmentResources(shipment).map((resource, index) => (
                        <span key={`${resource.identifier}-${index}`}>{resource.model || "—"}</span>
                      ))}
                    </div>
                  </td>
                  <td>{shipment.term}</td>
                  <td>{formatDate(shipment.sendDate)}</td>
                  <td>{shipment.status}</td>
                  <td>{formatDate(shipment.statusDate)}</td>
                  <td>{formatDate(shipment.returnDate)}</td>
                  <td>{shipment.receivedBy}</td>
                  <td className="action-buttons-cell">
                    <button
                      className="shipment-action-btn"
                      onClick={() => handleReenviar(shipment)}
                    >
                      Reenviar
                    </button>
                    <button
                      className="shipment-action-btn"
                      disabled={shipment.status !== "Pendente"}
                      onClick={() => openActionModal(shipment, "cancel")}
                    >
                      Cancelar
                    </button>
                    <button
                      className="shipment-action-btn"
                      onClick={() => openActionModal(shipment, "return")}
                    >
                      Devolução
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {actionType && activeShipment && (
        <div className="modal-overlay" onClick={closeActionModal}>
          <div className="shipment-action-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>
                {actionType === "cancel" ? "Cancelar Envio" : "Registrar Devolução"}
              </h2>
              <button className="modal-close-btn" onClick={closeActionModal}>
                ✕
              </button>
            </div>
            <div className="modal-body">
              {actionType === "cancel" ? (
                <>
                  <label>Data Status</label>
                  <input
                    type="date"
                    value={statusDate}
                    onChange={(e) => setStatusDate(e.target.value)}
                  />
                </>
              ) : (
                <>
                  <label>Data Devolução</label>
                  <input
                    type="date"
                    value={returnDate}
                    onChange={(e) => setReturnDate(e.target.value)}
                  />
                  <label>Recebido Por</label>
                  <select
                    value={receivedById}
                    onChange={(e) => setReceivedById(e.target.value)}
                  >
                    <option value="">Selecione um usuário</option>
                    {inventoryUsers.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name} ({user.login})
                      </option>
                    ))}
                  </select>
                </>
              )}
              {actionError && <div className="action-error">{actionError}</div>}
            </div>
            <div className="modal-footer">
              <button className="btn-cancel" onClick={closeActionModal}>
                Cancelar
              </button>
              <button
                className="btn-send"
                onClick={actionType === "cancel" ? handleCancelShipment : handleReturnShipment}
              >
                {actionType === "cancel" ? "Confirmar Cancelamento" : "Salvar Devolução"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ShipmentManagement;
