function DeliveryHistory({ history }) {
  const formatDate = (date) => {
    return date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="history-container">
      <h3>Histórico</h3>
      <div className="history-grid-container">
        {history.length > 0 ? (
          <table className="history-grid">
            <thead>
              <tr>
                <th>Data</th>
                <th>Situação</th>
                <th>Termo</th>
              </tr>
            </thead>
            <tbody>
              {history.map((entry, index) => (
                <tr key={index}>
                  <td>{formatDate(entry.date)}</td>
                  <td>
                    <span className={`situation-badge ${entry.situation.toLowerCase()}`}>
                      {entry.situation}
                    </span>
                  </td>
                  <td>{entry.termName}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="history-no-results">
            <p>Nenhum registro no histórico</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default DeliveryHistory;
