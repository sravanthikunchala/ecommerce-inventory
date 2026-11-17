import React, { useState, useEffect } from "react";
import {
  FileText,
  Clipboard,
  Package,
  TrendingUp,
  BarChart3,
  Hash,
  Plus,
  Filter,
} from "lucide-react";
import axios from "axios";
import RolesHeader from "../../components/RolesHeader/RolesHeader";
import RolesSideMenu from "../../components/RolesSideMenu/RolesSideMenu";
import "../SIN/SinPage.css";
import API_BASE_URL from "../../config";
import PopupMessage from "../../components/Popup/Popup";
import "./POPage.css";
import { ClipLoader } from "react-spinners";

const PurchaseOrderPage = () => {
  const roleId = sessionStorage.getItem("roleId");
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    po_number: "",
    customer_name: "",
    customer_address: "",
    customer_email: "",
    product_name: "",
    quantity: "",
    total_value: "",
    payment_received: "",
  });
  const [popupMessage, setPopupMessage] = useState({ text: "", type: "" });
  const [showPopup, setShowPopup] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedPoId, setSelectedPoId] = useState(null);

  
  const [filterLoading, setFilterLoading] = useState(false);
  const [isFilterApplied, setIsFilterApplied] = useState(false);
  const [filteredPurchaseOrders, setFilteredPurchaseOrders] = useState([]);
  
 
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
  const activeRecords = isFilterApplied ? filteredPurchaseOrders : purchaseOrders;
  const indexOfLastRecord = currentPage * recordsPerPage;
  const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
  const currentRecords = activeRecords.slice(indexOfFirstRecord, indexOfLastRecord);
  const totalPages = Math.ceil(activeRecords.length / recordsPerPage);

  const goToFirstPage = () => setCurrentPage(1);
  const goToLastPage = () => setCurrentPage(totalPages);
  const nextPage = () => setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  const prevPage = () => setCurrentPage((prev) => Math.max(prev - 1, 1));

  const roleType = (sessionStorage.getItem("roleType") || "").toLowerCase();
  const canAddPO = ["admin", "finance"].includes(roleType);

  const displayPopup = (text, type = "success") => {
    setPopupMessage({ text, type });
    setShowPopup(true);
    setTimeout(() => setShowPopup(false), 10000);
  };

  const handleClosePopup = () => {
    setShowPopup(false);
    setPopupMessage({ text: "", type: "" });
  };
  
  const fetchPOs = async () => {
    try {
      const res = await axios.post(`${API_BASE_URL}/view-po`);
      if (res.data.success) setPurchaseOrders(res.data.data);
    } catch (err) {
      console.error("PO fetch error:", err);
      displayPopup("Failed to fetch PO records", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPOs();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = { 
        role_id: roleId, 
        ...form 
      };
      const res = await axios.post(`${API_BASE_URL}/add-po`, payload);
      if (res.data.success) {
        displayPopup("PO Created Successfully!", "success");

        setPurchaseOrders([res.data.data, ...purchaseOrders]);
        setForm({
          po_number: "",
          customer_name: "",
          customer_address: "",
          customer_email: "",
          product_name: "",
          quantity: "",
          total_value: "",
          payment_received: "",
        });
      }
    } catch (err) {
      console.error("Add PO error:", err);
      displayPopup("Failed to create PO", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handlePayment = async (poId, amount, remarks) => {
    try {
      const res = await axios.post(`${API_BASE_URL}/add-po-payment/${poId}`, {
        payment_received: parseFloat(amount),
        remarks,
      });

      if (res.data.success) {
        setPurchaseOrders((prev) =>
          prev.map((po) => (po.po_id === poId ? { ...po, ...res.data.data } : po))
        );
        
        setShowModal(false);
        setSelectedPoId(null);
        displayPopup("Payment updated successfully!", "success");
      }
    } catch (err) {
      console.error("Payment update error:", err);
      displayPopup("Failed to update payment.", "error");
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
          if (!startDate || !endDate)
            return displayPopup("Please select start and end date", "error");
          payload.start_date = startDate;
          payload.end_date = endDate;
          break;

        case "monthRange":
          if (!startMonth || !endMonth)
            return displayPopup("Please select start and end month", "error");
          payload.start_month = startMonth.split("-")[1];
          payload.end_month = endMonth.split("-")[1];
          payload.year = startMonth.split("-")[0]; 
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

      const response = await axios.post(`${API_BASE_URL}/filter-purchase-orders`, payload);

      if (response.data.success) {
        const filteredData = response.data.data || [];
        setFilteredPurchaseOrders(filteredData);
        setIsFilterApplied(true);

        if (filteredData.length === 0) {
          displayPopup("No records found for selected filter", "error");
        } else {
          displayPopup("Filter applied successfully!", "success");
        }
      } else {
        displayPopup(response.data.error || "Failed to apply filter", "error");
        setFilteredPurchaseOrders([]);
        setIsFilterApplied(false);
      }
    } catch (err) {
      console.error("Filter error:", err);
      displayPopup("Error applying filter", "error");
      setFilteredPurchaseOrders([]);
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
    setFilteredPurchaseOrders([]);
    setIsFilterApplied(false);
    displayPopup("Filters cleared", "success");
  };

  const activePurchaseOrders = isFilterApplied ? filteredPurchaseOrders : purchaseOrders;

  const totalPOs = activePurchaseOrders.length;
  const totalValue = activePurchaseOrders.reduce((sum, r) => sum + (r.total_value || 0), 0);
  const totalReceived = activePurchaseOrders.reduce((sum, r) => sum + (r.payment_received || 0), 0);
  const totalBalance = activePurchaseOrders.reduce((sum, r) => sum + (r.balance || 0), 0);

  const stats = [
    { title: "Total POs", value: totalPOs.toString(), icon: Clipboard, iconClass: "blue" },
    { title: "Total Order Value", value: `₹${totalValue}`, icon: Package, iconClass: "amber" },
    { title: "Total Payment Received", value: `₹${totalReceived}`, icon: TrendingUp, iconClass: "emerald" },
    { title: "Total Balance", value: `₹${totalBalance}`, icon: BarChart3, iconClass: "purple" },
  ];

  const PaymentModal = ({ show, onClose, onSubmit }) => {
    const [amount, setAmount] = useState("");
    const [remarks, setRemarks] = useState("");

    if (!show) return null;

    return (
      <div className="po-modal-overlay">
        <div className="po-modal-content">
          <h2>Update Payment</h2>
          <p>Enter the payment details below:</p>
          <div className="po-modal-field">
            <label>Payment Amount (₹)</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter amount"
              required
            />
          </div>
          <div className="po-modal-field">
            <label>Remarks (optional)</label>
            <input
              type="text"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Remarks (optional)"
            />
          </div>
          <div className="po-modal-actions">
            <button
              onClick={() => {
                if (!amount) return alert("Please enter a payment amount");
                onSubmit(amount, remarks);
              }}
              className="dmrr-submit-btn"
            >
              Submit
            </button>
            <button onClick={onClose} className="po-modal-cancel-btn">
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  };

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
                  <div>
                    <PopupMessage
                      message={popupMessage.text}
                      type={popupMessage.type}
                      onClose={handleClosePopup}
                    />
                  </div>
                )}
           
            <div className="dmrr-header">
              <div className="dmrr-header-content">
                <div className="dmrr-title-section">
                  <div className="dmrr-icon-container">
                    <FileText size={32} color="white" />
                  </div>
                  <div>
                    <h1 className="dmrr-title">Purchase Orders (PO)</h1>
                    <p className="dmrr-subtitle">
                      Overview of all customer purchase orders and payments
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

           
            {canAddPO ? (
            <div className="dmrr-form-container">
              <div className="dmrr-form-header">
                <h2 className="dmrr-form-title"><Plus size={24} /> Add New Purchase Order</h2>
              </div>
              <div>
               
              </div>
              <form className="dmrr-form" onSubmit={handleSubmit}>
                <div className="dmrr-form-grid">
                  {[
                    { label: "PO Number", name: "po_number" },
                    { label: "Customer Name", name: "customer_name" },
                    { label: "Customer Email", name: "customer_email" },
                    { label: "Customer Address", name: "customer_address" },
                    { label: "Product Name", name: "product_name" },
                    { label: "Quantity", name: "quantity", type: "number" },
                    { label: "Total Value", name: "total_value", type: "number" },
                    { label: "Payment Received", name: "payment_received", type: "number" },
                  ].map((field, i) => (
                    <div key={i} className="dmrr-form-field">
                      <label className="dmrr-form-label"><Hash size={16} /> {field.label}<span className="required-asterisk">*</span></label>
                      <input
                        name={field.name}
                        type={field.type || "text"}
                        value={form[field.name]}
                        onChange={handleChange}
                        required
                        className="dmrr-form-input"
                      />
                    </div>
                  ))}
                </div>
                <div className="dmrr-form-actions">
                  <button type="submit" className="dmrr-submit-btn" disabled={submitting}>
                    <Plus size={16} /> {submitting ? "Adding..." : "Add PO"}
                  </button>
                </div>
              </form>
            </div>
            ):(
              <div className="dmrr-no-permission">
                <h3 className="no-permission-heading">🚫 You don't have permission to create Purchase Orders</h3>
                <p>
                  Please contact the <strong>Admin</strong> or <strong>Finance</strong> department if you need access.
                </p>
              </div>
            )}

            <div className="dmrr-filter-container">
              <h3><Filter size={18} /> Filter Purchase Orders</h3>

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


         
            <div className="dmrr-table-container">
              <div className="dmrr-table-header">
                <h2 className="dmrr-table-title"><Package size={20} /> Purchase Orders List</h2>
                <span className="dmrr-table-count">
                  {activePurchaseOrders.length} {activePurchaseOrders.length === 1 ? "item" : "items"}
                </span>
              </div>

              {activePurchaseOrders.length === 0 ? (
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
                <div className="dmrr-table-wrapper">
                  <table className="dmrr-table">
                    <thead className="dmrr-table-head">
                      <tr>
                        <th>PO Number</th>
                        <th>Date</th>
                        <th>Customer Name</th>
                        <th>Customer Email</th>
                        <th>Customer Address</th>
                        <th>Product</th>
                        <th>Quantity</th>
                        <th>Total Value</th>
                        <th>Payment Received</th>
                        <th>Balance</th>
                        <th>Status</th>
                        <th>Update Payment</th>
                        <th>Authorized</th>
                      </tr>
                    </thead>
                    <tbody className="dmrr-table-body">
                      {currentRecords.map((po, i) => (
                        <tr key={i} className="dmrr-table-row">
                          <td>{po.po_number}</td>
                          <td>{po.date}</td>
                          <td>{po.customer_name}</td>
                          <td>{po.customer_email}</td>
                          <td>{po.customer_address}</td>
                          <td>{po.product_name}</td>
                          <td>{po.quantity}</td>
                          <td>{po.total_value}</td>
                          <td>{po.payment_received}</td>
                          <td>{po.balance}</td>
                          <td>
                            {po.payment_status}
                          </td>
                          <td>
                            {(po.payment_status === "Pending" || po.payment_status === "Partially Paid") ? (
                              <button
                                onClick={() => {
                                  setSelectedPoId(po.po_id);
                                  setShowModal(true);
                                }}
                                className="dmrr-form-submit"
                              >
                                Update
                              </button>
                            ) : (
                              <button disabled className="dmrr-form-submit">
                                Update
                              </button>
                            )}
                          </td>
                          <td>{po.is_authorized ? "Yes" : "No"}</td>
                        </tr>
                      ))}
                    </tbody>
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
                  <PaymentModal
                    show={showModal}
                    onClose={() => setShowModal(false)}
                    onSubmit={(amount, remarks) => handlePayment(selectedPoId, amount, remarks)}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PurchaseOrderPage;