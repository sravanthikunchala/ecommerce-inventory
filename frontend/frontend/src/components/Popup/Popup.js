import React, { useEffect } from "react";
import { FaTimesCircle, FaCheckCircle, FaInfoCircle } from "react-icons/fa";
import "./Popup.css";

const PopupMessage = ({ message, type = "info", onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => onClose(), 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  if (!message) return null;

  const icon = {
    success: <FaCheckCircle className="main-popup-icon success" />,
    error: <FaTimesCircle className="main-popup-icon error" />,
    info: <FaInfoCircle className="main-popup-icon info" />,
  }[type] || <FaInfoCircle className="main-popup-icon info" />;

  return (
    <div className="main-popup-overlay" onClick={onClose}>
      <div
        className={`main-popup-message ${type}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="main-popup-content">
          {icon}
          <span className="main-popup-text">{message}</span>
        </div>
        <button className="main-popup-close-btn" onClick={onClose}>
          OK
        </button>
      </div>
    </div>
  );
};

export default PopupMessage;