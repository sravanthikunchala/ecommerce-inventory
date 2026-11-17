import React, { useState, useRef } from "react";
import { Plus, Package, FileText, Hash, User, Calendar, Receipt, IndianRupee, Upload } from "lucide-react";
import "./DmrrForm.css";
import API_BASE_URL from "../../config";
import axios from "axios";
import PopupMessage from "../../components/Popup/Popup";

const DmrrForm = ({ onReceiptAdded }) => {
  const roleId = sessionStorage.getItem("roleId");
  const roleType = sessionStorage.getItem("roleType"); 

  const [form, setForm] = useState({
    partNumber: "",
    hsnCode: "",
    componentName: "",
    supplier: "",
    invoiceNo: "",
    invoiceDate: "",
    poNumber: "",
    poDate: "",
    uom: "Nos",
    quantity: "",
    unitPrice: "",
    totalPrice: "",
    taxes: "",
  });

  const [loading, setLoading] = useState(false);
  const [excelLoading, setExcelLoading] = useState(false);
  const [popupMessage, setPopupMessage] = useState({ text: "", type: "" });
  const [showPopup, setShowPopup] = useState(false);
  const fileInputRef = useRef(null);

  const displayPopup = (text, type = "success") => {
    setPopupMessage({ text, type });
    setShowPopup(true);
    setTimeout(() => setShowPopup(false), 10000);
  };

 
  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((prevForm) => {
      const updatedForm = { ...prevForm, [name]: value };

     
      if (name === "quantity" || name === "unitPrice") {
        const quantity = parseFloat(
          name === "quantity" ? value : prevForm.quantity
        );
        const unitPrice = parseFloat(
          name === "unitPrice" ? value : prevForm.unitPrice
        );

        if (!isNaN(quantity) && !isNaN(unitPrice)) {
          updatedForm.totalPrice = (quantity * unitPrice);
        } else {
          updatedForm.totalPrice = "";
        }
      }

      return updatedForm;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const response = await axios.post(`${API_BASE_URL}/add-material-receipt`, {
        role_id: roleId,
        part_number: form.partNumber,
        hsn_code: form.hsnCode,
        component_name: form.componentName,
        supplier: form.supplier,
        invoice_no: form.invoiceNo,
        invoice_date: form.invoiceDate,
        po_no: form.poNumber,
        po_date: form.poDate,
        uom: form.uom,
        quantity: form.quantity,
        unit_price: form.unitPrice,
        total_price: form.totalPrice,
        taxes: form.taxes,
      });

      if (response.data.success) {
        displayPopup(response.data.message || "Receipt added successfully!", "success");
        onReceiptAdded(response.data.data);
        setForm({
          partNumber: "",
          hsnCode: "",
          componentName: "",
          supplier: "",
          invoiceNo: "",
          invoiceDate: "",
          poNumber: "",
          poDate: "",
          uom: "Nos",
          quantity: "",
          unitPrice: "",
          totalPrice: "",
          taxes: "",
        });
      } else {
        displayPopup(response.data.error || "Failed to add receipt", "error");
      }
    } catch (err) {
      console.error("Add receipt error:", err);
      displayPopup("Error while adding receipt", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) handleExcelUpload(e.target.files[0]);
  };

 
const handleExcelUpload = async (file, uploadType = "") => {
  const formData = new FormData();
  formData.append("excel_file", file);
  formData.append("role_id", roleId);

  let apiEndpoint = "";

  
  if (roleType === "stores incharge") {
    apiEndpoint = `${API_BASE_URL}/upload-material-receipt-excel`;
  } else if (roleType === "quality incharge") {
    apiEndpoint = `${API_BASE_URL}/inspect-material-excel`;
  } else if (roleType === "Admin") {
    if (uploadType === "receipt") {
      apiEndpoint = `${API_BASE_URL}/upload-material-receipt-excel`;
    } else if (uploadType === "inspection") {
      apiEndpoint = `${API_BASE_URL}/inspect-material-excel`;
    } else {
      displayPopup("Please select upload type first!", "error");
      return;
    }
  } else {
    displayPopup("You are not authorized to upload Excel", "error");
    return;
  }

  console.log("✅ Uploading to:", apiEndpoint);

  try {
    setExcelLoading(true);
    const response = await axios.post(apiEndpoint, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    if (response.data.success) {
      displayPopup("Excel uploaded successfully!", "success");

      const uploadedReceipts = response.data.added_receipts || response.data.data || [];
      const normalizedReceipts = uploadedReceipts.map((r) => ({
        id: r.id,
        partNumber: r.part_number || r.partNumber,
        componentName: r.component_name || r.componentName,
        supplier: r.supplier || "",
        quantity: r.quantity || r.accepted_quantity || 0,
        acceptedQuantity: r.accepted_quantity || 0,
        rejectedQuantity: r.rejected_quantity || 0,
        inspectionStatus: r.inspection_status || "",
        action: r.action || "",
      }));

      onReceiptAdded(normalizedReceipts);
    } else {
      displayPopup(response.data.message || "Failed to upload Excel", "error");
    }
  } catch (err) {
    console.error("Excel upload error:", err);
    displayPopup("Error uploading Excel", "error");
  } finally {
    setExcelLoading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }
};

  return (
    <div className="dmrr-form-container">
           {showPopup && (
                    <PopupMessage
                        message={popupMessage.text}
                        type={popupMessage.type}
                        onClose={() => setShowPopup(false)}
                    />
                )}

      <div className="dmrr-form-header">
        <h2 className="dmrr-form-title">
          <Plus size={20} /> {roleType === "quality incharge" ? "Inspect Material via Excel" : "Add New Material Receipt"}
        </h2>
      </div>

      <form onSubmit={handleSubmit} className="dmrr-form">
        
        {(roleType === "stores incharge" || roleType === "Admin") && (
          <div className="dmrr-form-grid">
            <div className="dmrr-form-field">
              <label className="dmrr-form-label"><Hash size={16} /> Part Number <span className="required-asterisk">*</span></label>
              <input name="partNumber" value={form.partNumber} onChange={handleChange} required className="dmrr-form-input" />
            </div>

            <div className="dmrr-form-field">
              <label className="dmrr-form-label"><FileText size={16} /> HSN Code <span className="required-asterisk">*</span></label>
              <input name="hsnCode" value={form.hsnCode} onChange={handleChange} required className="dmrr-form-input" />
            </div>

            <div className="dmrr-form-field">
              <label className="dmrr-form-label"><Package size={16} /> Component Name <span className="required-asterisk">*</span></label>
              <input name="componentName" value={form.componentName} onChange={handleChange} required className="dmrr-form-input" />
            </div>

            <div className="dmrr-form-field">
              <label className="dmrr-form-label"><User size={16} /> Supplier <span className="required-asterisk">*</span></label>
              <input name="supplier" value={form.supplier} onChange={handleChange} required className="dmrr-form-input" />
            </div>

            <div className="dmrr-form-field">
              <label className="dmrr-form-label"><Receipt size={16} /> Invoice No <span className="required-asterisk">*</span></label>
              <input name="invoiceNo" value={form.invoiceNo} onChange={handleChange} required className="dmrr-form-input" />
            </div>

            <div className="dmrr-form-field">
              <label className="dmrr-form-label"><Calendar size={16} /> Invoice Date <span className="required-asterisk">*</span></label>
              <input type="date" name="invoiceDate" value={form.invoiceDate} onChange={handleChange} required className="dmrr-form-input" />
            </div>

            <div className="dmrr-form-field">
              <label className="dmrr-form-label"><FileText size={16} /> PO Number <span className="required-asterisk">*</span></label>
              <input name="poNumber" value={form.poNumber} onChange={handleChange} required className="dmrr-form-input" />
            </div>

            <div className="dmrr-form-field">
              <label className="dmrr-form-label"><Calendar size={16} /> PO Date <span className="required-asterisk">*</span></label>
              <input type="date" name="poDate" value={form.poDate} onChange={handleChange} required className="dmrr-form-input" />
            </div>

            <div className="dmrr-form-field">
              <label className="dmrr-form-label"><Package size={16} /> UOM <span className="required-asterisk">*</span></label>
              <input name="uom" value={form.uom} onChange={handleChange} required className="dmrr-form-input" />
            </div>

            <div className="dmrr-form-field">
              <label className="dmrr-form-label"><Hash size={16} /> Quantity <span className="required-asterisk">*</span></label>
              <input name="quantity" type="number" value={form.quantity} onChange={handleChange} required min="1" className="dmrr-form-input" />
            </div>

            <div className="dmrr-form-field">
              <label className="dmrr-form-label"><IndianRupee size={16} /> Unit Price <span className="required-asterisk">*</span></label>
              <input name="unitPrice" value={form.unitPrice} onChange={handleChange} required className="dmrr-form-input" />
            </div>

            <div className="dmrr-form-field">
              <label className="dmrr-form-label"><IndianRupee size={16} /> Total Price <span className="required-asterisk">*</span></label>
              <input
                name="totalPrice"
                value={form.totalPrice}
                readOnly
                className="dmrr-form-input"
                style={{ backgroundColor: "#f8f8f8", cursor: "not-allowed" }}
              />
            </div>

            <div className="dmrr-form-field">
              <label className="dmrr-form-label"><IndianRupee size={16} /> Taxes <span className="required-asterisk">*</span></label>
              <input name="taxes" value={form.taxes} onChange={handleChange} required className="dmrr-form-input" />
            </div>
          </div>
        )}

        <div className="dmrr-form-actions">
          {(roleType === "stores incharge" || roleType === "Admin") && (
            <button type="submit" className="dmrr-submit-btn">
              <Plus size={20} /> {loading ? "Adding..." : "  Add Receipt"}
            </button>
          )}

          <div className="excel-upload-container">
  {(roleType === "Admin") ? (
    <>
      <label className="dmrr-upload-btn">
        <Upload size={20} /> {excelLoading ? "Uploading..." : "Upload Receipt Excel"}
        <input
          type="file"
          ref={fileInputRef}
          accept=".xlsx, .xls"
          onChange={(e) => e.target.files && handleExcelUpload(e.target.files[0], "receipt")}
          style={{ display: "none" }}
        />
      </label>

      <label className="dmrr-upload-btn" style={{ marginLeft: "10px" }}>
        <Upload size={20} /> {excelLoading ? "Uploading..." : "Upload Inspection Excel"}
        <input
          type="file"
          accept=".xlsx, .xls"
          onChange={(e) => e.target.files && handleExcelUpload(e.target.files[0], "inspection")}
          style={{ display: "none" }}
        />
      </label>
    </>
  ) : (
    <label className="dmrr-upload-btn">
      <Upload size={20} /> {excelLoading ? "Uploading..." : "Upload Excel"}
      <input
        type="file"
        ref={fileInputRef}
        accept=".xlsx, .xls"
        onChange={(e) => e.target.files && handleExcelUpload(e.target.files[0])}
        style={{ display: "none" }}
      />
    </label>
  )}
</div>
        </div>
      </form>
    </div>
  );
};

export default DmrrForm;