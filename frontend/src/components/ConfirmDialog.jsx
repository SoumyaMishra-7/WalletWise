import React, { useEffect, useState } from "react";
import "./ConfirmDialog.css";

const ConfirmDialog = ({
  isOpen,
  message,
  onConfirm,
  onCancel,
}) => {
  const [active, setActive] = useState("confirm"); // confirm | cancel

  useEffect(() => {
    if (!isOpen) return;
    setActive("confirm");
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="confirm-overlay">
      <div className="confirm-modal">
        <h3>Confirm Action</h3>
        <p>{message}</p>

        <div className="confirm-actions">
          <div
            className={`slider ${active}`}
          ></div>

          <button
            className={`action-btn ${active === "cancel" ? "active" : ""}`}
            onMouseEnter={() => setActive("cancel")}
            onClick={onCancel}
          >
            Cancel
          </button>

          <button
            className={`action-btn ${active === "confirm" ? "active" : ""}`}
            onMouseEnter={() => setActive("confirm")}
            onClick={onConfirm}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;