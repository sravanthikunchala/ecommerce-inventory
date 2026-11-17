import React, { useState, useEffect } from "react";
import StockTable from "./StockTable";
import { Clipboard, Package, TrendingUp, BarChart3 } from "lucide-react";
import RolesHeader from "../../components/RolesHeader/RolesHeader";
import RolesSideMenu from "../../components/RolesSideMenu/RolesSideMenu";
import axios from "axios";
import API_BASE_URL from "../../config";
import PopupMessage from "../../components/Popup/Popup";
import { useNavigate } from "react-router-dom";
import { ClipLoader } from "react-spinners";


const StockPage = () => {
  const navigate = useNavigate();
  const [stock, setStock] = useState([]);
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);

  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 10;

  const [popupMessage, setPopupMessage] = useState({ text: "", type: "" });
  const [showPopup, setShowPopup] = useState(false);

  const displayPopup = (text, type = "error", duration = 10000) => {
    setPopupMessage({ text, type });
    setShowPopup(true);
    setTimeout(() => setShowPopup(false), duration);
  };

  useEffect(() => {
    const roleId = sessionStorage.getItem("roleId");

    if (!roleId) {
      displayPopup("Please login first", "error", 10000);
      setTimeout(() => navigate("/role-login"), 10000);
      setDataLoading(false);
      return;
    }

    const fetchStock = async () => {
      try {
        setDataLoading(true);
        const payload = { role_id: Number(roleId) };
        const response = await axios.post(`${API_BASE_URL}/view-overall-stock`, payload);

        if (response.data.success) {
          const data = response.data.data || [];
          setStock(data);

          const totalItems = data.length;
          const totalQuantity = data.reduce((sum, s) => sum + s.total_quantity, 0);
          const totalValue = data.reduce((sum, s) => sum + Number(s.total_value), 0);
          const highValueItems = data.filter((s) => Number(s.total_value) > 100000).length;

          setStats([
            { title: "Total Items", value: totalItems.toString(), icon: Clipboard, iconClass: "blue" },
            { title: "Total Quantity", value: totalQuantity.toString(), icon: Package, iconClass: "amber" },
            { title: "High Value Items", value: highValueItems.toString(), icon: TrendingUp, iconClass: "emerald" },
            { title: "Total Stock Value", value: totalValue.toFixed(2), icon: BarChart3, iconClass: "purple" },
          ]);
        } else {
          displayPopup(response.data.error || "Failed to fetch stock.", "error", 10000);
        }
      } catch (err) {
        console.error("Stock fetch error:", err);
        displayPopup("Error fetching stock data.", "error", 10000);
      } finally {
        setDataLoading(false);
      }
    };

    fetchStock();
  }, [navigate]);

  const indexOfLastRecord = currentPage * recordsPerPage;
  const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
  const currentRecords = stock.slice(indexOfFirstRecord, indexOfLastRecord);
  const totalPages = Math.ceil(stock.length / recordsPerPage);

  const goToFirstPage = () => setCurrentPage(1);
  const goToLastPage = () => setCurrentPage(totalPages);
  const nextPage = () => setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  const prevPage = () => setCurrentPage((prev) => Math.max(prev - 1, 1));

  return (
      <div className="roles-dashboard">
    <RolesHeader />

      <div className="roles-page-body">
        <div className="roles-sidebar">
          <RolesSideMenu />
        </div>

        <div className="roles-main-content">
          <div className="dmrr-container">
            {dataLoading ? (
              <div className="full-page-loading">
                <div className="loading-content">
                  <ClipLoader size={50} color="#4450A2" />
                  <p>Loading...</p>
                </div>
              </div>
            ) : (
              <>
                <div className="dmrr-header">
                  <div className="dmrr-header-content">
                    <div className="dmrr-title-section">
                      <div className="dmrr-icon-container">
                        <Package size={32} color="white" />
                      </div>
                      <div>
                        <h1 className="dmrr-title">Total Stock Statement</h1>
                        <p className="dmrr-subtitle">
                          Overview of all available stock, quantities, and values
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
                  <div className="dmrr-stats-grid">
                    {stats.map((stat, index) => (
                      <div key={index} className="dmrr-stat-card">
                        <div className="dmrr-stat-content">
                          <div className="dmrr-stat-text">
                            <h3>{stat.title}</h3>
                            <p>{stat.value}</p>
                          </div>
                          <div className={`dmrr-stat-icon ${stat.iconClass}`}>
                            <stat.icon size={24} />
                          </div>
                        </div>
                        <div className={`dmrr-stat-bar ${stat.iconClass}`}></div>
                      </div>
                    ))}
                  </div>

                  <div className="dmrr-content-sections">
                    {loading ? (
                      <div style={{ textAlign: "center", padding: "20px" }}>
                        <ClipLoader size={30} color="#4450A2" />
                      </div>
                    ) : (
                      <StockTable stock={currentRecords} />
                    )}
                  </div>

                  {stock.length > 0 && (
                    <div className="pagination-container">
                      <button
                        onClick={goToFirstPage}
                        disabled={currentPage === 1}
                      >
                        First
                      </button>
                      <button
                        onClick={prevPage}
                        disabled={currentPage === 1}
                      >
                        Previous
                      </button>
                      <span>
                        Page {currentPage} of {totalPages}
                      </span>
                      <button
                        onClick={nextPage}
                        disabled={currentPage === totalPages}
                      >
                        Next
                      </button>
                      <button
                        onClick={goToLastPage}
                        disabled={currentPage === totalPages}
                      >
                        Last
                      </button>
                    </div>
                  )}

                  <div className="dmrr-footer">
                    <div className="dmrr-footer-content">
                      <p className="dmrr-footer-text">
                        Stock Management System | Last updated:{" "}
                        {new Date().toLocaleTimeString()}
                      </p>
                      <div className="dmrr-footer-meta">
                        <span>Total Items: {stock.length}</span>
                        <span>•</span>
                        <span>Active Session: {new Date().toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StockPage;
