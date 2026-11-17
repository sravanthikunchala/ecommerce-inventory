import React, { useState, useEffect } from "react";
import {
  FileText,
  Plus,
  Hash,
  Package,
  Clipboard,
  TrendingUp,
  BarChart3,
  Upload,
  Filter,
} from "lucide-react";
import "../SIN/SinPage.css";
import RolesHeader from "../../components/RolesHeader/RolesHeader";
import RolesSideMenu from "../../components/RolesSideMenu/RolesSideMenu";
import API_BASE from "../../config";
import PopupMessage from "../../components/Popup/Popup";
import { ClipLoader } from "react-spinners";
import axios from "axios";

const MRNPage = () => {
  const [mrnRecords, setMrnRecords] = useState([]);
  const [stats, setStats] = useState({
    total_records: 0,
    total_qty_rejected: 0,
    with_remarks: 0,
    last_entry: "-",
  });
  const [form, setForm] = useState({
    item: "",
    uom: "",
    qtyTransferred: "",
    remarks: "",
    issued_by: "",
    received_by: "",
  });
  const [loading, setLoading] = useState(false);
  const [excelLoading, setExcelLoading] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });
  const [popupMessage, setPopupMessage] = useState({ text: "", type: "" });
  const [showPopup, setShowPopup] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);

  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 10;

  
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
  const [filteredRecords, setFilteredRecords] = useState([]);
  const [isFilterApplied, setIsFilterApplied] = useState(false);
  const [filterLoading, setFilterLoading] = useState(false);

  const admin_id = sessionStorage.getItem("admin_id");
  const role_name = sessionStorage.getItem("roleName") || "";
  const role_id = sessionStorage.getItem("roleId");
  const role_type = sessionStorage.getItem("roleType") || "";
  const isAllowedToCreateMRN = ["production incharge", "admin"].includes(
    role_type.toLowerCase()
  );

  function formatDate(datetimeString) {
  if (!datetimeString) return "";
  return datetimeString.split(" ")[0];
}

  const displayPopup = (text, type = "success") => {
    setPopupMessage({ text, type });
    setShowPopup(true);
    setTimeout(() => setShowPopup(false), 10000);
  };

  const handleClosePopup = () => {
    setShowPopup(false);
    setPopupMessage({ text: "", type: "" });
  };

  const fetchMRNRecords = async () => {
    try {
      setDataLoading(true);
      const res = await fetch(`${API_BASE}/view-material-rejection-notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ admin_id, role_id }),
      });
      const data = await res.json();
      if (data.success) {
        setMrnRecords(data.data);
        setStats(
          data.stats || {
            total_records: 0,
            total_qty_rejected: 0,
            with_remarks: 0,
            last_entry: "-",
          }
        );
      } else {
        setMrnRecords([]);
        setStats({
          total_records: 0,
          total_qty_rejected: 0,
          with_remarks: 0,
          last_entry: "-",
        });
      }
    } catch (error) {
      console.error("Error fetching MRN records:", error);
    } finally {
      setDataLoading(false);
    }
  };

  useEffect(() => {
    fetchMRNRecords();
  }, []);

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const payload = {
      mrn_no: `MRN-${Date.now()}`,
      issued_by: form.issued_by || role_name,
      received_by: form.received_by || "Store Incharge",
      admin_id,
      role_id,
      items: [
        {
          component_name: form.item,
          uom: form.uom,
          qty_rejected: Number(form.qtyTransferred),
          reason: form.remarks,
        },
      ],
    };

    try {
      const res = await fetch(`${API_BASE}/add-material-rejection-note`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        displayPopup("MRN added successfully!", "success");
        setForm({
          item: "",
          uom: "",
          qtyTransferred: "",
          remarks: "",
          issued_by: "",
          received_by: "",
        });
        fetchMRNRecords();
      } else {
        displayPopup(data.error || "Failed to add MRN", "error");
      }
    } catch (error) {
      console.error("Error adding MRN:", error);
      displayPopup("Something went wrong", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleExcelUpload = async (file) => {
    const formData = new FormData();
    formData.append("excel_file", file);
    formData.append("admin_id", admin_id);
    formData.append("role_id", role_id);

    try {
      setExcelLoading(true);
      const response = await axios.post(`${API_BASE}/upload-mrn-excel`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (response.data.success) {
        displayPopup(response.data.message || "Excel uploaded successfully!", "success");
        fetchMRNRecords();
      } else {
        displayPopup(response.data.error || "Failed to upload Excel", "error");
      }
    } catch (err) {
      console.error("Excel upload error:", err);
      displayPopup("Error uploading Excel", "error");
    } finally {
      setExcelLoading(false);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleExcelUpload(e.target.files[0]);
    }
  };

  const allItems =
    mrnRecords?.flatMap((record) =>
      (record.items || []).map((item) => ({
        ...item,
        mrn_no: record.mrn_no,
        created_at: record.created_at,
        issued_by: record.issued_by,
        received_by: record.received_by,
      }))
    ) || [];

  const activeRecords = isFilterApplied ? filteredRecords : allItems;

  
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

      const response = await axios.post(`${API_BASE}/filter-material-rejection-notes`, payload);

      if (response.data.success) {
        const filteredData = response.data.data?.flatMap(mrn =>
          (mrn.items || []).map(item => ({
            ...item,
            mrn_no: mrn.mrn_no,
            created_at: mrn.created_at,
            issued_by: mrn.issued_by,
            received_by: mrn.received_by,
          }))
        ) || [];

        setFilteredRecords(filteredData);
        setIsFilterApplied(true);
        setCurrentPage(1);

        if (filteredData.length === 0) {
          displayPopup("No records found for selected filter", "error");
        } else {
          displayPopup("Filter applied successfully!", "success");
        }
      } else {
        setFilteredRecords([]);
        setIsFilterApplied(false);
        displayPopup(response.data.error || "Failed to apply filter", "error");
      }
    } catch (err) {
      console.error("Filter error:", err);
      setFilteredRecords([]);
      setIsFilterApplied(false);
      displayPopup("Error applying filter", "error");
    } finally {
      setFilterLoading(false);
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
    setFilteredRecords([]);
    setIsFilterApplied(false);
    setCurrentPage(1);
    displayPopup("Filters cleared", "success");
  };

  const indexOfLastRecord = currentPage * recordsPerPage;
  const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
  const currentRecords = activeRecords.slice(indexOfFirstRecord, indexOfLastRecord);
  const totalPages = Math.ceil(activeRecords.length / recordsPerPage);

  const goToFirstPage = () => setCurrentPage(1);
  const goToLastPage = () => setCurrentPage(totalPages);
  const nextPage = () => setCurrentPage(prev => Math.min(prev + 1, totalPages));
  const prevPage = () => setCurrentPage(prev => Math.max(prev - 1, 1));

  const statsConfig = [
    {
      title: "Total Records",
      value: stats.total_records,
      icon: Clipboard,
      iconClass: "blue",
    },
    {
      title: "Total Qty Rejected",
      value: stats.total_qty_rejected,
      icon: Package,
      iconClass: "amber",
    },
    {
      title: "With Remarks",
      value: stats.with_remarks,
      icon: TrendingUp,
      iconClass: "emerald",
    },
    {
      title: "Last Entry",
      value: stats.last_entry
        ? new Date(stats.last_entry).toLocaleDateString()
        : "-",
      icon: BarChart3,
      iconClass: "purple",
    },
  ];

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
                  <p>Loading...</p>
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
                        <h1 className="dmrr-title">Material Rejection Note (MRN)</h1>
                        <p className="dmrr-subtitle">
                          Overview of all MRN records and quantities rejected
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
                  {statsConfig.map((stat, index) => (
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

                {isAllowedToCreateMRN ? (
                  <div className="dmrr-form-container">
                    <div className="dmrr-form-header">
                      <h2 className="dmrr-form-title">
                        <Plus size={24} /> Add New MRN Record
                      </h2>
                    </div>

                    <form className="dmrr-form" onSubmit={handleSubmit}>
                      <div className="dmrr-form-grid">
                        <div className="dmrr-form-field">
                          <label className="dmrr-form-label">
                            <Hash size={16} /> Item Name <span className="required-asterisk">*</span>
                          </label>
                          <input
                            name="item"
                            value={form.item}
                            onChange={handleChange}
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
                            value={form.uom}
                            onChange={handleChange}
                            required
                            className="dmrr-form-input"
                          />
                        </div>
                        <div className="dmrr-form-field">
                          <label className="dmrr-form-label">
                            <Hash size={16} /> Qty Rejected <span className="required-asterisk">*</span>
                          </label>
                          <input
                            name="qtyTransferred"
                            type="number"
                            value={form.qtyTransferred}
                            onChange={handleChange}
                            required
                            className="dmrr-form-input"
                          />
                        </div>
                        <div className="dmrr-form-field">
                          <label className="dmrr-form-label">
                            <Hash size={16} /> Remarks<span className="required-asterisk">*</span>
                          </label>
                          <input
                            name="remarks"
                            value={form.remarks}
                            onChange={handleChange}
                            className="dmrr-form-input"
                          />
                        </div>
                      </div>

                      <div
                        className="dmrr-form-actions"
                        style={{
                          display: "flex",
                          gap: "12px",
                          alignItems: "center",
                        }}
                      >
                        <button
                          type="submit"
                          className="dmrr-submit-btn"
                          disabled={loading}
                        >
                          {loading ? "Adding..." : " + Add MRN"}
                        </button>

                        <label className="dmrr-submit-btn">
                          <Upload size={16} />{" "}
                          {excelLoading ? "Uploading..." : "Upload Excel"}
                          <input
                            type="file"
                            accept=".xlsx, .xls"
                            onChange={handleFileChange}
                            style={{ display: "none" }}
                            disabled={excelLoading}
                          />
                        </label>
                      </div>

                      {message.text && (
                        <p
                          style={{
                            marginTop: "10px",
                            color:
                              message.type === "error" ? "red" : "green",
                          }}
                        >
                          {message.text}
                        </p>
                      )}
                    </form>
                  </div>
                ) : (
                  <div className="dmrr-no-permission">
                    <h3 className="no-permission-heading">
                      🚫 You don't have permission to create MRNs
                    </h3>
                    <p>
                      Please contact the <strong>Production Incharge</strong> if
                      you need to raise one.
                    </p>
                  </div>
                )}

                
                <div className="dmrr-filter-container">
                  <h3><Filter size={18}/> Filter MRN Records</h3>

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
                      <Package size={20} /> MRN Records
                    </h2>
                  </div>
                  <div className="dmrr-table-wrapper">
                    <table className="dmrr-table">
                      <thead className="dmrr-table-head">
                        <tr>
                          <th>S.No</th>
                          <th>MRN No</th>
                          <th>Date</th>
                          <th>Issued By</th>
                          <th>Received By</th>
                          <th>Item</th>
                          <th>UOM</th>
                          <th>Qty Rejected</th>
                          <th>Reason</th>
                        </tr>
                      </thead>
                      <tbody className="dmrr-table-body">
                        {currentRecords.length === 0 ? (
                          <tr>
                            <td colSpan="8" className="no-records-message">
                              {isFilterApplied ? (
                                <p>No records found for the selected filter.</p>
                              ) : (
                                <div className="loading-content">
                                  <ClipLoader size={45} color="#4450A2" />
                                  <p>Loading...</p>
                                </div>
                              )}
                            </td>
                          </tr>
                        ) : (
                          currentRecords.map((item, i) => (
                            <tr key={i} className="dmrr-table-row">
                              <td>{indexOfFirstRecord+i+1}</td>
                              <td>{item.mrn_no}</td>
                              <td>{formatDate(item.created_at)}</td>
                              <td>{item.issued_by}</td>
                              <td>{item.received_by}</td>
                              <td>{item.component_name}</td>
                              <td>{item.uom}</td>
                              <td>{item.qty_rejected}</td>
                              <td>{item.reason}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>

                    <div className="pagination-container">
                      <button onClick={goToFirstPage} disabled={currentPage === 1}>First</button>
                      <button onClick={prevPage} disabled={currentPage === 1}>Previous</button>
                      <span>Page {currentPage} of {totalPages}</span>
                      <button onClick={nextPage} disabled={currentPage === totalPages}>Next</button>
                      <button onClick={goToLastPage} disabled={currentPage === totalPages}>Last</button>
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

export default MRNPage;