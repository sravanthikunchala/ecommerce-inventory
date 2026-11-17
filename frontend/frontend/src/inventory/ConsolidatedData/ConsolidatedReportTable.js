import React, { useState, useEffect } from "react";
import RolesHeader from "../../components/RolesHeader/RolesHeader";   
import RolesSideMenu from "../../components/RolesSideMenu/RolesSideMenu";
import API_BASE_URL from "../../config";
import { ClipLoader } from "react-spinners";
import PopupMessage from "../../components/Popup/Popup";
import "./ConsolidatedReportTable.css";
import {Filter} from "lucide-react";
import ConsolidatedReportCharts from "./ConsolidatedReportCharts";
import {  FaSpinner, FaArrowRight } from 'react-icons/fa';
import { ChartNoAxesCombined} from "lucide-react";

const ConsolidatedReportTable = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [popupMessage, setPopupMessage] = useState({ text: "", type: "" });
  const [showPopup, setShowPopup] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 10;
  const [reportType, setReportType] = useState("day"); 
  const [showDetails, setShowDetails] = useState(false);
  const [selectedDateOrMonth, setSelectedDateOrMonth] = useState(null);
  const [componentDetails, setComponentDetails] = useState([]);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const[viewMoreLoading,setViewMoreLoading]=useState();
  const[filterLoading,setFilterLoading]=useState(false);
  
  const [showFilter, setShowFilter] = useState(false);
  const [filterType, setFilterType] = useState("");
  const [filterData, setFilterData] = useState({
    start_date: "",
    end_date: "",
    start_month: "",
    end_month: "", 
    start_year: "",
    end_year: ""
  });
  const [isFilterApplied, setIsFilterApplied] = useState(false);

  const displayPopup = (text, type = "error", duration = 10000) => {
    setPopupMessage({ text, type });
    setShowPopup(true);
    setTimeout(() => setShowPopup(false), duration);
  }

  const fetchOriginalReports = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/view-daily-consolidated-report`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          start_date: "",
          end_date: "",
          report_type: reportType,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setReports(data.data);
        setIsFilterApplied(false);
      } else {
        setError(data.message || "Failed to fetch reports");
        displayPopup(data.message || "Failed to fetch reports", "error", 10000);
      }
    } catch (err) {
      console.error("Error fetching consolidated report:", err);
      displayPopup("Error fetching reports", "error");
    } finally {
      setLoading(false);
    }
  };

  const fetchFilteredReports = async () => {
    setFilterLoading(true);
    try {
      const requestBody = {
        report_type: filterType
      };

      if (filterType === "day") {
        requestBody.start_date = filterData.start_date;
        requestBody.end_date = filterData.end_date || filterData.start_date;
      } else if (filterType === "month") {
        requestBody.start_month = filterData.start_month;
        requestBody.end_month = filterData.end_month || filterData.start_month;
      } else if (filterType === "year") {
        requestBody.start_year = filterData.start_year;
        requestBody.end_year = filterData.end_year || filterData.start_year;
      }

      const response = await fetch(`${API_BASE_URL}/filter-consolidated-report`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();
      if (data.success) {
        setReports(data.data);
        setIsFilterApplied(true);
        setShowFilter(false);
        displayPopup("Filter applied successfully!", "success");
      } else {
        displayPopup(data.message || "Failed to apply filter", "error");
      }
    } catch (err) {
      console.error("Error filtering reports:", err);
      displayPopup("Error applying filter", "error");
    } 
    finally {
      setFilterLoading(false);
    }
  };

  useEffect(() => {
    fetchOriginalReports();
  }, [reportType]);

  const resetToOriginalData = () => {
    fetchOriginalReports();
    setFilterData({
      start_date: "",
      end_date: "",
      start_month: "",
      end_month: "",
      start_year: "",
      end_year: ""
    });
  };

  const handleFilterTypeChange = (type) => {
    setFilterType(type);
    setFilterData({
      start_date: "",
      end_date: "",
      start_month: "",
      end_month: "",
      start_year: "",
      end_year: ""
    });
  };

  const handleFilterChange = (field, value) => {
    setFilterData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const applyFilter = () => {
    if (filterType === "day" && !filterData.start_date) {
      displayPopup("Start date is required for day filter", "error");
      return;
    }
    if (filterType === "month" && !filterData.start_month) {
      displayPopup("Start month is required for month filter", "error");
      return;
    }
    if (filterType === "year" && !filterData.start_year) {
      displayPopup("Start year is required for year filter", "error");
      return;
    }
    
    fetchFilteredReports();
  };

  const totalPages = Math.ceil(reports.length / recordsPerPage);
  const indexOfLastRecord = currentPage * recordsPerPage;
  const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
  const currentRecords = reports.slice(indexOfFirstRecord, indexOfLastRecord);

  const goToFirstPage = () => setCurrentPage(1);
  const goToLastPage = () => setCurrentPage(totalPages);
  const nextPage = () => currentPage < totalPages && setCurrentPage(currentPage + 1);
  const prevPage = () => currentPage > 1 && setCurrentPage(currentPage - 1);

  const fetchDetails = async (dateOrMonth) => {
    setLoadingDetails(prev => ({ ...prev, [dateOrMonth]: true }));
    try {
      const body =
        reportType === "day"
          ? { report_type: "day", date: dateOrMonth }
          : { report_type: "month", month: dateOrMonth };

      const response = await fetch(`${API_BASE_URL}/view-consolidated-report-details`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await response.json();
      if (data.success) {
        setComponentDetails(data.components);
        setSelectedDateOrMonth(dateOrMonth);
        setShowDetails(true);
      } else {
        displayPopup(data.message || "Failed to fetch details", "error");
      }
    } catch (error) {
      console.error("Error fetching details:", error);
      displayPopup("Error fetching details", "error");
    } finally {
      setLoadingDetails(false);
    }
  };

  if (loading) {
    return (
      <div className="roles-dashboard">
        <RolesHeader />
        <div className="roles-page-body">
          <div className="roles-page-sidebar">
            <RolesSideMenu />
          </div>
          <div className="roles-main-content">
            <div className="full-page-loading">
              <div className="loading-content">
                <ClipLoader size={50} color={"#4F4892"} loading={loading} />
                <p>Loading Consolidated Report...</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if(error) {
    return (
      <div className="roles-dashboard"> 
        <RolesHeader />
        <div className="roles-page-body">
          <div className="roles-page-sidebar">
            <RolesSideMenu />
          </div>
          <div className="roles-main-content">
            <div className="error-container">
              <h3>Error Loading Consolidated Report</h3>
              <p>{error}</p>
              <button onClick={() => window.location.reload()} className="retry-button">
                Retry
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="roles-dashboard">
      <RolesHeader />
      <div className="roles-page-body">
        <div className="roles-page-sidebar">
          <RolesSideMenu />
        </div>
        <div className="roles-main-content">
          <div className="dmrr-header">
        <div className="dmrr-header-content">
          <div className="dmrr-title-section">
            <div className="dmrr-icon-container">
              <ChartNoAxesCombined size={32} color="white" />
            </div>
            <div>
              <h1 className="dmrr-title">Consolidated Data Analytics</h1>
              <p className="dmrr-subtitle">
                Reports and individual chart filters for detailed analysis
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
            <div className="consolidated-controls-container">
            <div className="consolidated-controls-left">
              <select
                value={reportType}
                onChange={(e) => {
                  setReportType(e.target.value);
                  setCurrentPage(1);
                }}
                className="consolidated-report-type-select"
              >
                <option value="day">Day-wise</option>
                <option value="month">Month-wise</option>
              </select>
            </div>
            
            <div className="consolidated-controls-right">
              {isFilterApplied ? (
                <button
                  onClick={resetToOriginalData}
                  className="consolidated-clear-btn"
                >
                  ✕ Clear Filter
                </button>
              ) : (
                <button
                  onClick={() => setShowFilter(!showFilter)}
                  className="conslidated-apply-btn"
                >
                 Filter
                </button>
              )}
            </div>
          </div>

          {showFilter && (
            <div className="dmrr-filter-container">
                <h3><Filter size={18} />Filter Consolidated Data</h3>
              <div className="dmrr-filter-fields">
                <div>
                  <label>
                    Filter Type:
                  </label>
                  <select
                    value={filterType}
                    onChange={(e) => handleFilterTypeChange(e.target.value)}
                    className="consolidated-type-change"
                  >
                    <option value="">--Select Filter Type--</option>
                    <option value="day">Day</option>
                    <option value="month">Month</option>
                    <option value="year">Year</option>
                  </select>
                </div>

                {filterType === "day" && (
                  <>
                    <div>
                      <label className="consolidated-filter-label">
                        Start Date:
                      </label>
                      <input
                        type="date"
                        value={filterData.start_date}
                        onChange={(e) => handleFilterChange("start_date", e.target.value)}
                        className="consolidated-start-date"
                      />
                    </div>
                    <div>
                      <label className="consolidated-filter-label">
                        End Date (optional):
                      </label>
                      <input
                        type="date"
                        value={filterData.end_date}
                        onChange={(e) => handleFilterChange("end_date", e.target.value)}
                        className="consolidated-end-date"
                      />
                    </div>
                  </>
                )}

                {filterType === "month" && (
                  <>
                    <div>
                      <label className="consolidated-filter-label">
                        Start Month:
                      </label>
                      <input
                        type="month"
                        value={filterData.start_month}
                        onChange={(e) => handleFilterChange("start_month", e.target.value)}
                        className="consolidated-start-date"
                      />
                    </div>
                    <div>
                      <label className="consolidated-filter-label">
                        End Month (optional):
                      </label>
                      <input
                        type="month"
                        value={filterData.end_month}
                        onChange={(e) => handleFilterChange("end_month", e.target.value)}
                        className="consolidated-end-date"
                      />
                    </div>
                  </>
                )}

                {filterType === "year" && (
                  <>
                    <div>
                      <label className="consolidated-filter-label">
                        Start Year:
                      </label>
                      <input
                        type="number"
                        min="2000"
                        max="2030"
                        value={filterData.start_year}
                        onChange={(e) => handleFilterChange("start_year", e.target.value)}
                        placeholder="YYYY"
                        className="consolidated-start-date"
                      />
                    </div>
                    <div>
                      <label className="consolidated-filter-label">
                        End Year (optional):
                      </label>
                      <input
                        type="number"
                        min="2000"
                        max="2030"
                        value={filterData.end_year}
                        onChange={(e) => handleFilterChange("end_year", e.target.value)}
                        placeholder="YYYY"
                        className="consolidated-end-date"
                      />
                    </div>
                  </>
                )}

                <div className="dmrr-filter-buttons">
                  <button
                    onClick={applyFilter} disabled={filterLoading}
                  >
                    {filterLoading ? "Applying..." : "Apply Filter"}  
                  </button>
                  <button
                    onClick={() => setShowFilter(false)}
                  >
                    Cancel 
                  </button>
                </div>
              </div>
            </div>
          )}
            <div className="dmrr-table-container">
            <div className="dmrr-table-header">
              <h2 className="dmrr-table-title">Daily Consolidated Inventory Report</h2>
              
              <span className="dmrr-table-count">
                  {reports.length} {reports.length === 1 ? "record" : "records"}
                </span>
            </div>

            <div className="dmrr-table-wrapper">
              <table className="dmrr-table">
                <thead className="dmrr-table-head">
                  <tr>
                    <th>S.No</th>
                    <th>{reportType === "day" ? "Date" : "Month"}</th>
                    <th>Total Stock Received Qty</th>
                    <th>Total Stock Received Value</th>
                    <th>Total Stock Issued Qty</th>
                    <th>Total Sales Value</th>
                    <th>Total Cost</th>
                    <th>Profit / Loss</th>
                    {reportType === "day" && <th>Action</th>} 
                  </tr>
                </thead>

                <tbody className="dmrr-table-body">
                  {currentRecords.length > 0 ? (
                    currentRecords.map((item, index) => (
                      <tr key={index} className="dmrr-table-row">
                        <td>{indexOfFirstRecord + index + 1}</td>
                        <td>{item.period || item.date_or_month}</td>
                        <td>{item.total_stock_received_qty}</td>
                        <td>{item.total_stock_received_value?.toFixed(2)}</td>
                        <td>{item.total_stock_issued_qty}</td>
                        <td>{item.total_sales_value?.toFixed(2)}</td>
                        <td>{item.total_cost?.toFixed(2)}</td>
                        <td style={{ color: item.profit_or_loss >= 0 ? "green" : "red" }}>
                          {item.profit_or_loss?.toFixed(2)}
                        </td>
                        {reportType === "day" && (
                        <td>
                          <button
                            className="cd-view-more-btn"
                            onClick={() => fetchDetails(item.period || item.date_or_month)}
                           disabled={loadingDetails}
                          >
                              {loadingDetails[item.period || item.date_or_month] ? (
                                <FaSpinner className="spin-icon" />
                              ) : (
                                <FaArrowRight />
                              )}
                          </button>
                        </td>
                        )}
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="9" style={{ textAlign: "center", padding: "10px" }}>
                        No report data available.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

{showDetails && (
  <div className="cd-modal-overlay">
    <div className="cd-modal-content">
      <h3 style={{ marginBottom: "10px", color: "#071952" }}>
        {reportType === "day" ? "Date" : "Month"}: {selectedDateOrMonth}
      </h3>

      {loadingDetails ? (
        <div style={{ textAlign: "center", padding: "20px" }}>
          <ClipLoader size={40} color="#0b666a" />
          <p>Loading component details...</p>
        </div>
      ) : componentDetails.length > 0 ? (
        <div>
          <div className="dmrr-table-wrapper">
            <table className="dmrr-table">
              <thead className="dmrr-table-head">
                <tr>
                  <th>S.No</th>
                  <th>Component Name</th>
                  <th>Received Qty</th>
                  <th> Rec Unit Price</th>
                  <th>Total Received Value</th>
                  <th>Issued Qty</th>
                  <th>Iss Unit Price</th>
                  <th>Issued Cost</th>
                </tr>
              </thead>
              <tbody>
                {componentDetails.map((comp, idx) => (
                  <tr key={idx}>
                    <td style={{ textAlign: "center" }}>{idx + 1}</td>
                    <td className="cd-view-more-td" >{comp.component_name}</td>
                    <td className="cd-view-more-td">{comp.received_qty}</td>
                    <td className="cd-view-more-td">{comp.unit_price.toFixed(2)}</td>
                    <td className="cd-view-more-td">{comp.total_received_value.toFixed(2)}</td>
                    <td className="cd-view-more-td">{comp.issued_qty}</td>
                    <td className="cd-view-more-td">{comp.issued_unit_price}</td>
                    <td className="cd-view-more-td">{comp.issued_cost.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ marginTop: "30px" }}>
            <h4 className="Issued-items-details">Detailed Issued Items</h4>
            {componentDetails.map((comp, compIndex) => (
              comp.issued_items && comp.issued_items.length > 0 && (
                <div key={compIndex} style={{ marginBottom: "20px" }}>
                  <h5>
                    Component: {comp.component_name}
                  </h5>
                  <div className="dmrr-table-wrapper">
                    <table className="dmrr-table">
                      <thead className="dmrr-table-head">
                        <tr>
                          <th>SIN No</th>
                          <th>Issued Date</th>
                          <th>Qty Issued</th>
                          <th>Unit Price</th>
                          <th>Total Value</th>
                        </tr>
                      </thead>
                      <tbody>
                        {comp.issued_items.map((item, itemIndex) => (
                          <tr key={itemIndex}>
                            <td className="cd-view-more-td">{item.sin_no}</td>
                            <td className="cd-view-more-td">{item.issued_date}</td>
                            <td className="cd-view-more-td" >{item.qty_issued}</td>
                            <td className="cd-view-more-td">{item.unit_price_at_issue.toFixed(2)}</td>
                            <td className="cd-view-more-td">{(item.qty_issued * item.unit_price_at_issue).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )
            ))}
          </div>
        </div>
      ) : (
        <p style={{ textAlign: "center", color: "gray" }}>No component details available.</p>
      )}

      <div className="cd-more-close-btn" style={{ textAlign: "center", marginTop: "15px" }}>
        <button
          onClick={() => setShowDetails(false)}
          className="cd-close-btn"
        >
          Close
        </button>
      </div>
    </div>
  </div>
)}
              {showPopup && (
                <div className="role-popup">
                <PopupMessage
                  message={popupMessage.text}
                  type={popupMessage.type}
                  onClose={() => setShowPopup(false)}
                />
                </div>
              )}

              {reports.length > 0 && (
                <div className="pagination-container">
                  <button onClick={goToFirstPage} disabled={currentPage === 1}>
                    First
                  </button>
                  <button onClick={prevPage} disabled={currentPage === 1}>
                    Previous
                  </button>
                  <span>
                    Page {currentPage} of {totalPages}
                  </span>
                  <button onClick={nextPage} disabled={currentPage === totalPages}>
                    Next
                  </button>
                  <button onClick={goToLastPage} disabled={currentPage === totalPages}>
                    Last
                  </button>
                </div>
              )}

              
              
            </div>
          </div>
          
          <ConsolidatedReportCharts />
          
        </div>
      </div>
    </div>
  
  
);
};

export default ConsolidatedReportTable;