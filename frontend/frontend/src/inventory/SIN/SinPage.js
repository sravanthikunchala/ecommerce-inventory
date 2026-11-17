import React, { useState, useEffect } from "react";
import {
  FileText,
  Plus,
  Package,
  Clipboard,
  TrendingUp,
  BarChart3,
  Hash,
  Filter,
  Upload
} from "lucide-react";
import "./SinPage.css";
import RolesHeader from "../../components/RolesHeader/RolesHeader";
import RolesSideMenu from "../../components/RolesSideMenu/RolesSideMenu";
import API_BASE from "../../config";
import PopupMessage from "../../components/Popup/Popup";
import { ClipLoader } from "react-spinners";
import axios from "axios";
import { 
  FaPaperPlane, 
  FaSpinner,
  FaShare, 
  FaArrowRight, 
  FaExternalLinkAlt,
  FaUpload,
  FaShippingFast,
} from 'react-icons/fa';
import { GoIssueTrackedBy } from "react-icons/go";

const SINPage = () => {
  const [sinRecords, setSinRecords] = useState([]);
  const [filteredRecords, setFilteredRecords] = useState([]);
  const [isFilterApplied, setIsFilterApplied] = useState(false);

  const [formCreate, setFormCreate] = useState({
    component_name: "",
    uom: "",
    qty_requested: "",
    remarks: "",
  });
  const [formUpdate, setFormUpdate] = useState({
    sin_no: "",
    qty_issued: "",
  });

  const roleType = (sessionStorage.getItem("roleType") || "").toLowerCase();
  const roleId = sessionStorage.getItem("roleId");
  const adminId = sessionStorage.getItem("admin_id");

  const [popupMessage, setPopupMessage] = useState({ text: "", type: "" });
  const [showPopup, setShowPopup] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [createLoading, setCreateLoading] = useState(false);
  const [updateLoading, setUpdateLoading] = useState(false);
  const [excelLoading, setExcelLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [excelFile, setExcelFile] = useState(null);
  const recordsPerPage = 10;
  const [latestRecord, setLatestRecord] = useState(null);

  // Add these new states
const [showIssueModal, setShowIssueModal] = useState(false);
const [selectedRecord, setSelectedRecord] = useState(null);
const [issueQty, setIssueQty] = useState("");
const [overallStock, setOverallStock] = useState([]);
useEffect(() => {
  const fetchOverallStock = async () => {
    try {
      const res = await fetch(`${API_BASE}/view-overall-stock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role_id: roleId }),
      });
      const data = await res.json();
      if (data.success) {
        setOverallStock(data.data);
      } else {
        console.error("Failed to fetch stock:", data.message);
      }
    } catch (err) {
      console.error("Error fetching stock:", err);
    }
  };

  fetchOverallStock();
}, []);


  const [issuingBalance, setIssuingBalance] = useState({}); // Track which SIN is being processed
  const handleIssueBalance = async (sinRecord) => {
  if (!sinRecord.balance || sinRecord.balance <= 0) {
    displayPopup("No balance quantity to issue", "error");
    return;
  }

  setIssuingBalance(prev => ({ ...prev, [sinRecord.sin_no]: true }));

  try {
    const payload = {
      role_id: roleId,
      sin_no: sinRecord.sin_no,
      qty_issued: Number(sinRecord.balance), // Issue the entire balance
      authorized_by: "Stores Incharge",
      stores_ic: "Balance Issued",
      received_by: "Production",
    };

    const res = await fetch(`${API_BASE}/update-sin`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();

    if (data.success) {
      displayPopup(`Balance quantity issued successfully for ${sinRecord.sin_no}`, "success");
      fetchSinRecords(); // Refresh the data
    } else {
      displayPopup(data.message || "Failed to issue balance quantity", "error");
    }
  } catch (err) {
    console.error("Error issuing balance:", err);
    displayPopup("Something went wrong", "error");
  } finally {
    setIssuingBalance(prev => ({ ...prev, [sinRecord.sin_no]: false }));
  }
};
  
  const [filterType, setFilterType] = useState("");
  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");
  const [date, setDate] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [startMonth, setStartMonth] = useState("");
  const [endMonth, setEndMonth] = useState("");
  const [startYear, setStartYear] = useState("");
  const [endYear, setEndYear] = useState("");
  const [filterLoading, setFilterLoading] = useState(false);

  const displayPopup = (text, type = "success") => {
    setPopupMessage({ text, type });
    setShowPopup(true);
    setTimeout(() => setShowPopup(false), 10000);
  };

  const handleClosePopup = () => {
    setShowPopup(false);
    setPopupMessage({ text: "", type: "" });
  };

  function formatDate(datetimeString) {
  if (!datetimeString) return "";
  return datetimeString.split(" ")[0];
}

  const fetchSinRecords = async () => {
    try {
      setDataLoading(true);
      const res = await fetch(`${API_BASE}/view-sin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roleId }),
      });
      const data = await res.json();
      if (data.success) {
        setSinRecords(data.data);
        setFilteredRecords(data.data);
      } else {
        setSinRecords([]);
        setFilteredRecords([]);
        displayPopup("Failed to fetch SIN records", "error");
      }
    } catch (error) {
      console.error("Error fetching SIN records:", error);
      displayPopup("Error fetching SIN records", "error");
    } finally {
      setDataLoading(false);
    }
  };

  useEffect(() => {
    fetchSinRecords();
  }, []);

  const handleCreateChange = (e) =>
    setFormCreate({ ...formCreate, [e.target.name]: e.target.value });

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setCreateLoading(true);
    try {
      const payload = {
        role_id: roleId,
        admin_id: adminId,
        component_name: formCreate.component_name,
        uom: formCreate.uom,
        qty_requested: Number(formCreate.qty_requested),
        remarks: formCreate.remarks,
      };

      const res = await fetch(`${API_BASE}/create-sin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (data.success) {
        displayPopup(`SIN Created Successfully! (${data.sin_no})`, "success");
        fetchSinRecords();
        setFormCreate({
          component_name: "",
          uom: "",
          qty_requested: "",
          remarks: "",
        });
        setLatestRecord({
          sin_no: data.sin_no,
          issued_by: data.issued_by,
          authorized_by: data.authorized_by,
          received_by: data.received_by,
        });
      } else {
        displayPopup(data.message || "Failed to create SIN", "error");
      }
    } catch (err) {
      console.error("Error creating SIN:", err);
      displayPopup("Something went wrong", "error");
    } finally {
      setCreateLoading(false);
    }
  };

  const handleUpdateChange = (e) =>
    setFormUpdate({ ...formUpdate, [e.target.name]: e.target.value });

  const handleUpdateSubmit = async (e) => {
    e.preventDefault();
    setUpdateLoading(true);
    try {
      if (!formUpdate.sin_no || !formUpdate.qty_issued) {
        displayPopup("Select a SIN and enter issued quantity.", "error");
        return;
      }

      const payload = {
        role_id: roleId,
        sin_no: formUpdate.sin_no,
        qty_issued: Number(formUpdate.qty_issued),
        authorized_by: "Stores Incharge",
        stores_ic: "Updated",
        received_by: "Production",
      };

      const res = await fetch(`${API_BASE}/update-sin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (data.success) {
        if (data.partial_issue) {
          displayPopup(data.message || "Partial issue processed successfully!", "warning");
        } else {
          displayPopup(data.message || "SIN Updated Successfully!", "success");
        }
        fetchSinRecords();
        setFormUpdate({ sin_no: "", qty_issued: "" });
        setLatestRecord(data.data);
      } else {
        displayPopup(data.message || "Failed to update SIN", "error");
      }
    } catch (err) {
      console.error("Error updating SIN:", err);
      displayPopup("Something went wrong", "error");
    } finally {
      setUpdateLoading(false);
    }
  };

  const handleExcelFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setExcelFile(file);
      handleExcelUpload(file);
    }
  };

  const handleExcelUpload = async (file) => {
    const formData = new FormData();
    formData.append("excel_file", file);
    formData.append("role_id", roleId);
    formData.append("admin_id", adminId);

    try {
      setExcelLoading(true);
      const response = await axios.post(`${API_BASE}/upload-sin-excel`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (response.data.success) {
        displayPopup(
          response.data.message ||
            `Excel uploaded successfully! (${response.data.created_sins?.length || 0} SINs created)`,
          "success"
        );
        fetchSinRecords();
      } else {
        displayPopup(response.data.error || "Failed to upload Excel", "error");
      }
    } catch (error) {
      console.error("Excel upload error:", error);
      displayPopup("Error uploading Excel", "error");
    } finally {
      setExcelLoading(false);
    }
  };

 
  const handleFilter = async () => {
    if (!filterType) {
      displayPopup("Please select a filter type", "error");
      return;
    }

    try {
      setFilterLoading(true);
      const payload = {};

      switch (filterType) {
        case "date":
          if (!date) {
            displayPopup("Please select a specific date", "error");
            return;
          }
          payload.date = date;
          break;

        case "month":
          if (!month) {
            displayPopup("Please select a month", "error");
            return;
          }
          payload.month = new Date(month).getMonth() + 1;
          payload.year = new Date(month).getFullYear();
          break;

        case "year":
          if (!year) {
            displayPopup("Please enter a year", "error");
            return;
          }
          payload.year = year;
          break;

        case "dateRange":
          if (!startDate || !endDate) {
            displayPopup("Please select start and end date", "error");
            return;
          }
          payload.start_date = startDate;
          payload.end_date = endDate;
          break;

        case "monthRange":
          if (!startMonth || !endMonth) {
            displayPopup("Please select start and end month", "error");
            return;
          }
          payload.start_month = new Date(startMonth).getMonth() + 1;
          payload.end_month = new Date(endMonth).getMonth() + 1;
          payload.year = new Date(startMonth).getFullYear();
          break;

        case "yearRange":
          if (!startYear || !endYear) {
            displayPopup("Please enter start and end year", "error");
            return;
          }
          payload.start_year = startYear;
          payload.end_year = endYear;
          break;

        default:
          displayPopup("Invalid filter type selected", "error");
          return;
      }

      const response = await axios.post(`${API_BASE}/filter-sin`, payload);

      if (response.data.success) {
        const filteredData = response.data.data || [];
        setFilteredRecords(filteredData);
        setIsFilterApplied(true);

        if (filteredData.length === 0) {
          displayPopup("No records found for selected filter", "error");
        } else {
          displayPopup("Filter applied successfully!", "success");
        }
      } else {
        displayPopup(response.data.message || "Failed to apply filter", "error");
        setFilteredRecords([]);
        setIsFilterApplied(false);
      }
    } catch (err) {
      console.error("Filter error:", err);
      displayPopup("Error applying filter", "error");
      setFilteredRecords([]);
      setIsFilterApplied(false);
    } finally {
      setFilterLoading(false);
      setCurrentPage(1);
    }
  };

  
  const handleClearFilter = () => {
    setFilterType("");
    setMonth("");
    setYear("");
    setDate("");
    setStartDate("");
    setEndDate("");
    setStartMonth("");
    setEndMonth("");
    setStartYear("");
    setEndYear("");
    setFilteredRecords(sinRecords);
    setIsFilterApplied(false);
    displayPopup("Filters cleared", "success");
    setCurrentPage(1);
  };

  const activeRecords = isFilterApplied ? filteredRecords : sinRecords;
  const totalRequested = activeRecords.reduce((sum, r) => sum + (Number(r.qty_requested) || 0), 0);
  const totalIssued = activeRecords.reduce((sum, r) => sum + (Number(r.qty_issued) || 0), 0);
  const totalBalance = activeRecords.reduce((sum, r) => sum + (Number(r.balance) || 0), 0);

  const stats = [
    { title: "Total Requested", value: totalRequested, icon: Clipboard, iconClass: "blue" },
    { title: "Total Issued", value: totalIssued, icon: TrendingUp, iconClass: "emerald" },
    { title: "Total Balance", value: totalBalance, icon: BarChart3, iconClass: "purple" },
  ];

  const indexOfLastRecord = currentPage * recordsPerPage;
  const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
  const currentRecords = activeRecords.slice(indexOfFirstRecord, indexOfLastRecord);
  const totalPages = Math.ceil(activeRecords.length / recordsPerPage);

  const goToFirstPage = () => setCurrentPage(1);
  const goToLastPage = () => setCurrentPage(totalPages);
  const nextPage = () => setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  const prevPage = () => setCurrentPage((prev) => Math.max(prev - 1, 1));

  const canCreate = ["admin", "production incharge"].includes(roleType);
  const canUpdate = ["admin", "stores incharge"].includes(roleType);

  const hasStockAvailable = (sinRecord) => {
  const stockItem = overallStock.find(
    (s) =>
      s.component_name.toLowerCase() === sinRecord.component_name.toLowerCase() &&
      s.uom.toLowerCase() === sinRecord.uom.toLowerCase()
  );
  return stockItem && stockItem.total_quantity > 0;
};

const refreshOverallStock = async () => {
  try {
    const res = await fetch(`${API_BASE}/view-overall-stock`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role_id: roleId }),
    });
    const data = await res.json();
    if (data.success) {
      setOverallStock(data.data);
    } else {
      console.error("Failed to refresh overall stock:", data.message);
    }
  } catch (err) {
    console.error("Error refreshing overall stock:", err);
  }
};


