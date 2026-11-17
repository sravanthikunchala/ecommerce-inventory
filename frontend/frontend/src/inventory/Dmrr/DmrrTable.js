import React, { useState, useEffect } from "react";
import { Package, Filter } from "lucide-react";
import axios from "axios";
import API_BASE_URL from "../../config";
import "./DmrrTable.css";
import PopupMessage from "../../components/Popup/Popup";
import { ClipLoader } from "react-spinners";

const DmrrTable = ({ receipts, roleId, onInspectionComplete }) => {
  const [inspectionData, setInspectionData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterLoading, setFilterLoading] = useState(false);
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
  const [filteredReceipts, setFilteredReceipts] = useState([]);

  const roleType = sessionStorage.getItem("roleType");

  const displayPopup = (text, type = "error", duration = 10000) => {
    setPopupMessage({ text, type });
    setShowPopup(true);
    setTimeout(() => setShowPopup(false), duration);
  };

useEffect(() => {
  const activeList = filteredReceipts.length > 0 ? filteredReceipts : receipts;

  const mappedData = {};
  activeList.forEach((r) => {
    mappedData[r.id] = {
      accepted: r.accepted_quantity != null ? r.accepted_quantity.toString() : "0",
      rejected: r.rejected_quantity != null ? r.rejected_quantity.toString() : "0",
      originalAccepted: r.accepted_quantity != null ? r.accepted_quantity.toString() : "0",
      originalRejected: r.rejected_quantity != null ? r.rejected_quantity.toString() : "0",
    };
  });

  setInspectionData(mappedData);

  if (roleType !== "quality incharge" && roleType !== "Admin") {
    displayPopup(
      "Only Quality Incharge and Admin can add inspection status. Others can only view",
      "error",
      50000
    );
  }
}, [receipts, filteredReceipts, roleType]);



  const handleChange = (id, field, value, total) => {
    setInspectionData((prev) => {
      const updated = { ...prev };
      const row = updated[id] || { accepted: "0", rejected: "0" };

      if (field === "accepted") {
        row.accepted = value;
        row.rejected = String(total - Number(value));
      } else {
        row.rejected = value;
        row.accepted = String(total - Number(value));
      }

      updated[id] = row;
      return updated;
    });
  };


const handleSubmit = async () => {
  if (roleType !== "quality incharge" && roleType !== "Admin") return;

  const idsToSubmit = activeReceipts
    .map((r) => {
      const row = inspectionData[r.id];
      if (!row) return null;

      const accepted = Number(row.accepted);
      const rejected = Number(row.rejected);

      // Submit only if user changed values
      const changed =
        row.originalAccepted !== row.accepted ||
        row.originalRejected !== row.rejected;

      if (changed) {
        return {
          id: r.id,
          accepted_quantity: accepted,
          rejected_quantity: rejected,
        };
      }

      return null;
    })
    .filter(Boolean);

  if (!idsToSubmit.length) {
    displayPopup("No inspection data changed", "error");
    return;
  }

  try {
    setLoading(true);
    const response = await axios.post(`${API_BASE_URL}/inspect-material`, {
      role_id: roleId,
      ids: idsToSubmit,
    });

    if (response.data.success) {
      displayPopup("Inspection submitted successfully!", "success");
      if (onInspectionComplete) onInspectionComplete(response.data.data);
    } else {
      displayPopup(response.data.error || "Failed to update inspection", "error");
    }
  } catch (err) {
    displayPopup(err.response?.data?.error || "Error while submitting inspection", "error");
  } finally {
    setLoading(false);
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
          payload.month = month;
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
          return displayPopup("Invalid filter type selected", "error");
      }

      const response = await axios.post(`${API_BASE_URL}/filter-material-receipt`, payload);

      if (response.data.success) {
        const filteredData = response.data.data || [];
        setFilteredReceipts(filteredData);
        setIsFilterApplied(true);

        if (filteredData.length === 0) {
          displayPopup("No records found for selected filter", "error");
        } else {
          displayPopup("Filter applied successfully!", "success");
        }
      } else {
        displayPopup(response.data.error || "Failed to apply filter", "error");
        setFilteredReceipts([]);
        setIsFilterApplied(false);
      }
    } catch (err) {
      console.error("Filter error:", err);
      displayPopup("Error applying filter", "error");
      setFilteredReceipts([]);
      setIsFilterApplied(false);
    } finally {
      setFilterLoading(false);
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
    setFilteredReceipts([]);
    setIsFilterApplied(false);
    displayPopup("Filters cleared", "success");
  };

  const activeReceipts = isFilterApplied ? filteredReceipts : receipts;
  const indexOfLastRecord = currentPage * recordsPerPage;
  const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
  const currentRecords = activeReceipts.slice(indexOfFirstRecord, indexOfLastRecord);
  const totalPages = Math.ceil(activeReceipts.length / recordsPerPage);

  const goToFirstPage = () => setCurrentPage(1);
  const goToLastPage = () => setCurrentPage(totalPages);
  const nextPage = () => setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  const prevPage = () => setCurrentPage((prev) => Math.max(prev - 1, 1));

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
        <h3><Filter size={18} /> Filter Material Receipts</h3>

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
            <button onClick={handleFilter} disabled={filterLoading}>
              {filterLoading ? "Filtering..." : "Apply Filter"}
            </button>
            <button onClick={handleClearFilter}>Clear</button>
          </div>
        </div>
      </div>


      <div className="dmrr-table-header">
        <h2 className="dmrr-table-title"><Package size={20} /> Material Receipts</h2>
        <span className="dmrr-table-count">
          {activeReceipts.length} {activeReceipts.length === 1 ? "item" : "items"}
        </span>
      </div>

      {activeReceipts.length === 0 ? (
        <div className="no-records-message">
          {isFilterApplied ? (
            <p>No records found for selected filter.</p>
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
        <>
          <div className="dmrr-table-wrapper">
            <table className="dmrr-table">
              <thead className="dmrr-table-head">
                <tr>
                  <th>Part No</th>
                  <th>HSN Code</th>
                  <th>Component Name</th>
                  <th>Supplier</th>
                  <th>Invoice Number</th>
                  <th>Invoice Date</th>
                  <th>PO Number</th>
                  <th>PO Date</th>
                  <th>UOM</th>
                  <th>Quantity</th>
                  <th>Unit Price</th>
                  <th>Total Price</th>
                  <th>Taxes</th>
                  <th>Inspection Status</th>
                  <th>Date Received</th>
                </tr>
              </thead>

              <tbody className="dmrr-table-body">
                {currentRecords.map((r, index) => {
                  const accepted = inspectionData[r.id]?.accepted ?? "0";
                  const rejected = inspectionData[r.id]?.rejected ?? "0";

                  const total = r.quantity || 0;
                  const disabledInput =
                    (roleType !== "quality incharge" && roleType !== "Admin") ||
                    (r.accepted_quantity > 0 || r.rejected_quantity > 0);

                  return (
                    <tr key={r.id} className="dmrr-table-row">
                      <td>{r.part_number}</td>
                      <td>{r.hsn_code}</td>
                      <td>{r.component_name}</td>
                      <td>{r.supplier}</td>
                      <td>{r.invoice_no}</td>
                      <td>{formatDate(r.invoice_date)}</td>
                      <td>{r.po_no}</td>
                      <td>{formatDate(r.po_date)}</td>
                      <td>{r.uom}</td>
                      <td>{r.quantity}</td>
                      <td>{r.unit_price}</td>
                      <td>{r.total_price}</td>
                      <td>{r.taxes}</td>
                      <td>
                        <div className="inspection-status">
                          <div className="status-field">
                            <span>Accepted:</span>
                            <input
                              type="number"
                              min="0"
                              max={total}
                              value={accepted}
                              onChange={(e) =>
                                handleChange(r.id, "accepted", e.target.value, r.quantity)
                              }

                              disabled={disabledInput}
                              className={`status-input ${!disabledInput ? "accepted-input" : ""}`}
                            />
                          </div>
                          <div className="status-field">
                            <span>Rejected:</span>
                            <input
                              type="number"
                              min="0"
                              max={total}
                              value={rejected}
                              onChange={(e) =>
                                handleChange(r.id, "rejected", e.target.value, r.quantity)
                              }

                              disabled={disabledInput}
                              className={`status-input ${!disabledInput ? "rejected-input" : ""}`}
                            />
                          </div>
                        </div>
                      </td>
                      <td>{formatDate(r.created_at)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <div className="dmrr-submit-container">
              <button
                className="dmrr-submit-btn"
                onClick={handleSubmit}
                disabled={loading || (roleType !== "quality incharge" && roleType !== "Admin")}
              >
                {loading ? "Submitting..." : "Submit Inspection Status"}
              </button>
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
  );
};

export default DmrrTable;