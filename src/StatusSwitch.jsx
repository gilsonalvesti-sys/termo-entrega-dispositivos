import "./StatusSwitch.css";

function StatusSwitch({ isActive, onToggle, id }) {
  return (
    <div className="switch-container">
      <input
        type="checkbox"
        id={`switch-${id}`}
        className="switch-checkbox"
        checked={isActive}
        onChange={() => onToggle(id)}
      />
      <label htmlFor={`switch-${id}`} className="switch-label">
        <span className="switch-inner">
          <span className="switch-switch"></span>
        </span>
      </label>
      <span className={`status-text ${isActive ? 'active' : 'inactive'}`}>
        {isActive ? 'Ativo' : 'Inativo'}
      </span>
    </div>
  );
}

export default StatusSwitch;
