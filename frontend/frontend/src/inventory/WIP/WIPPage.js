import React, { useState, useEffect } from "react";
import RolesHeader from "../../components/RolesHeader/RolesHeader";
import RolesSideMenu from "../../components/RolesSideMenu/RolesSideMenu";
import "../SIN/SinPage.css";
import "../Dmrr/DmrrTable.css";
import { Package, Filter } from "lucide-react";
import axios from "axios";
import API_BASE_URL from "../../config";
import PopupMessage from "../../components/Popup/Popup";
import { ClipLoader } from "react-spinners";
import { ClipboardPen } from "lucide-react";

const WipPage = () => {
  const [wipData, setWipData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 10;
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


  const displayPopup = (text, type = "success", duration = 10000) => {
    setPopupMessage({ text, type });
    setShowPopup(true);
    setTimeout(() => setShowPopup(false), duration);
  };

 
  const fetchWipData = async (filters = {}) => {
    try {
      setDataLoading(true);
      const response = await axios.post(`${API_BASE_URL}/view-wip`, filters);

      if (response.data.success) {
        setWipData(response.data.data || []);
      } else {
        displayPopup(response.data.error || "Failed to fetch WIP data", "error");
        setWipData([]);
      }
    } catch (err) {
      console.error("Fetch WIP error:", err);
      displayPopup("Error while fetching WIP stock", "error");
      setWipData([]);
    } finally {
      setDataLoading(false);
    }
  };

  useEffect(() => {
    fetchWipData();
  }, []);


  const handleFilter = async () => {
    if (!filterType) {
      displayPopup("Please select a filter type", "error");
      return;
    }

    try {
      setLoading(true);
      const payload = {};

      switch (filterType) {
        case "date":
          if (!date) return displayPopup("Please select a specific date", "error");
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
          if (!startDate || !endDate)
            return displayPopup("Please select start and end date", "error");
          payload.start_date = startDate;
          payload.end_date = endDate;
          break;

        case "monthRange":
          if (!startMonth || !endMonth)
            return displayPopup("Please select start and end month", "error");
          payload.start_month = new Date(startMonth).getMonth() + 1;
          payload.end_month = new Date(endMonth).getMonth() + 1;
          payload.year = new Date(startMonth).getFullYear();
          break;

        case "yearRange":
          if (!startYear || !endYear)
            return displayPopup("Please enter start and end year", "error");
          payload.start_year = startYear;
          payload.end_year = endYear;
          break;

        default:
          return displayPopup("Invalid filter type selected", "error");
      }

      const response = await axios.post(`${API_BASE_URL}/filter-wip`, payload);

      if (response.data.success) {
        const filteredData = response.data.data || [];
        setWipData(filteredData);
        setIsFilterApplied(true);

        if (filteredData.length === 0) {
          displayPopup("No records found for selected filter", "error");
        } else {
          displayPopup("Filter applied successfully!", "success");
        }
        setCurrentPage(1);
      } else {
        displayPopup(response.data.error || "Failed to apply filter", "error");
        setIsFilterApplied(false);
        setWipData([]);
      }
    } catch (err) {
      console.error("Filter error:", err);
      displayPopup("Error applying filter", "error");
      setIsFilterApplied(false);
      setWipData([]);
    } finally {
      setLoading(false);
    }
  };


  const formatDate = (datetimeString) => {
  if (!datetimeString) return "";
  return datetimeString.split(" ")[0]; 
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
    setIsFilterApplied(false);
    fetchWipData();
    displayPopup("Filters cleared", "success");
  };

  const indexOfLastRecord = currentPage * recordsPerPage;
  const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
  const currentRecords = wipData.slice(indexOfFirstRecord, indexOfLastRecord);
  const totalPages = Math.ceil(wipData.length / recordsPerPage);

  const goToFirstPage = () => setCurrentPage(1);
  const goToLastPage = () => setCurrentPage(totalPages);
  const nextPage = () => setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  const prevPage = () => setCurrentPage((prev) => Math.max(prev - 1, 1));

  return (
    <div className="roles-page-container">
      <RolesHeader />
      <div className="roles-page-body">
        <div className="roles-sidebar">
          <RolesSideMenu />
        </div>
        <div className="roles-main-content">
          <div className="dmrr-container">
            <div className="dmrr-header">
        <div className="dmrr-header-content">
          <div className="dmrr-title-section">
            <div className="dmrr-icon-container">
              <ClipboardPen size={32} color="white" />
            </div>
            <div>
              <h1 className="dmrr-title">Work In Progress (WIP)</h1>
              <p className="dmrr-subtitle">
                Track Work In Progress
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
              <div className="dmrr-content-sections">
              {showPopup && (
  <PopupMessage
    message={popupMessage.text}
    type={popupMessage.type}
    show={showPopup}
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

                  
                  <div className="dmrr-table-container">  
                <div className="dmrr-filter-container">
                  <h3><Filter size={18}/> Filter WIP Stock</h3>

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
                      <button onClick={handleFilter} disabled={loading}>
                        {loading ? "Filtering..." : "Apply Filter"}
                      </button>
                      <button onClick={handleClearFilter}>Clear</button>
                    </div>
                  </div>
                </div>

                    <div className="dmrr-table-header">
                      <h2 className="dmrr-table-title">
                        <Package size={20} />
                        WIP Stock
                      </h2>
                    </div>

                    

                    <div className="dmrr-table-wrapper">
                      <table className="dmrr-table">
                        <thead className="dmrr-table-head">
                          <tr>
                            <th>Item</th>
                            <th>UOM</th>
                            <th>Quantity</th>
                            <th>SIN No</th>
                            <th>Issued Date</th>
                            <th>Status</th>
                            <th>Last Updated</th>
                          </tr>
                        </thead>
                        <tbody className="dmrr-table-body">
  {currentRecords.length > 0 ? (
    currentRecords.map((item) => (
      <tr key={item.id} className="dmrr-table-row">
        <td>{item.component_name}</td>
        <td>{item.uom}</td>
        <td>{item.quantity}</td>
        <td>{item.sin_no || "-"}</td>
        <td>{formatDate(item.issued_date || "-")}</td>
        <td style={{ color: item.quantity > 0 ? "green" : "red" }}>
          {item.quantity > 0 ? "Available" : "Empty"}
        </td>
        <td>{formatDate(item.created_at)}</td>
      </tr>
    ))
  ) : (
    <tr>
      <td colSpan={7} style={{ textAlign: "center" }}>
       No records found for the selected filter.
      </td>
    </tr>
  )}
</tbody>

                      </table>
                    </div>

                    {wipData.length > 0 && (
                      <div className="pagination-container">
                        <button onClick={goToFirstPage} disabled={currentPage === 1}>First</button>
                        <button onClick={prevPage} disabled={currentPage === 1}>Previous</button>
                        <span>Page {currentPage} of {totalPages}</span>
                        <button onClick={nextPage} disabled={currentPage === totalPages}>Next</button>
                        <button onClick={goToLastPage} disabled={currentPage === totalPages}>Last</button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WipPage;
