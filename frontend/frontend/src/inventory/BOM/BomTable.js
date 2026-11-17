import React, { useState, useEffect } from "react";
import { Filter, FileText } from "lucide-react";
import axios from "axios";
import API_BASE_URL from "../../config";
import PopupMessage from "../../components/Popup/Popup";
import { ClipLoader } from "react-spinners";

const BomTable = ({ bom, droneCount }) => {
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
  const [filteredBom, setFilteredBom] = useState([]);
  const [isFilterApplied, setIsFilterApplied] = useState(false);
  const [filterLoading, setFilterLoading] = useState(false);


  const [popupMessage, setPopupMessage] = useState({ text: "", type: "" });
  const [showPopup, setShowPopup] = useState(false);

  const displayPopup = (text, type = "error") => {
    setPopupMessage({ text, type });
    setShowPopup(true);
    setTimeout(() => setShowPopup(false), 5000);
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
          
          break;

        case "yearRange":
          if (!startYear || !endYear) return displayPopup("Please enter start and end year", "error");
          payload.start_year = startYear;
          payload.end_year = endYear;
          break;

        default:
          return displayPopup("Invalid filter type selected", "error");
      }

      const response = await axios.post(`${API_BASE_URL}/filter-product-stock`, payload);

      if (response.data.success) {
        const mappedData = response.data.data.map((item) => ({
          description: item.description || "",
          specifications: item.specifications || "",
          uom: item.uom || "",
          qtyPerDrone: item.qty_required_per_drone ?? 0,
          partNumber: item.part_number || "",
          countryOfOrigin: item.country_of_origin || "",
          qtyInStock: item.qty_in_stock ?? 0,
          basicPrice: parseFloat(item.basic_price ?? 0),
          gst: parseFloat(item.gst ?? 0),
          remarks: item.remarks || "",
        }));

        setFilteredBom(mappedData);
        setIsFilterApplied(true);

        if (mappedData.length === 0) {
          displayPopup("No records found for the selected filter", "error");
        } else {
          displayPopup("Filter applied successfully!", "success");
        }
      } else {
        setFilteredBom([]);
        setIsFilterApplied(false);
        displayPopup(response.data.error || "Failed to apply filter", "error");
      }
    } catch (err) {
      console.error("Error filtering product stock:", err);
      setFilteredBom([]);
      setIsFilterApplied(false);
      displayPopup("Error applying filter", "error");
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
    setFilteredBom([]);
    setIsFilterApplied(false);
    displayPopup("Filters cleared", "success");
    setCurrentPage(1);
  };

 
  const activeBom = isFilterApplied ? filteredBom : bom || [];
  const totalPages = Math.ceil(activeBom.length / recordsPerPage);
  const indexOfLastRecord = currentPage * recordsPerPage;
  const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
  const currentRecords = activeBom.slice(indexOfFirstRecord, indexOfLastRecord);

  const goToFirstPage = () => setCurrentPage(1);
  const goToLastPage = () => setCurrentPage(totalPages);
  const nextPage = () => currentPage < totalPages && setCurrentPage(currentPage + 1);
  const prevPage = () => currentPage > 1 && setCurrentPage(currentPage - 1);

  return (
    <div className="dmrr-table-container">
      {showPopup && (
                    <PopupMessage
                        message={popupMessage.text}
                        type={popupMessage.type}
                        onClose={() => setShowPopup(false)}
                    />
                )}

      
      <div className="dmrr-filter-container">
        <h3>
          <Filter size={18} /> Filter Product Stock
        </h3>
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
              <input type="number" value={year} onChange={(e) => setYear(e.target.value)} placeholder="e.g. 2025" />
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
        <h2 className="dmrr-table-title">
          <FileText size={20} /> Product BOM Stock Statement
        </h2>
        <span className="dmrr-table-count">
          {activeBom.length} {activeBom.length === 1 ? "part" : "parts"}
        </span>
      </div>

      {activeBom.length === 0 ? (
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
        <div className="dmrr-table-wrapper">
          <table className="dmrr-table">
            <thead className="dmrr-table-head">
              <tr>
                <th>S.No</th>
                <th>Component Name</th>
                <th>UOM</th>
                <th>Qty/Drone</th>
                <th>Qty in Stock</th>
                <th>Max Drones Possible</th>
                <th>Basic Price</th>
                <th>GST </th>
                <th>Total Price (Inc GST)</th>
                <th>Remarks</th>
              </tr>
            </thead>

            <tbody className="dmrr-table-body">
              {currentRecords.map((item, index) => {
                const basicPrice = parseFloat(item.basicPrice ?? 0);
                const gst = parseFloat(item.gst ?? 0);
                const qtyRequired = parseFloat(item.qtyPerDrone ?? 0);
                const qtyInStock = parseFloat(item.qtyInStock ?? 0);
                const maxDrones = qtyRequired > 0 ? Math.floor(qtyInStock / qtyRequired) : 0;
                const totalPrice = (basicPrice + (basicPrice * gst) / 100) * qtyInStock;

                return (
                  <tr key={index} className="dmrr-table-row">
                    <td>{indexOfFirstRecord + index + 1}</td>
                    <td>{item.description || ""}</td>
                    <td>{item.uom || ""}</td>
                    <td>{qtyRequired}</td>
                    <td>{qtyInStock}</td>
                    <td>{maxDrones}</td>
                    <td>{basicPrice.toFixed(2)}</td>
                    <td>{gst}</td>
                    <td>{totalPrice.toFixed(2)}</td>
                    <td>{item.remarks || "Not mentioned"}</td>
                  </tr>
                );
              })}
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
      )}
    </div>
  );
};

export default BomTable;
