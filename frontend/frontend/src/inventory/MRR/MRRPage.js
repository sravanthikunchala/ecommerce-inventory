import React, { useEffect, useState } from "react";
import axios from "axios";
import API_BASE_URL from "../../config";
import "../Dmrr/DmrrTable.css";
import RolesHeader from "../../components/RolesHeader/RolesHeader";
import RolesSideMenu from "../../components/RolesSideMenu/RolesSideMenu";
import { ClipLoader } from "react-spinners";
import { FileText, Package, Filter } from "lucide-react";

import PopupMessage from "../../components/Popup/Popup";

const MRRPage = () => {
  const [report, setReport] = useState([]);
  const [filteredReport, setFilteredReport] = useState([]);
  const [totalAcceptedQty, setTotalAcceptedQty] = useState(0);
  const [dataLoading, setDataLoading] = useState(true);
  const [filterLoading, setFilterLoading] = useState(false);
  const [popupMessage, setPopupMessage] = useState({ text: "", type: "" });
  const [showPopup, setShowPopup] = useState(false);
  const [isFilterApplied, setIsFilterApplied] = useState(false);

 
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
  const roleId = sessionStorage.getItem("roleId");

  function formatDate(datetimeString) {
  if (!datetimeString) return "";
  return datetimeString.split(" ")[0];
}

  const displayPopup = (text, type = "error", duration = 10000) => {
    setPopupMessage({ text, type });
    setShowPopup(true);
    setTimeout(() => setShowPopup(false), duration);
  };

  useEffect(() => {
    const fetchMRR = async () => {
      try {
        setDataLoading(true);
        const res = await axios.post(`${API_BASE_URL}/view-mrr-report`, { role_id: roleId });
        if (res.data.success) {
          setReport(res.data.mrr_list);
          setTotalAcceptedQty(res.data.total_accepted_quantity);
        }
      } catch (err) {
        displayPopup("Error fetching MRR report", "error");
        console.error(err);
      } finally {
        setDataLoading(false);
      }
    };
    fetchMRR();
  }, [roleId]);

  
  const handleFilter = async () => {
    if (!filterType) {
      displayPopup("Please select a filter type", "error");
      return;
    }

    try {
      setFilterLoading(true);
      const payload = { role_id: roleId };

      switch (filterType) {
        case "date":
          if (!date) return displayPopup("Please select a date", "error");
          payload.date = date;
          break;
        case "month":
          if (!month) return displayPopup("Please select a month", "error");
          payload.month = new Date(month).getMonth() + 1;
          payload.year = new Date(month).getFullYear();
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
          if (!startMonth || !endMonth) return displayPopup("Please select start and end month", "error");
          payload.start_month = new Date(startMonth).getMonth() + 1;
          payload.end_month = new Date(endMonth).getMonth() + 1;
          payload.year = new Date(startMonth).getFullYear();
          break;
        case "yearRange":
          if (!startYear || !endYear) return displayPopup("Please enter start and end year", "error");
          payload.start_year = startYear;
          payload.end_year = endYear;
          break;
        default:
          return displayPopup("Invalid filter type", "error");
      }

      const res = await axios.post(`${API_BASE_URL}/filter-mrr-report`, payload);

      if (res.data.success) {
        const filteredData = res.data.data || [];
        setFilteredReport(filteredData);
        setTotalAcceptedQty(res.data.total_accepted_quantity || 0);
        setIsFilterApplied(true);
        if (filteredData.length === 0) displayPopup("No records found for selected filter", "error");
        else displayPopup("Filter applied successfully!", "success");
      } else {
        displayPopup(res.data.error || "Failed to apply filter", "error");
      }
    } catch (err) {
      console.error("Filter error:", err);
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
    setFilteredReport([]);
    setIsFilterApplied(false);
    displayPopup("Filters cleared", "success");
    setCurrentPage(1);
  };

  const activeRecords = isFilterApplied ? filteredReport : report;
  const indexOfLastRecord = currentPage * recordsPerPage;
  const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
  const currentRecords = activeRecords.slice(indexOfFirstRecord, indexOfLastRecord);
  const totalPages = Math.ceil(activeRecords.length / recordsPerPage);

  const nextPage = () => setCurrentPage((p) => Math.min(p + 1, totalPages));
  const prevPage = () => setCurrentPage((p) => Math.max(p - 1, 1));
  const goToFirstPage = () => setCurrentPage(1);
  const goToLastPage = () => setCurrentPage(totalPages);


const stats = [
  {
    title: "Total Accepted Quantity",
    value: totalAcceptedQty,
    icon: Package,
    iconClass: "emerald",
  },
];


  return (
    <div className="roles-page-container">
       {showPopup && (
                    <PopupMessage
                        message={popupMessage.text}
                        type={popupMessage.type}
                        onClose={() => setShowPopup(false)}
                    />
                )}
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
                        <FileText size={32} color="white" />
                      </div>
                      <div>
                        <h1 className="dmrr-title">Material Receipt Report (MRR)</h1>
                        <p className="dmrr-subtitle">Overview of accepted material receipts for Finance Department.</p>
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


            
                <div className="dmrr-filter-container">
                  <h3><Filter size={18}/> Filter MRR</h3>
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
                        <label>Date</label>
                        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                      </div>
                    )}
                    {filterType === "month" && (
                      <div>
                        <label>Month</label>
                        <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
                      </div>
                    )}
                    {filterType === "year" && (
                      <div>
                        <label>Year</label>
                        <input type="number" value={year} onChange={(e) => setYear(e.target.value)} placeholder="YYYY" />
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

              
                <div className="dmrr-table-header">
                  <h2 className="dmrr-table-title"><Package size={20}/> MRR Details</h2>
                  <span>{activeRecords.length} {activeRecords.length === 1 ? "item" : "items"}</span>
                </div>

                <div className="dmrr-table-wrapper">
                  <table className="dmrr-table">
                    <thead className="dmrr-table-head">
                      <tr>
                        <th>Part No</th>
                        <th>Component Name</th>
                        <th>Quantity</th>
                        <th>Accepted Qty</th>
                        <th>Unit Price</th>
                        <th>Total Price</th>
                        <th>Status</th>
                        <th>Inspected By</th>
                        <th>Date</th>
                      </tr>
                    </thead>
                    <tbody className="dmrr-table-body">
                      {currentRecords.length > 0 ? (
                        currentRecords.map((item) => (
                          <tr key={item.id} className="dmrr-table-row">
                            <td>{item.part_number}</td>
                            <td>{item.component_name}</td>
                            <td>{item.quantity}</td>
                            <td>{item.accepted_quantity}</td>
                            <td>{item.unit_price}</td>
                            <td>₹{item.total_price}</td>
                            <td className={item.inspection_status === "Accepted" ? "status-accepted" : item.inspection_status === "Rejected" ? "status-rejected" : ""}>
                              {item.inspection_status}
                            </td>
                            <td>{item.inspected_by}</td>
                            <td>{formatDate(item.created_at)}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="9" className="text-center">
                            {isFilterApplied ? "No records found for the selected filter." : "No records available."}
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
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MRRPage;