const openIssueModal = (record) => {
  setSelectedRecord(record);
  setIssueQty("");
  setShowIssueModal(true);
};

const closeIssueModal = () => {
  setShowIssueModal(false);
  setSelectedRecord(null);
  setIssueQty("");
};

const handleConfirmIssue = async () => {
  if (!issueQty || issueQty <= 0) {
    displayPopup("Enter a valid issue quantity", "error");
    return;
  }
  if (issueQty > selectedRecord.balance) {
    displayPopup("Issue quantity cannot exceed balance", "error");
    return;
  }

  const stockItem = overallStock.find(
    (s) =>
      s.component_name.toLowerCase() === selectedRecord.component_name.toLowerCase() &&
      s.uom.toLowerCase() === selectedRecord.uom.toLowerCase()
  );

  if (!stockItem || stockItem.total_quantity < issueQty) {
    displayPopup("Insufficient stock in overall stock", "error");
    return;
  }

  setIssuingBalance((prev) => ({ ...prev, [selectedRecord.sin_no]: true }));

  try {
    const payload = {
      role_id: roleId,
      sin_no: selectedRecord.sin_no,
      qty_issued: Number(issueQty),
      authorized_by: "Stores Incharge",
      stores_ic: "Manual Issue",
      received_by: "Production",
    };

    const res = await fetch(`${API_BASE}/update-sin`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();

    if (data.success) {
      displayPopup(`Issued ${issueQty} successfully for ${selectedRecord.sin_no}`, "success");
      fetchSinRecords();
      refreshOverallStock();
    } else {
      displayPopup(data.message || "Failed to issue", "error");
    }
  } catch (err) {
    console.error("Error issuing:", err);
    displayPopup("Something went wrong", "error");
  } finally {
    setIssuingBalance((prev) => ({ ...prev, [selectedRecord.sin_no]: false }));
    closeIssueModal();
  }
};


  return (
    <div className="roles-page-container">
      <RolesHeader />
      {showPopup && (
        <div className="role-popup">
          <PopupMessage
            message={popupMessage.text}
            type={popupMessage.type}
            onClose={handleClosePopup}
          />
        </div>
      )}
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
                  <p>Loading SIN data...</p>
                </div>
              </div>
            ) : (
              <>
               
                <div className="dmrr-header">
                  <div className="dmrr-header-content">
                    <div className="dmrr-title-section">
                      <div className="dmrr-icon-container">
                        <FileText size={32} color="white" />
                      </div>
                      <div>
                        <h1 className="dmrr-title">Store Issue Note (SIN)</h1>
                        <p className="dmrr-subtitle">
                          {canCreate || canUpdate
                            ? "Manage Store Issue Notes"
                            : "You do not have permission to access SINs"}
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

               
                {canCreate || canUpdate ? (
                  <>
                    {canCreate && (
                      <div className="dmrr-form-container">
                        <div className="dmrr-form-header">
                          <h2 className="dmrr-form-title">
                            <Plus size={24} /> Create New SIN
                          </h2>
                        </div>
                        <form className="dmrr-form" onSubmit={handleCreateSubmit}>
                          <div className="dmrr-form-grid">
                            <div className="dmrr-form-field">
                              <label className="dmrr-form-label">
                                <Hash size={16} /> Component Name <span className="required-asterisk">*</span>
                              </label>
                              <input
                                name="component_name"
                                value={formCreate.component_name}
                                onChange={handleCreateChange}
                                required
                                className="dmrr-form-input"
                              />
                            </div>
                            <div className="dmrr-form-field">
                              <label className="dmrr-form-label">
                                <Hash size={16} /> UOM <span className="required-asterisk">*</span>
                              </label>
                              <input
                                name="uom"
                                value={formCreate.uom}
                                onChange={handleCreateChange}
                                required
                                className="dmrr-form-input"
                              />
                            </div>
                            <div className="dmrr-form-field">
                              <label className="dmrr-form-label">
                                <Hash size={16} /> Qty Requested <span className="required-asterisk">*</span>
                              </label>
                              <input
                                name="qty_requested"
                                type="number"
                                value={formCreate.qty_requested}
                                onChange={handleCreateChange}
                                required
                                className="dmrr-form-input"
                              />
                            </div>
                            <div className="dmrr-form-field">
                              <label className="dmrr-form-label">
                                <Hash size={16} /> Remarks
                              </label>
                              <input
                                name="remarks"
                                value={formCreate.remarks}
                                onChange={handleCreateChange}
                                className="dmrr-form-input"
                              />
                            </div>
                          </div>
                          <div className="dmrr-form-actions">
                            <button
                              type="submit"
                              className="dmrr-submit-btn"
                              disabled={createLoading}
                            >
                              <Plus size={20} /> {createLoading ? "Creating..." : "Create"}
                            </button>
                            <label className="dmrr-submit-btn">
                              <Upload size={16} />
                              {excelLoading ? "Uploading..." : "Upload Excel"}
                              <input
                                type="file"
                                accept=".xlsx, .xls"
                                onChange={handleExcelFileChange}
                                style={{ display: "none" }}
                              />
                            </label>
                          </div>
                        </form>
                      </div>
                    )}

                    {canUpdate && (
                      <div className="dmrr-form-container">
                        <div className="dmrr-form-header">
                          <h2 className="dmrr-form-title">
                            <Plus size={24} /> Issue SIN
                          </h2>
                        </div>
                        <form className="dmrr-form" onSubmit={handleUpdateSubmit}>
                          <div className="dmrr-form-grid">
                            <div className="dmrr-form-field">
                              <label className="dmrr-form-label">
                                <Hash size={16} /> Select SIN<span className="required-asterisk">*</span>
                              </label>
                              <select
                                name="sin_no"
                                value={formUpdate.sin_no}
                                onChange={handleUpdateChange}
                                className="dmrr-form-input"
                              >
                                <option value="">Select SIN</option>
                                {activeRecords.map((r, i) => (
                                  <option key={i} value={r.sin_no}>
                                    {r.sin_no} — {r.component_name}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div className="dmrr-form-field">
                              <label className="dmrr-form-label">
                                <Hash size={16} /> Qty Issued <span className="required-asterisk">*</span>
                              </label>
                              <input
                                name="qty_issued"
                                type="number"
                                value={formUpdate.qty_issued}
                                onChange={handleUpdateChange}
                                required
                                className="dmrr-form-input"
                              />
                            </div>
                          </div>
                          <div className="dmrr-form-actions">
                            <button
                              type="submit"
                              className="dmrr-submit-btn"
                              disabled={updateLoading}
                            >
                              <Plus size={20} /> {updateLoading ? "Updating..." : "Update"}
                            </button>
                          </div>
                        </form>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="dmrr-no-permission">
                    <h3 className="no-permission-heading">
                       🚫 You don't have permission to access SINs
                    </h3>
                    <p>
                      Please contact the <strong>Production</strong> or{" "}
                      <strong>Stores Incharge</strong> if you need access.
                    </p>
                  </div>
                )}

                 
             
                <div className="dmrr-filter-container">
                  <h3><Filter size={18}/> Filter SIN Records</h3>

                  <div className="dmrr-filter-fields">
                    <div>
                      <label>Filter Type</label>
                      <select
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}
                      >
                        <option value="">-- Select Filter Type --</option>
                        <option value="date">Specific Date</option>
                        <option value="month">Month</option>
                        <option value="year">Year</option>
                        <option value="dateRange">Date Range</option>
                        <option value="monthRange">Month Range</option>
                        <option value="yearRange">Year Range</option>
                      </select>
                    </div>

                    
                    {filterType === "date" && (
                      <div>
                        <label>Select Date</label>
                        <input 
                          type="date" 
                          value={date} 
                          onChange={(e) => setDate(e.target.value)} 
                        />
                      </div>
                    )}

                    {filterType === "month" && (
                      <div>
                        <label>Select Month</label>
                        <input 
                          type="month" 
                          value={month} 
                          onChange={(e) => setMonth(e.target.value)} 
                        />
                      </div>
                    )}

                    {filterType === "year" && (
                      <div>
                        <label>Enter Year</label>
                        <input
                          type="number"
                          value={year}
                          onChange={(e) => setYear(e.target.value)}
                          placeholder="e.g. 2025"
                          min="2000"
                          max="2100"
                        />
                      </div>
                    )}

                    {filterType === "dateRange" && (
                      <>
                        <div>
                          <label>Start Date</label>
                          <input 
                            type="date" 
                            value={startDate} 
                            onChange={(e) => setStartDate(e.target.value)} 
                          />
                        </div>
                        <div>
                          <label>End Date</label>
                          <input 
                            type="date" 
                            value={endDate} 
                            onChange={(e) => setEndDate(e.target.value)} 
                          />
                        </div>
                      </>
                    )}

                    {filterType === "monthRange" && (
                      <>
                        <div>
                          <label>Start Month</label>
                          <input 
                            type="month" 
                            value={startMonth} 
                            onChange={(e) => setStartMonth(e.target.value)} 
                          />
                        </div>
                        <div>
                          <label>End Month</label>
                          <input 
                            type="month" 
                            value={endMonth} 
                            onChange={(e) => setEndMonth(e.target.value)} 
                          />
                        </div>
                      </>
                    )}

                    {filterType === "yearRange" && (
                      <>
                        <div>
                          <label>Start Year</label>
                          <input 
                            type="number" 
                            value={startYear} 
                            onChange={(e) => setStartYear(e.target.value)} 
                            placeholder="YYYY" 
                          />
                        </div>
                        <div>
                          <label>End Year</label>
                          <input 
                            type="number" 
                            value={endYear} 
                            onChange={(e) => setEndYear(e.target.value)} 
                            placeholder="YYYY" 
                          />
                        </div>
                      </>
                    )}

                    <div className="dmrr-filter-buttons">
                      <button onClick={handleFilter} disabled={filterLoading}>
                        {filterLoading ? "Filtering..." : "Apply Filter"}
                      </button>
                      <button onClick={handleClearFilter}>Clear</button>
                    </div>
                  </div>
                </div>


                
                <div className="dmrr-table-container">
                  <div className="dmrr-table-header">
                    <h2 className="dmrr-table-title">
                      <Package size={20} /> SIN Records
                    </h2>
                  </div>
                  <div className="dmrr-table-wrapper">
                    <table className="dmrr-table">
                      <thead className="dmrr-table-head">
                        <tr>
                          <th>SIN No</th>
                          <th>Date</th>
                          <th>Component</th>
                          <th>UOM</th>
                          <th>Requested</th>
                          <th>Issued</th>
                          <th>Balance</th>
                          <th>Issue Balance</th> 
                          <th>Remarks</th>
                          <th>Issued By</th>
                          <th>Authorized By</th>
                          <th>Received By</th>
                        </tr>
                      </thead>
                     {currentRecords.length === 0 ? (
  <div className="no-records-message">
    {isFilterApplied ? (
      <p>No records found for the selected filter.</p>
    ) : (
      <div className="full-page-loading">
        <div className="loading-content">
          <ClipLoader size={45} color="#4450A2" />
          <p>Loading...</p>
        </div>
      </div>
    )}
  </div>
) : (
  <tbody className="dmrr-table-body">
    {currentRecords.map((r, i) => (
      <tr key={i} className="dmrr-table-row">
        <td>{r.sin_no}</td>
        <td>{formatDate(r.created_on)}</td>
        <td>{r.component_name}</td>
        <td>{r.uom}</td>
        <td>{r.qty_requested}</td>
        <td>{r.qty_issued}</td>
        <td>{r.balance}</td>
        <td>
          {canUpdate ? (
            <button
              onClick={() => r.balance > 0 && openIssueModal(r)}
              disabled={
                issuingBalance[r.sin_no] ||
                !hasStockAvailable(r) ||
                r.balance === 0 ||
                 r.qty_issued === 0  
              }
              className={`issue-balance-btn ${
                issuingBalance[r.sin_no] || !hasStockAvailable(r) || r.balance === 0
                  ? "disabled"
                  : ""
              }`}
              title={
                 r.qty_issued === 0
                  ? "Use Issue SIN form for first issuance"
                 : r.balance === 0
                  ? "All requested quantity issued"
                  : !hasStockAvailable(r)
                  ? "No stock available to issue"
                  : "Issue remaining balance quantity"
              }
            >
              {issuingBalance[r.sin_no] ?( 
                <FaSpinner className="spin-icon" />
              ):(
                <GoIssueTrackedBy /> 
              )
              }
            </button>
          ):(
            <span className="sin-dash">-</span>  
          )}
        </td>


        <td>{r.remarks}</td>
        <td>{r.issued_by}</td>
        <td>{r.authorized_by}</td>
        <td>{r.received_by}</td>
      </tr>
    ))}
  </tbody>
)}

                    </table>

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
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      {showIssueModal && selectedRecord && (
  <div className="issue-modal-overlay">
    <div className="issue-modal">
      <h3 className="sin-modal-header">Issue Quantity for </h3>
      <h3 className="sin-modal-header">{selectedRecord.component_name}</h3>
      <p>
        <strong>UOM:</strong> {selectedRecord.uom}
      </p>
      <p>
        <strong>Balance to issue:</strong> {selectedRecord.balance}
      </p>
      <p>
        <strong>Available in Overall Stock:</strong>{" "}
        {
          overallStock.find(
            (s) =>
              s.component_name.toLowerCase() ===
                selectedRecord.component_name.toLowerCase() &&
              s.uom.toLowerCase() === selectedRecord.uom.toLowerCase()
          )?.total_quantity || 0
        }
      </p>
      
      <label >Enter Quantity to Issue</label>
      <div className="dmrr-filter-fields">
      <input
        type="number"
        value={issueQty}
        onChange={(e) => setIssueQty(e.target.value)}
        min="1"
        max={selectedRecord.balance}
      />
      </div>
      <div className="sin-model-buttons">
        <button onClick={handleConfirmIssue} disabled={issuingBalance[selectedRecord.sin_no]}>
          {issuingBalance[selectedRecord.sin_no] ? "Issuing..." : "Confirm Issue"}
        </button>
        <button onClick={closeIssueModal}>Cancel</button>
      </div>
    </div>
  </div>
)}

    </div>
  );
};

export default SINPage;