import React, { useState, useEffect } from "react";
import {
  FileText,
  Plus,
  Hash,
  Package,
  User,
  DollarSign,
  Clipboard,
  TrendingUp,
  BarChart3,
  Home,
  Filter,
  Upload,
} from "lucide-react";
import axios from "axios";
import "../SIN/SinPage.css";
import RolesHeader from "../../components/RolesHeader/RolesHeader";
import RolesSideMenu from "../../components/RolesSideMenu/RolesSideMenu";
import PopupMessage from "../../components/Popup/Popup";
import { ClipLoader } from "react-spinners";

import API_BASE_URL from "../../config";

const MDAPage = () => {
  const role_id = sessionStorage.getItem("roleId");
  const currentRole = sessionStorage.getItem("roleType");
  const [mdaRecords, setMdaRecords] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [loadingPOs, setLoadingPOs] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    poId: "",
    customerName: "",
    address: "",
    gst: "",
    product: "",
    qty: "",
    totalValue: "",
    paymentReceived: "",
    balance: "",
    remarks: "",
  });
  const [showPopup, setShowPopup] = useState(false);
  const [popupMessage, setPopupMessage] = useState({ text: "", type: "" });

  const [showAuthorizeModal, setShowAuthorizeModal] = useState(false);
  const [selectedMdaId, setSelectedMdaId] = useState(null);
  const [authorizeRemarks, setAuthorizeRemarks] = useState("");
  const [excelFile, setExcelFile] = useState(null);
  const [uploading, setUploading] = useState(false);
   
  const roleType = (sessionStorage.getItem("roleType") || "").toLowerCase();
  const canCreateMDA = ["admin", "finance"].includes(roleType);
  
  const [filterLoading, setFilterLoading] = useState(false);
  const [isFilterApplied, setIsFilterApplied] = useState(false);
  const [filteredMdaRecords, setFilteredMdaRecords] = useState([]);
  
 
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

  const displayPopup = (text, type = "success") => {
    setPopupMessage({ text, type });
    setShowPopup(true);
    setTimeout(() => setShowPopup(false), 10000);
  };

  const handleClosePopup = () => {
    setShowPopup(false);
    setPopupMessage({ text: "", type: "" });
  };

  useEffect(() => {
    const fetchPOs = async () => {
      try {
        const res = await axios.post(`${API_BASE_URL}/view-po`, {
          role_id: role_id
        });
        if (res.data.success) {
          const fullyPaidPOs = res.data.data.filter(
            (po) =>
              po.payment_status === "Fully Paid" ||
              parseFloat(po.balance || 0) === 0
          );
          setPurchaseOrders(fullyPaidPOs);
        }
      } catch (err) {
        console.error("PO fetch error:", err);
        displayPopup("Failed to fetch PO records", "error");
      } finally {
        setLoadingPOs(false);
      }
    };
    fetchPOs();
  }, []);

  useEffect(() => {
    const fetchMDAs = async () => {
      try {
        const res = await axios.post(`${API_BASE_URL}/view-mda`, {
          role_id: role_id
        });
        if (res.data.success) setMdaRecords(res.data.data);
      } catch (err) {
        console.error("MDA fetch error:", err);
        displayPopup("Failed to fetch MDA records", "error");
      }
    };
    fetchMDAs();
  }, []);

  const handlePOChange = (e) => {
    const selectedId = parseInt(e.target.value);
    const po = purchaseOrders.find((p) => p.po_id === selectedId);

    if (po) {
      setForm({
        poId: po.po_id,
        customerName: po.customer_name || "",
        address: po.customer_address || "",
        gst: po.gst_number || "",
        product: po.product_name || "",
        qty: po.quantity || "",
        totalValue: po.total_value || 0,
        paymentReceived: po.payment_received || 0,
        balance: po.balance || 0,
        remarks: "",
      });
    } else {
      setForm({
        poId: "",
        customerName: "",
        address: "",
        gst: "",
        product: "",
        qty: "",
        totalValue: "",
        paymentReceived: "",
        balance: "",
        remarks: "",
      });
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.poId) {
      displayPopup("Please select a Purchase Order first!", "error");
      return;
    }
    setSubmitting(true);
    try {
      const roleId = sessionStorage.getItem("roleId");
      const payload = {
        po_id: form.poId,
        role_id: roleId,
        remarks: form.remarks,
      };

      const res = await axios.post(`${API_BASE_URL}/add-mda`, payload);
      if (res.data.success) {
        const newMDA = res.data.data;

        const formattedMDA = {
          ...newMDA,
          balance: newMDA.balance || 0,
          total_value: newMDA.total_value || 0,
          payment_received: newMDA.payment_received || 0,
          authorized: newMDA.authorized || false,
          authorized_by: newMDA.authorized_by || null,
          authorized_at: newMDA.authorized_at || null,
        };

        setMdaRecords([formattedMDA, ...mdaRecords]);
        setForm({
          poId: "",
          customerName: "",
          address: "",
          gst: "",
          product: "",
          qty: "",
          totalValue: "",
          paymentReceived: "",
          balance: "",
          remarks: "",
        });
        displayPopup("MDA created successfully!", "success");
      }
    } catch (err) {
      console.error("Add MDA error:", err);
      displayPopup("Failed to create MDA.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const openAuthorizeModal = (mdaId) => {
    setSelectedMdaId(mdaId);
    setAuthorizeRemarks("");
    setShowAuthorizeModal(true);
  };

  const submitAuthorize = async () => {
    if (!selectedMdaId) return;
    const roleId = sessionStorage.getItem("roleId");
    try {
      const payload = {
        mda_id: selectedMdaId,
        role_id: roleId,
        remarks: authorizeRemarks,
      };

      const res = await axios.post(`${API_BASE_URL}/authorize-mda`, payload);

      if (res.data.success) {
        displayPopup(`${res.data.data.mda_no} authorized successfully!`, "success");
        setMdaRecords((prev) =>
          prev.map((mda) =>
            mda.mda_id === selectedMdaId
              ? { ...mda, authorized: true, dispatch_status: "Ready to Dispatch" }
              : mda
          )
        );
      } else {
        displayPopup(`Authorization failed: ${res.data.error}`, "error");
      }
    } catch (err) {
      console.error("Authorize MDA error:", err);
      displayPopup("Authorization failed. Check console.", "error");
    } finally {
      setShowAuthorizeModal(false);
      setSelectedMdaId(null);
    }
  };


  const handleFilter = async () => {
    if (!filterType) {
      displayPopup("Please select a filter type", "error");
      return;
    }

    try {
      setFilterLoading(true);
      const payload = { role_id: role_id };

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
          if (!startMonth || !endMonth) return displayPopup("Please select start and end month", "error");
          payload.start_month = startMonth.split("-")[1];
          payload.end_month = endMonth.split("-")[1];
          payload.year = startMonth.split("-")[0];
          break;
        case "yearRange":
          if (!startYear || !endYear) return displayPopup("Please enter start and end year", "error");
          payload.start_year = startYear;
          payload.end_year = endYear;
          break;
        default:
          return displayPopup("Invalid filter type selected", "error");
      }

      const response = await axios.post(`${API_BASE_URL}/filter-mda`, payload);
      
      if (response.data.success) {
        const filteredData = response.data.data || [];
        setFilteredMdaRecords(filteredData);
        setIsFilterApplied(true);
        if (filteredData.length === 0) {
          displayPopup("No records found for selected filter", "error");
        } else {
          displayPopup("Filter applied successfully!", "success");
        }
      } else {
        displayPopup(response.data.error || "Failed to apply filter", "error");
        setFilteredMdaRecords([]);
        setIsFilterApplied(false);
      }
    } catch (err) {
      console.error("Filter error:", err);
      displayPopup("Error applying filter", "error");
      setFilteredMdaRecords([]);
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
    setFilteredMdaRecords([]);
    setIsFilterApplied(false);
    displayPopup("Filters cleared", "success");
  };

  const handleMarkForShipment = async (mdaId) => {
    const roleId = sessionStorage.getItem("roleId");
    try {
      const res = await axios.post(`${API_BASE_URL}/mark-for-shipment`, {
        mda_id: mdaId,
        role_id: roleId,
      });

      if (res.data.success) {
        displayPopup("MDA marked as Ready for Shipment! Invoice generated.", "success");
        setMdaRecords((prev) =>
          prev.map((mda) =>
            mda.mda_id === mdaId
              ? {
                ...mda,
                dispatch_status: "Ready for Shipment",
                store_incharge: "You",
                invoice_path: res.data.invoice_path,
              }
              : mda
          )
        );
      } else {
        displayPopup(res.data.error || "Failed to mark MDA for shipment.", "error");
      }
    } catch (err) {
      console.error("Mark for shipment error:", err);
      displayPopup("Failed to mark MDA for shipment.", "error");
    }
  };

  const handleUploadExcel = async (file) => {
    if (!file) {
      displayPopup("Please select an Excel file first!", "error");
      return;
    }

    setUploading(true);

    try {
      const roleId = sessionStorage.getItem("roleId");
      const formData = new FormData();
      formData.append("excel_file", file);
      formData.append("role_id", roleId);

      const res = await axios.post(`${API_BASE_URL}/upload-mda-excel`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (res.data.success) {
        displayPopup("Excel uploaded successfully! MDAs created.", "success");
        setMdaRecords((prev) => [...res.data.data, ...prev]);
        setExcelFile(null);
      } else {
        displayPopup(res.data.error || "Failed to upload Excel", "error");
      }
    } catch (err) {
      console.error("Excel upload error:", err);
      displayPopup("Failed to upload Excel", "error");
    } finally {
      setUploading(false);
    }
  };

  const activeMdaRecords = isFilterApplied ? filteredMdaRecords : mdaRecords;

  const totalDispatches = activeMdaRecords.length;
  const totalValue = activeMdaRecords.reduce((sum, r) => sum + Number(r.total_value || 0), 0);
  const totalReceived = activeMdaRecords.reduce((sum, r) => sum + Number(r.payment_received || 0), 0);
  const fullyPaid = activeMdaRecords.filter((r) => Number(r.balance) === 0).length;

  const stats = [
    { title: "Total Dispatches", value: totalDispatches, icon: Clipboard, iconClass: "blue" },
    { title: "Total Order Value", value: `₹${totalValue.toLocaleString()}`, icon: DollarSign, iconClass: "amber" },
    { title: "Total Payment Received", value: `₹${totalReceived.toLocaleString()}`, icon: TrendingUp, iconClass: "emerald" },
    { title: "Fully Paid Orders", value: fullyPaid, icon: BarChart3, iconClass: "purple" },
  ];

  const AuthorizeModal = ({ show, onClose, onSubmit, remarks, setRemarks }) => {
    if (!show) return null;

    return (
      <div className="po-modal-overlay">
        <div className="po-modal-content">
          <h2>Authorize MDA</h2>
          <p>Are you sure you want to authorize this MDA:</p>
          <div className="po-modal-field">
            <label>Remarks (optional)</label>
            <input
              type="text"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Enter remarks (optional)"
            />
          </div>
          <div className="po-modal-actions">
            <button
              onClick={onSubmit}
              className="dmrr-submit-btn"
              type="button"
            >
              Authorize
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
                                    <h1 className="dmrr-title">Material Dispatch Advice (MDA)</h1>
                                  <p className="dmrr-subtitle">
                                    {canCreateMDA 
                                      ? "Overview of all dispatched materials and delivery status" 
                                      : "View-only access to Material Dispatch Advice"}
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

           
            {canCreateMDA ? (
            <div className="dmrr-form-container">
              <div className="dmrr-form-header">
                <h2 className="dmrr-form-title">
                  <FileText size={24} /> Material Dispatch Advice (MDA)
                </h2>
              </div>
              <div>
               
              </div>
              <form className="dmrr-form" onSubmit={handleSubmit}>
                <div className="dmrr-form-grid">
                  <div className="dmrr-form-field full-width">
                    <label className="dmrr-form-label">
                      <Clipboard size={16} /> Select Purchase Order <span className="required-asterisk">*</span>
                    </label>
                    <select
                      value={form.poId}
                      onChange={handlePOChange}
                      required
                      className="dmrr-form-input"
                    >
                      <option value="">-- Select Fully Paid PO --</option>
                      {purchaseOrders
                        .filter((po) => {
                          const isFullyPaid = po.payment_status === "Fully Paid" || parseFloat(po.balance || 0) === 0;
                          const hasAuthorizedMDA = mdaRecords.some(
                            (mda) => mda.po_id === po.po_id && mda.authorized
                          );
                          return isFullyPaid && !hasAuthorizedMDA;
                        })
                        .map((po) => (
                          <option key={po.po_id} value={po.po_id}>
                            {po.po_number} - {po.customer_name} (₹{po.total_value})
                          </option>
                        ))}
                    </select>
                  </div>

                  {[
                    { label: "Customer Name", name: "customerName", icon: User },
                    { label: "Address", name: "address", icon: Home, type: "textarea" },
                    { label: "GST Number", name: "gst", icon: Hash },
                    { label: "Product", name: "product", icon: Package },
                    { label: "Qty", name: "qty" },
                    { label: "Total Order Value", name: "totalValue", icon: DollarSign, readOnly: true },
                    { label: "Payment Received", name: "paymentReceived", icon: DollarSign, readOnly: true },
                    { label: "Balance Amount", name: "balance", icon: DollarSign, readOnly: true },
                  ].map((field, i) => (
                    <div
                      key={i}
                      className={`dmrr-form-field ${field.type === "textarea" ? "full-width" : ""}`}
                    >
                      <label className="dmrr-form-label">
                        {field.icon && <field.icon size={16} />} {field.label}<span className="required-asterisk">*</span>
                      </label>
                      {field.type === "textarea" ? (
                        <textarea
                          name={field.name}
                          value={form[field.name]}
                          onChange={handleChange}
                          className="dmrr-form-input"
                          placeholder={field.label}
                        />
                      ) : (
                        <input
                          name={field.name}
                          value={form[field.name]}
                          onChange={handleChange}
                          className="dmrr-form-input"
                          placeholder={field.label}
                          readOnly={field.readOnly || false}
                        />
                      )}
                    </div>
                  ))}

                  <div className="dmrr-form-field full-width">
                    <label className="dmrr-form-label">Remarks</label>
                    <input
                      name="remarks"
                      value={form.remarks}
                      onChange={handleChange}
                      className="dmrr-form-input"
                      placeholder="Enter remarks if any"
                    />
                  </div>
                </div>
                <div className="dmrr-form-actions" style={{ display: "flex", gap: "10px" }}>
                  <button type="submit" className="dmrr-submit-btn" disabled={submitting}>
                    <Plus size={16} /> {submitting ? "Creating..." : "Create MDA"}
                  </button>

                  <input
                    type="file"
                    accept=".xlsx, .xls"
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (file) {
                        setExcelFile(file);
                        handleUploadExcel(file);
                      }
                    }}
                    style={{ display: "none" }}
                    id="upload-excel"
                  />

                  <label
                    htmlFor="upload-excel"
                    className="dmrr-submit-btn"
                    style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: "5px" }}
                  >
                    <Upload size={16} /> Upload Excel
                    {uploading && <span>Uploading...</span>}
                  </label>
                </div>
              </form>
            </div>
            ) : (
              <div className="dmrr-no-permission">
                <h3 className="no-permission-heading">🚫 You don't have permission to create Material Dispatch Advice</h3>
                <p>
                  Please contact the <strong>Admin</strong> or <strong>Finance</strong> department if you need access.
                </p>
              </div>
            )}
             
            <div className="dmrr-filter-container">
              <h3><Filter size={18} /> Filter MDA Records</h3>
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
                  <Package size={20} /> MDA [Material Dispatch Advice]
                </h2>
                <span className="dmrr-table-count">
                  {activeMdaRecords.length} {activeMdaRecords.length === 1 ? "item" : "items"}
                </span>
              </div>

              {activeMdaRecords.length === 0 ? (
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
                        <th>MDA No</th>
                        <th>Date</th>
                        <th>Customer</th>
                        <th>Product</th>
                        <th>Qty</th>
                        <th>Total Value</th>
                        <th>Payment Received</th>
                        <th>Balance</th>
                        <th>Remarks</th>
                        <th>Authorized</th>
                        <th>Prepared by</th>
                        <th>Authorized by</th>
                        <th>AuthorizedDate</th>
                        <th>Dispatch Status</th>
                        <th>Shipment Status</th>
                      </tr>
                    </thead>
                    <tbody className="dmrr-table-body">
                      {activeMdaRecords.map((r, i) => (
                        <tr key={i} className="dmrr-table-row">
                          <td>{r.mda_no}</td>
                          <td>{r.created_at?.split(" ")[0]}</td>
                          <td>{r.customer_name}</td>
                          <td>{r.product_name}</td>
                          <td>{r.quantity}</td>
                          <td>₹{r.total_value}</td>
                          <td>₹{r.payment_received}</td>
                          <td>₹{r.balance}</td>
                          <td>{r.remarks}</td>
                          <td>
                            {r.authorized ? (
                              "✅ Yes"
                            ) : r.balance > 0 ? (
                              "⏳ Payment Pending"
                            ) : (
                              <button
                                className="dmrr-submit-btn"
                                onClick={() => openAuthorizeModal(r.mda_id || r.id)}
                              >
                                Authorize
                              </button>
                            )}
                          </td>
                          <td>{r.prepared_by}</td>
                          <td>{r.authorized_by}</td>
                          <td>{r.authorized_at?.split(" ")[0]}</td>
                          <td>{r.dispatch_status}</td>
                          <td>
                            {currentRole === "stores incharge" ? (
                              r.dispatch_status === "Ready to Dispatch" ? (
                                <button
                                  className="dmrr-submit-btn"
                                  onClick={() => handleMarkForShipment(r.mda_id)}
                                >
                                  Mark for Shipment
                                </button>
                              ) : r.dispatch_status === "Ready for Shipment" ? (
                                <>
                                  <span>Ready for Shipment</span>
                                  {r.invoice_path && (
                                    <a
                                      href={r.invoice_path}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      style={{ marginLeft: "10px" }}
                                    >
                                      View Invoice
                                    </a>
                                  )}
                                </>
                              ) : (
                                r.dispatch_status
                              )
                            ) : (
                              <span style={{ color: "#888" }}>N/A</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <AuthorizeModal
                show={showAuthorizeModal}
                onClose={() => setShowAuthorizeModal(false)}
                onSubmit={submitAuthorize}
                remarks={authorizeRemarks}
                setRemarks={setAuthorizeRemarks}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MDAPage;