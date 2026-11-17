import React, { useState, useEffect } from "react";
import axios from "axios";
import API_BASE_URL from "../../config";
import DmrrForm from "./DmrrForm";
import DmrrTable from "./DmrrTable";
import { Clipboard } from "lucide-react";
import './DmrrPage.css';
import RolesHeader from "../../components/RolesHeader/RolesHeader";
import RolesSideMenu from "../../components/RolesSideMenu/RolesSideMenu";
import { useNavigate } from "react-router-dom";
import PopupMessage from "../../components/Popup/Popup";

const DmrrPage = () => {
  const navigate = useNavigate();
  const [receipts, setReceipts] = useState([]);

  const roleId = sessionStorage.getItem("roleId");
  const roleType = sessionStorage.getItem("roleType");

  
  
  const [popupMessage, setPopupMessage] = useState({ text: "", type: "" });
  const [showPopup, setShowPopup] = useState(false);

  const displayPopup = (text, type = "success") => {
    setPopupMessage({ text, type });
    setShowPopup(true);
    setTimeout(() => setShowPopup(false), 10000);
  };

   
  useEffect(() => {
    if (!roleId) {
      displayPopup("Please login first", "error");  
      navigate("/role-login");
    }
  }, [roleId,  navigate]);

  const fetchReceipts = async () => {
    try {
      const response = await axios.post(`${API_BASE_URL}/view-material-receipts`, {
       
        role_id: roleId,
      });

      if (response.data.success) {
        setReceipts(response.data.data);
      } else {
           displayPopup(response.data.error || "Failed to fetch receipts", "error");
      }
    } catch (err) {
        console.error("Fetch receipts error:", err);
        displayPopup("Error fetching receipts", "error");
      } 
    };

  useEffect(() => {
    if (roleId ) fetchReceipts();
  }, [roleId]);



const handleReceiptAdded = (newReceipts) => {
  if (!newReceipts || newReceipts.length === 0) return;

  const receiptsArray = Array.isArray(newReceipts) ? newReceipts : [newReceipts];

 
  setReceipts((prevReceipts) => {
    const existingIds = new Set(prevReceipts.map((r) => r.id));
    const filteredNew = receiptsArray.filter((r) => !existingIds.has(r.id));
  
    return [...filteredNew, ...prevReceipts];
  });

  displayPopup("Excel data added successfully!", "success");
};



  const handleInspectionComplete = async () => {
    await fetchReceipts();
  };

  return (
     <div className="roles-dashboard">
       <RolesHeader />
        <div className="roles-page-body">
          <div className="roles-page-sidebar">
            <RolesSideMenu />
          </div>
          <div className="roles-main-content">
    <div className="dmrr-container">
    
      <div className="dmrr-header">
        <div className="dmrr-header-content">
          <div className="dmrr-title-section">
            <div className="dmrr-icon-container">
              <Clipboard size={32} color="white" />
            </div>
            <div>
              <h1 className="dmrr-title">Daily Material Receipt Report</h1>
              <p className="dmrr-subtitle">
                Manage and track your daily material receipts and inspections
              </p>
            </div>
          </div>
          <div className="dmrr-date-section">
            <p className="dmrr-date-label">Today's Date</p>
            <p className="dmrr-date-value">
              {new Date().toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
        </div>
      </div>

<div className="dmrr-main-content">
  {(roleType === "Admin" || roleType === "stores incharge" || roleType === "quality incharge") && (
    <DmrrForm onReceiptAdded={handleReceiptAdded} />
  )}

  <DmrrTable
    receipts={receipts}
    roleId={roleId} 
    onInspectionComplete={handleInspectionComplete} 
  />


             
              <div className="dmrr-footer">
                <div className="dmrr-footer-content">
                  <p className="dmrr-footer-text">
                    Daily Material Receipt Report System | Last updated:{" "}
                    {new Date().toLocaleTimeString()}
                  </p>
                  <div className="dmrr-footer-meta">
                    <span>Total Records: {receipts.length}</span>
                    <span>•</span>
                    <span>Active Session: {new Date().toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DmrrPage;