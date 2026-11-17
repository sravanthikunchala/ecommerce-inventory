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
import axios from "axios";
import API_BASE_URL from "../../config";
import PopupMessage from "../../components/Popup/Popup";
import { ClipLoader } from "react-spinners";

const MTNPage = () => {
  const [mtnRecords, setMtnRecords] = useState([]);
  const [filteredRecords, setFilteredRecords] = useState([]);
  const [isFilterApplied, setIsFilterApplied] = useState(false);

  const [form, setForm] = useState({
    item: "",
    uom: "",
    qtyTransferred: "",
    remarks: "",
  });

  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [excelFile, setExcelFile] = useState(null);
  const [excelLoading, setExcelLoading] = useState(false);
  const [filterLoading, setFilterLoading] = useState(false);

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

  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 10;

  const [popupMessage, setPopupMessage] = useState({ text: "", type: "" });
  const [showPopup, setShowPopup] = useState(false);

  const [roleId, setRoleId] = useState(null);
  const [roleType, setRoleType] = useState("");

  useEffect(() => {
    const storedRoleId = sessionStorage.getItem("roleId");
    const storedRoleType = sessionStorage.getItem("roleType");

    if (storedRoleId) {
      setRoleId(storedRoleId);
      setRoleType(storedRoleType || "");
      
    } else {
      console.warn("⚠️ No roleId found in sessionStorage — please login again.");
    }

    fetchMTNRecords();
  }, []);

  const displayPopup = (text, type = "error", duration = 10000) => {
    setPopupMessage({ text, type });
    setShowPopup(true);
    setTimeout(() => setShowPopup(false), duration);
  };

  const fetchMTNRecords = async () => {
    setDataLoading(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/view-material-transfer-notes`);
      if (response.data.success) {
        setMtnRecords(response.data.data);
      } else {
        displayPopup(response.data.error || "Failed to load MTN records");
      }
    } catch (err) {
      displayPopup(err.response?.data?.error || "Error fetching MTN records", "error");
    } finally {
      setDataLoading(false);
    }
  };

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!roleId) {
      displayPopup("Role ID missing. Please login again.", "error");
      return;
    }

   if (roleType !== "production incharge" && roleType !== "Admin") {
      displayPopup("Only Production Incharge can create MTN.", "error", 10000);
      return;
    }

    const payload = {
      role_id: parseInt(roleId),
      items: [
        {
          item_name: form.item,
          uom: form.uom,
          qty_transferred: form.qtyTransferred,
          remarks: form.remarks,
        },
      ],
    };

    

    try {
      setLoading(true);
      const response = await axios.post(`${API_BASE_URL}/add-material-transfer-note`, payload);
      

      if (response.data.success) {
        displayPopup("MTN added successfully!", "success");
        setForm({ item: "", uom: "", qtyTransferred: "", remarks: "" });
        fetchMTNRecords();
      } else {
        displayPopup(response.data.error || "Failed to add MTN", "error");
      }
    } catch (err) {
      console.error("❌ Error while adding MTN:", err);
      displayPopup(err.response?.data?.error || "Unexpected error while adding MTN", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setExcelFile(e.target.files[0]);
      handleExcelUpload(e.target.files[0]);
    }
  };

  const handleExcelUpload = async (file) => {
    if (!roleId) {
      displayPopup("Role ID missing. Please login again.", "error");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("role_id", roleId);

    try {
      setExcelLoading(true);
      const response = await axios.post(`${API_BASE_URL}/upload-mtn-excel`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (response.data.success) {
        displayPopup(response.data.message || "Excel uploaded successfully!", "success", 10000);
        const newMTN = {
          mtn_no: response.data.mtn_no || "N/A",
          created_at: new Date().toISOString(),
          issued_by: response.data.data?.issued_by || "N/A",
          authorized_by: response.data.data?.authorized_by || "N/A",
          received_by: response.data.data?.received_by || "N/A",
           items: response.data.created_items || [],
        };
        setMtnRecords((prev) => [newMTN, ...prev]);
      } else {
        displayPopup(response.data.error || "Failed to upload Excel", "error");
      }
    } catch (err) {
      displayPopup(err.response?.data?.error || "Error uploading Excel", "error");
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
          if (!date) return displayPopup("Please select a specific date", "error");
          payload.date = date;
          break;
        case "month":
          if (!month) return displayPopup("Please select a month", "error");
          payload.month = month.split("-")[1]; 
          payload.year = month.split("-")[0]; 
          break;
        case "year":
          if (!year) return displayPopup("Please enter a year", "error");
          payload.year = year;
          break;
        case "dateRange":
          if (!startDate || !endDate) return displayPopup("Please select start and end date", "error");
          payload.start_date = startDate;
          payload.end_date = endDate;
          break;
     case "monthRange":
  if (!startMonth || !endMonth)
    return displayPopup("Please select start and end month", "error");

  payload.start_month = parseInt(startMonth.split("-")[1]); 
  payload.end_month = parseInt(endMonth.split("-")[1]);     
      
  break;

        case "yearRange":
          if (!startYear || !endYear) return displayPopup("Please enter start and end year", "error");
          payload.start_year = startYear;
          payload.end_year = endYear;
          break;
        default:
          return displayPopup("Invalid filter type selected", "error");
      }

      const response = await axios.post(`${API_BASE_URL}/filter-material-transfer-notes`, payload);

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
        displayPopup(response.data.error || "Failed to apply filter", "error");
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
    displayPopup("Filters cleared", "success");
  };

  const activeRecords = isFilterApplied ? filteredRecords : mtnRecords;

  const indexOfLastRecord = currentPage * recordsPerPage;
  const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
  const currentRecords = activeRecords.slice(indexOfFirstRecord, indexOfLastRecord);
  const totalPages = Math.ceil(activeRecords.length / recordsPerPage);

  const goToFirstPage = () => setCurrentPage(1);
  const goToLastPage = () => setCurrentPage(totalPages);
  const nextPage = () => setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  const prevPage = () => setCurrentPage((prev) => Math.max(prev - 1, 1));

  const totalRecords = mtnRecords.length;
  const totalTransferred = mtnRecords.reduce(
    (sum, r) => sum + r.items.reduce((innerSum, item) => innerSum + Number(item.qty_transferred || 0), 0),
    0
  );
  const stats = [
    { title: "Total Records", value: totalRecords.toString(), icon: Clipboard, iconClass: "blue" },
    { title: "Total Qty Transferred", value: totalTransferred.toString(), icon: Package, iconClass: "amber" },
    {
      title: "With Remarks",
      value: mtnRecords.filter((r) => r.items.some((item) => item.remarks && item.remarks.trim() !== "")).length.toString(),
      icon: TrendingUp,
      iconClass: "emerald",
    },
    {
      title: "Last Entry",
      value: mtnRecords.length ? new Date(mtnRecords[0].created_at).toLocaleDateString() : "-",
      icon: BarChart3,
      iconClass: "purple",
    },
  ];

  return (
    <div className="roles-page-container">
      <RolesHeader />
      <div className="roles-page-body">
        <div className="roles-sidebar">
          <RolesSideMenu />
        </div>
        <div className="roles-main-content">
          <div className="dmrr-container">
             {showPopup && (
                    <PopupMessage
                        message={popupMessage.text}
                        type={popupMessage.type}
                        onClose={() => setShowPopup(false)}
                    />
                )}

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
                        <h1 className="dmrr-title">Material Transfer Note (MTN)</h1>
                        <p className="dmrr-subtitle">Overview of all MTN records and quantities transferred</p>
                      </div>
                    </div>
                    <div className="dmrr-date-section">
                      <p className="dmrr-date-label">Today's Date</p>
                      <p className="dmrr-date-value">
                        {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="dmrr-stats-grid">
                  {stats.map((stat, i) => (
                    <div key={i} className="dmrr-stat-card">
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

               {roleType === "production incharge" || roleType === "Admin" ? (
  <div className="dmrr-form-container">
    <div className="dmrr-form-header">
      <h2 className="dmrr-form-title">
        <Plus size={24} /> Add Material Transfer Note (MTN)
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
            <Hash size={16} /> Qty Transferred <span className="required-asterisk">*</span>
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
            <Hash size={16} /> Remarks
          </label>
          <input
            name="remarks"
            value={form.remarks}
            onChange={handleChange}
            className="dmrr-form-input"
          />
        </div>
      </div>
      <div className="dmrr-form-actions">
        <button type="submit" className="dmrr-submit-btn" disabled={loading}>
          <Plus size={20} /> {loading ? "Submitting..." : "Add MTN"}
        </button>
        <label className="dmrr-submit-btn">
          <Upload size={16} />
          {excelLoading ? "Uploading..." : "Upload Excel"}
          <input
            type="file"
            accept=".xlsx, .xls"
            onChange={handleFileChange}
            style={{ display: "none" }}
          />
        </label>
      </div>
    </form>
  </div>
) : (
  <div className="dmrr-no-permission">
    <h3 className="no-permission-heading">🚫 You don't have permission to access MTNs</h3>
    <p>
      Please contact the <strong>Production Incharge</strong> if you need access.
    </p>
  </div>
)}

                
                <div className="dmrr-filter-container">
                  <h3><Filter size={18}/> Filter MTN Records</h3>
                  <div className="dmrr-filter-fields">
                    <div>
                      <label>Filter Type</label>
                      <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
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
                        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                      </div>
                    )}
                    {filterType === "month" && (
                      <div>
                        <label>Select Month</label>
                        <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
                      </div>
                    )}
                    {filterType === "year" && (
                      <div>
                        <label>Enter Year</label>
                        <input type="number" value={year} onChange={(e) => setYear(e.target.value)} placeholder="e.g. 2025" min="2000" max="2100" />
                      </div>
                    )}
                    {filterType === "dateRange" && (
                      <>
                        <div>
                          <label>Start Date</label>
                          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                        </div>
                        <div>
                          <label>End Date</label>
                          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                        </div>
                      </>
                    )}
                    {filterType === "monthRange" && (
                      <>
                        <div>
                          <label>Start Month</label>
                          <input type="month" value={startMonth} onChange={(e) => setStartMonth(e.target.value)} />
                        </div>
                        <div>
                          <label>End Month</label>
                          <input type="month" value={endMonth} onChange={(e) => setEndMonth(e.target.value)} />
                        </div>
                      
                      </>
                    )}
                    {filterType === "yearRange" && (
                      <>
                        <div>
                          <label>Start Year</label>
                          <input type="number" value={startYear} onChange={(e) => setStartYear(e.target.value)} placeholder="YYYY" />
                        </div>
                        <div>
                          <label>End Year</label>
                          <input type="number" value={endYear} onChange={(e) => setEndYear(e.target.value)} placeholder="YYYY" />
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
                      <Package size={20} /> MTN [Material Transfer Notes]
                    </h2>
                  </div>
                  <div className="dmrr-table-wrapper">
                    <table className="dmrr-table">
                      <thead className="dmrr-table-head">
                        <tr>
                          <th>MTN No</th>
                          <th>Date</th>
                          <th>Item(s)</th>
                          <th>UOM</th>
                          <th>Qty Transferred</th>
                          <th>Remarks</th>
                          <th>Issued By</th>
                          <th>Authorized By</th>
                          <th>Received By</th>
                        </tr>
                      </thead>
                     <tbody className="dmrr-table-body">
  {currentRecords.length > 0 ? (
    currentRecords.map((r, i) => (
      <tr key={i} className="dmrr-table-row">
        <td>{r.mtn_no || "N/A"}</td>
        <td>{r.created_at?.split(" ")[0] || "-"}</td>
        <td>{r.items?.map(it => it.item_name).join(", ")}</td>
        <td>{r.items?.map(it => it.uom).join(", ")}</td>
        <td>{r.items?.map(it => it.qty_transferred).join(", ")}</td>
        <td>{r.items?.map(it => it.remarks || "-").join(", ")}</td>
        <td>{r.issued_by || "N/A"}</td>
        <td>{r.authorized_by || "Pending"}</td>
        <td>{r.received_by || "N/A"}</td>
      </tr>
    ))
  ) : (
    <tr>
      <td colSpan="9" style={{ textAlign: "center", padding: "20px", color: "#777" }}>
       No records found for selected filter
      </td>
    </tr>
  )}
</tbody>

                    </table>
                  </div>

                  <div className="pagination-container">
                    <button onClick={goToFirstPage} disabled={currentPage === 1}>First</button>
                    <button onClick={prevPage} disabled={currentPage === 1}>Previous</button>
                    <span>Page {currentPage} of {totalPages}</span>
                    <button onClick={nextPage} disabled={currentPage === totalPages}>Next</button>
                    <button onClick={goToLastPage} disabled={currentPage === totalPages}>Last</button>
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

export default MTNPage;