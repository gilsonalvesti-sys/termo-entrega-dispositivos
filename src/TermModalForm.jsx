import { useState } from "react";
import "./TermModalForm.css";

function TermModalForm({ isOpen, onClose, onSave }) {
  const [formData, setFormData] = useState({
    name: "",
    version: "1.0",
    text: "",
  });

  const [textFormatting, setTextFormatting] = useState({
    bold: false,
    italic: false,
    underline: false,
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleTextAreaChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      text: e.target.value,
    }));
  };

  const applyFormatting = (format) => {
    const textarea = document.getElementById("term-text");
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = formData.text.substring(start, end);

    if (!selectedText) return;

    let formattedText = selectedText;

    switch (format) {
      case "bold":
        formattedText = `**${selectedText}**`;
        break;
      case "italic":
        formattedText = `*${selectedText}*`;
        break;
      case "underline":
        formattedText = `__${selectedText}__`;
        break;
      default:
        return;
    }

    const newText =
      formData.text.substring(0, start) +
      formattedText +
      formData.text.substring(end);

    setFormData((prev) => ({
      ...prev,
      text: newText,
    }));

    setTimeout(() => {
      textarea.focus();
      textarea.selectionStart = start + formattedText.length;
      textarea.selectionEnd = start + formattedText.length;
    }, 0);
  };

  const handleSave = () => {
    if (!formData.name.trim()) {
      alert("Por favor, preencha o nome do termo");
      return;
    }
    if (!formData.version.trim()) {
      alert("Por favor, preencha a versão");
      return;
    }
    if (!formData.text.trim()) {
      alert("Por favor, preencha o texto do termo");
      return;
    }

    onSave(formData);
    handleCancel();
  };

  const handleCancel = () => {
    setFormData({
      name: "",
      version: "1.0",
      text: "",
    });
    setTextFormatting({
      bold: false,
      italic: false,
      underline: false,
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={handleCancel}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Cadastro de Termo</h2>
          <button
            className="modal-close-btn"
            onClick={handleCancel}
            aria-label="Fechar modal"
          >
            ✕
          </button>
        </div>

        <div className="modal-body">
          <div className="form-group">
            <label htmlFor="term-name">Nome do Termo *</label>
            <input
              id="term-name"
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="Ex: Termo de Entrega Padrão"
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label htmlFor="term-version">Versão *</label>
            <input
              id="term-version"
              type="text"
              name="version"
              value={formData.version}
              onChange={handleInputChange}
              placeholder="Ex: 1.0"
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label htmlFor="term-text">Texto *</label>
            <div className="formatting-toolbar">
              <button
                type="button"
                className="format-btn"
                onClick={() => applyFormatting("bold")}
                title="Negrito (Ctrl+B)"
              >
                <strong>B</strong>
              </button>
              <button
                type="button"
                className="format-btn"
                onClick={() => applyFormatting("italic")}
                title="Itálico (Ctrl+I)"
              >
                <em>I</em>
              </button>
              <button
                type="button"
                className="format-btn"
                onClick={() => applyFormatting("underline")}
                title="Sublinhado (Ctrl+U)"
              >
                <u>U</u>
              </button>
            </div>
            <textarea
              id="term-text"
              name="text"
              value={formData.text}
              onChange={handleTextAreaChange}
              placeholder="Digite o texto do termo aqui... Use os botões acima para adicionar formatação."
              className="form-textarea"
              rows="10"
            />
            <p className="formatting-hint">
              Dicas: **texto** para negrito, *texto* para itálico, __texto__
              para sublinhado
            </p>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-cancel" onClick={handleCancel}>
            Cancelar
          </button>
          <button className="btn-save" onClick={handleSave}>
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
}

export default TermModalForm;
