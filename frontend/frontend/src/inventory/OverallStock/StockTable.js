import React, { useState } from "react";
import { Package, Filter } from "lucide-react";
import axios from "axios";
import API_BASE from "../../config";
import PopupMessage from "../../components/Popup/Popup";
import { ClipLoader } from "react-spinners";


const StockTable = ({ stock }) => {
  const [filteredStock, setFilteredStock] = useState(stock || []);
  const [dataLoading, setDataLoading] = useState(false);
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

  const roleId = sessionStorage.getItem("roleId");

  const displayPopup = (text, type = "success") => {
    setPopupMessage({ text, type });
    setShowPopup(true);
    setTimeout(() => setShowPopup(false), 10000);
  };

  const handleClosePopup = () => {
    setShowPopup(false);
    setPopupMessage({ text: "", type: "" });
  };

  
  const handleFilter = async () => {
    if (!filterType) {
      displayPopup("Please select a filter type", "error");
      return;
    }

    const payload = { role_id: roleId };
    try {
      setFilterLoading(true);

      switch (filterType) {
        case "date":
          if (!date) return displayPopup("Please select a specific date", "error");
          payload.date = date;
          break;
        case "month":
          if (!month) return displayPopup("Please select a month", "error");
          payload.month = new Date(month).getMonth() + 1;
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
                   break;
        case "yearRange":
          if (!startYear || !endYear)
            return displayPopup("Please enter start and end year", "error");
          payload.start_year = startYear;
          payload.end_year = endYear;
          break;
        default:
          return displayPopup("Invalid filter type", "error");
      }

      const response = await axios.post(`${API_BASE}/filter-overall-stock`, payload);

      if (response.data.success) {
        const data = response.data.data || [];
        setFilteredStock(data);
        setIsFilterApplied(true);
        if (data.length === 0) displayPopup("No records found", "error");
        else displayPopup("Filter applied successfully!", "success");
      } else {
        setFilteredStock([]);
        setIsFilterApplied(false);
        displayPopup(response.data.error || "Failed to apply filter", "error");
      }
    } catch (err) {
      console.error(err);
      setFilteredStock([]);
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
    setFilteredStock(stock);
    setIsFilterApplied(false);
    displayPopup("Filters cleared", "success");
  };

  const activeStock = isFilterApplied ? filteredStock : stock;

  return (
    <div className="dmrr-table-container">
     
      <div className="dmrr-filter-container">
        <h3>
          <Filter size={18} /> Filter Stock Records
        </h3>

        <div className="dmrr-filter-fields">
          <div>
            <label>Filter Type</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
            >
              <option value="">Select Filter</option>
              <option value="date">Single Date</option>
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
              <input type="number" value={year} onChange={(e) => setYear(e.target.value)} />
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
                <input
                  type="number"
                  value={startYear}
                  placeholder="YYYY"
                  onChange={(e) => setStartYear(e.target.value)}
                />
              </div>
              <div>
                <label>End Year</label>
                <input
                  type="number"
                  value={endYear}
                  placeholder="YYYY"
                  onChange={(e) => setEndYear(e.target.value)}
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

      {showPopup && (
        <div className="role-popup">
          <PopupMessage
            message={popupMessage.text}
            type={popupMessage.type}
            onClose={handleClosePopup}
          />
        </div>
      )}

      

      <div className="dmrr-table-header">
        <h2 className="dmrr-table-title">
          <Package size={20} />
          Total Stock Statement
        </h2>
        <span className="dmrr-table-count">
          {activeStock.length} {activeStock.length === 1 ? "item" : "items"}
        </span>
      </div>

      
        
      {dataLoading ? (
        <div className="full-page-loading">
          <div className="loading-content">
            <ClipLoader size={45} color="#4450A2" />
            <p>Loading...</p>
          </div>
        </div>
      ) : activeStock.length === 0 ? (
        <div className="no-records-message">
          {isFilterApplied
            ? "No records found for selected filter."
            : "No stock records available."}
        </div>
      ) : (
        <div className="dmrr-table-wrapper">
          <table className="dmrr-table">
            <thead className="dmrr-table-head">
              <tr>
                <th>Component Name</th>
                <th>UOM</th>
                <th>Total Quantity</th>
                <th>Average Price</th>
                <th>Total Value</th>
              </tr>
            </thead>
            <tbody className="dmrr-table-body">
              {activeStock.map((item, index) => (
                <tr key={index} className="dmrr-table-row">
                  <td>{item.component_name}</td>
                  <td>{item.uom}</td>
                  <td>{item.total_quantity}</td>
                  <td>{Number(item.average_price).toFixed(2)}</td>
                  <td>{Number(item.total_value).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default StockTable;
