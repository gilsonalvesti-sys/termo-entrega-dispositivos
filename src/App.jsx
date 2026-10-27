import { useState } from "react";
import DeliveryTermsScreen from "./DeliveryTermsScreen";
import ManageDeviceTerm from "./ManageDeviceTerm";
import UsersManagementScreen from "./UsersManagementScreen";
import "./Sidebar.css";

const initialTerms = [
  {
    id: 1,
    name: "Termo Padrão v1.0",
    version: "1.0",
    addedDate: "2024-01-15",
    status: "Ativo",
  },
  {
    id: 2,
    name: "Termo Atualizado",
    version: "2.1",
    addedDate: "2024-02-20",
    status: "Ativo",
  },
  {
    id: 3,
    name: "Termo Antigo",
    version: "1.5",
    addedDate: "2024-01-10",
    status: "Inativo",
  },
  {
    id: 4,
    name: "Termo de Revisão",
    version: "3.0",
    addedDate: "2024-03-05",
    status: "Ativo",
  },
];

const initialInventoryUsers = [
  {
    id: 1,
    login: "joao@empresa.com",
    name: "João Silva",
    email: "joao@empresa.com",
    imei: "358762043920347",
    device: "Roteador 01",
    deviceModel: "RTX-1000",
    deviceType: "Roteador",
  },
  {
    id: 2,
    login: "maria@empresa.com",
    name: "Maria Souza",
    email: "maria@empresa.com",
    imei: "358762043920348",
    device: "Roteador 02",
    deviceModel: "RTX-2000",
    deviceType: "Roteador",
  },
  {
    id: 3,
    login: "carlos@empresa.com",
    name: "Carlos Lima",
    email: "carlos@empresa.com",
    imei: "358762043920349",
    device: "Roteador 03",
    deviceModel: "RTX-3000",
    deviceType: "Roteador",
  },
  {
    id: 4,
    login: "ana@empresa.com",
    name: "Ana Pereira",
    email: "ana@empresa.com",
    imei: "358762043920350",
    device: "Roteador 04",
    deviceModel: "RTX-4000",
    deviceType: "Roteador",
  },
];

function App() {
  const [screen, setScreen] = useState("termo");
  const [terms, setTerms] = useState(initialTerms);
  const [shipments, setShipments] = useState([]);
  const [inventoryUsers] = useState(initialInventoryUsers);

  const addShipments = (newShipments) => {
    setShipments((prev) => [
      ...newShipments.map((shipment, index) => ({
        id: `${Date.now()}-${index}`,
        ...shipment,
      })),
      ...prev,
    ]);
  };

  const updateShipment = (updatedShipment) => {
    setShipments((prev) =>
      prev.map((shipment) =>
        shipment.id === updatedShipment.id ? updatedShipment : shipment
      )
    );
  };

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-buttons">
          <button
            className={`sidebar-btn ${screen === "termo" ? "active" : ""}`}
            onClick={() => setScreen("termo")}
          >
            Empresas
          </button>

          <button
            className={`sidebar-btn ${screen === "inventario" ? "active" : ""}`}
            onClick={() => setScreen("inventario")}
          >
            Inventário
          </button>

          <button
            className={`sidebar-btn ${screen === "usuarios" ? "active" : ""}`}
            onClick={() => setScreen("usuarios")}
          >
            Usuários
          </button>
        </div>
      </aside>

      <main className="main-content">
        {screen === "termo" ? (
          <DeliveryTermsScreen
            terms={terms}
            setTerms={setTerms}
            onAddShipment={addShipments}
          />
        ) : screen === "usuarios" ? (
          <UsersManagementScreen />
        ) : (
          <ManageDeviceTerm
            terms={terms}
            inventoryUsers={inventoryUsers}
            shipments={shipments}
            onAddShipments={addShipments}
            onUpdateShipment={updateShipment}
          />
        )}
      </main>
    </div>
  );
}

export default App;