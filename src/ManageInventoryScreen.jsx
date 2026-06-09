import "./ManageInventoryScreen.css";

const sampleDevices = [
  { id: 1, userName: "João Silva", model: "RTX-1000", imei: "358762043920347", platform: "Android", status: "Em uso" },
  { id: 2, userName: "Maria Souza", model: "RTX-2000", imei: "358762043920348", platform: "iOS", status: "Em uso" },
  { id: 3, userName: "Carlos Lima", model: "RTX-3000", imei: "358762043920349", platform: "Windows", status: "Em uso" },
  { id: 4, userName: "Ana Pereira", model: "RTX-4000", imei: "358762043920350", platform: "Linux", status: "Em uso" },
  { id: 5, userName: "", model: "RTX-5000", imei: "358762043920351", platform: "Android", status: "Em estoque" },
  { id: 6, userName: "", model: "RTX-6000", imei: "358762043920352", platform: "iOS", status: "Em estoque" },
  { id: 7, userName: "Paulo Santos", model: "RTX-7000", imei: "358762043920353", platform: "Windows", status: "Em uso" },
  { id: 8, userName: "", model: "RTX-8000", imei: "358762043920354", platform: "Linux", status: "Devolvido" },
  { id: 9, userName: "Mariana Costa", model: "RTX-9000", imei: "358762043920355", platform: "Android", status: "Em uso" },
  { id: 10, userName: "", model: "RTX-10000", imei: "358762043920356", platform: "iOS", status: "Devolvido" },
];

function ManageInventoryScreen({ onBack }) {
  return (
    <div className="manage-inventory-container">
      <div className="manage-inventory-header">
        <div>
          <div className="breadcrumb">Gerenciar</div>
          <h1>Inventário de Dispositivos</h1>
        </div>
        <button className="back-btn" type="button" onClick={onBack}>
          Voltar
        </button>
      </div>

      <div className="manage-inventory-table-wrap">
        <table className="manage-inventory-table">
          <thead>
            <tr>
              <th>Nome Usuário</th>
              <th>Modelo</th>
              <th>IMEI</th>
              <th>Plataforma</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {sampleDevices.map((device) => (
              <tr key={device.id}>
                <td>{device.userName || "—"}</td>
                <td>{device.model}</td>
                <td>{device.imei}</td>
                <td>{device.platform}</td>
                <td>{device.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default ManageInventoryScreen;
