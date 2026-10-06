import React, { useEffect, useState } from "react";
import "./ConfirmDialog.css";

const ConfirmDialog = ({
  isOpen,
  title = "Confirm Action",
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  type = "warning",
  onConfirm,
  onCancel,
}) => {
  const [active, setActive] = useState("confirm"); // confirm | cancel

  useEffect(() => {
    if (!isOpen) return;
    setActive("confirm");
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e) => { if (e.key === "Escape") onCancel?.(); };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div
      className="confirm-overlay"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel?.(); }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
    >
      <div className={`confirm-modal confirm-modal--${type}`}>
        <h3 id="confirm-title">{title}</h3>
        <p>{message}</p>

        <div className="confirm-actions">
          <div className={`slider ${active}`}></div>

          <button
            className={`action-btn ${active === "cancel" ? "active" : ""}`}
            onMouseEnter={() => setActive("cancel")}
            onClick={onCancel}
          >
            {cancelText}
          </button>

          <button
            className={`action-btn ${active === "confirm" ? "active" : ""}`}
            onMouseEnter={() => setActive("confirm")}
            onClick={onConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;