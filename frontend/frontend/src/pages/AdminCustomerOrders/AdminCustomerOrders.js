import { useEffect, useState } from "react";
import axios from "axios";
import "./AdminCustomerOrders.css";
import { Link } from "react-router-dom";
import { FaEye, FaEdit } from "react-icons/fa";
import generateInvoicePDF from "../Customer/CustomerInvoice/CustomerInvoice";
import API_BASE_URL from "../../config";
import { ClipLoader } from "react-spinners";

const Report = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const reportsPerPage = 15;
  
  // New state for edit modal
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingReport, setEditingReport] = useState(null);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState(null);
  const [editSuccess, setEditSuccess] = useState(null);

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const adminId = sessionStorage.getItem("admin_id");
        if (!adminId) {
          setError("Admin session expired. Please log in again.");
          return;
        }
        const response = await axios.post(
          `${API_BASE_URL}/get-payment-details-by-order`,
          { admin_id: adminId }
        );

        if (
          response.data.status_code === 200 &&
          Array.isArray(response.data.payments)
        ) {
          setReports(response.data.payments);
        } else {
          setError("Failed to load report data.");
        }
      } catch (err) {
        console.error("Error fetching reports:", err);
        setError("Something went wrong while fetching reports.");
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
  }, []);

  // NEW FUNCTION: Handle opening edit modal
  const handleOpenEditModal = (report) => {
    setEditingReport(report);
    setEditError(null);
    setEditSuccess(null);
    setEditModalOpen(true);
  };

  // NEW FUNCTION: Handle closing edit modal
  const handleCloseEditModal = () => {
    setEditModalOpen(false);
    setEditingReport(null);
    setEditError(null);
    setEditSuccess(null);
  };

  // NEW FUNCTION: Handle form field changes
  const handleEditFieldChange = (field, value) => {
    setEditingReport(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // NEW FUNCTION: Handle order product status changes
  const handleOrderProductStatusChange = (index, value) => {
    setEditingReport(prev => {
      const updatedOrderProducts = [...prev.order_products];
      updatedOrderProducts[index] = {
        ...updatedOrderProducts[index],
        order_status: value
      };
      return {
        ...prev,
        order_products: updatedOrderProducts
      };
    });
  };

  // NEW FUNCTION: Submit edit form
  const handleSubmitEdit = async () => {
    if (!editingReport) return;

    setEditLoading(true);
    setEditError(null);
    setEditSuccess(null);

    const adminId = sessionStorage.getItem("admin_id");
    if (!adminId) {
      setEditError("Admin session expired. Please log in again.");
      setEditLoading(false);
      return;
    }

    try {
      const requestData = {
        admin_id: parseInt(adminId),
        payment_id: editingReport.id,
        customer_id: editingReport.customer_id,
        payment_mode: editingReport.payment_mode || "",
        razorpay_payment_id: editingReport.razorpay_payment_id || "",
        db_payment_status:
  editingReport?.order_products?.[0]?.db_payment_status || "",

        invoice_number: editingReport.invoice_number || "",
        order_products: editingReport.order_products?.map(product => ({
          order_product_id: product.id,
          order_status: product.order_status || ""
        })) || []
      };

      const response = await axios.post(
        `${API_BASE_URL}/admin_edit_order_details`,
        requestData
      );

      if (response.data.status_code === 200) {
        setEditSuccess("Order details updated successfully!");
        
        // Update the reports list with edited data
        setReports(prevReports => 
          prevReports.map(report => 
            report.id === editingReport.id ? editingReport : report
          )
        );
        
        // Close modal after 2 seconds
        setTimeout(() => {
          handleCloseEditModal();
        }, 2000);
      } else {
        setEditError(response.data.error || "Failed to update order details.");
      }
    } catch (err) {
      console.error("Error updating order details:", err);
      setEditError(err.response?.data?.error || "Something went wrong while updating order.");
    } finally {
      setEditLoading(false);
    }
  };

  const indexOfLastReport = currentPage * reportsPerPage;
  const indexOfFirstReport = indexOfLastReport - reportsPerPage;
  const currentReports = reports.slice(indexOfFirstReport, indexOfLastReport);
  const totalPages = Math.ceil(reports.length / reportsPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);
  const goToFirstPage = () => setCurrentPage(1);
  const goToLastPage = () => setCurrentPage(totalPages);
  const nextPage = () =>
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  const prevPage = () => setCurrentPage((prev) => Math.max(prev - 1, 1));

  if (loading) {
    return (
      <div className="full-page-loading">
        <div className="loading-content">
          <ClipLoader size={50} color="#4450A2" />
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  const isOrderFullyPaid = (report) => {
    return report?.order_products?.every(
      (prod) => String(prod.order_status).trim().toLowerCase() === "paid"
    );
  };

  // Check if order can be edited (only when payment_status is "created")
  const canEditOrder = (report) => {
  return report?.order_products?.some(
    (product) =>
      String(product.db_payment_status || "")
        .trim()
        .toLowerCase() === "created"
  );
};


  return (
    <div className="report-wrapper">
      <h2 className="report-title report-title-heading">
        Ordered Payment Reports
      </h2>

      {error && <p className="error-text">{error}</p>}

      {!loading && !error && (
        <>
          <div className="report-table-container">
            <table className="report-table">
              <thead>
                <tr>
                  <th>S.No.</th>
                  <th>Name</th>
                  <th>Payment Date</th>
                  <th>Amount</th>
                  <th>Payment Method</th>
                  <th>Razorpay Order ID</th>
                  <th>Invoice</th>
                  <th>Shipping Status</th>
                  <th>Delivery Status</th>
                  <th>Cancellation Status</th>
                  <th>Edit Order</th>
                  <th>Details</th>
                </tr>
              </thead>

              <tbody>
                {currentReports.map((report, index) => {
                  const orderId = report.razorpay_order_id;
                  const editable = canEditOrder(report);

                  return (
                    <tr key={index}>
                      <td className="order-table-data">
                        {indexOfFirstReport + index + 1}
                      </td>
                      <td className="order-table-data">{report.customer_name}</td>
                      <td className="order-table-data">{report.payment_date}</td>
                      <td className="order-table-data">
                        ₹{report.total_amount}
                      </td>
                      <td className="order-table-data payment-mode">
                        {report.payment_mode}
                      </td>
                      <td>{orderId}</td>
                      <td className="order-table-data payment-mode">
                        {isOrderFullyPaid(report) ? (
                          <button
                            className="invoice-button-customer-order"
                            onClick={() =>
                              generateInvoicePDF(report.customer_id, report, "view")
                            }
                            title="View Invoice"
                          >
                            <FaEye />
                          </button>
                        ) : (
                          <span className="pending-invoice-text">Not Paid</span>
                        )}
                      </td>

                      <td className="order-table-data payment-mode">
                        {report.order_products?.length > 0
                          ? report.order_products.map((product, i) => (
                              <div key={i}>
                                {product.shipping_status?.toLowerCase() === "shipped"
  ? "Shipment Booked"
  : product.shipping_status || "Pending"}
                              </div>
                            ))
                          : "N/A"}
                      </td>

                      <td className="order-table-data payment-mode">
                        {report.order_products?.length > 0
                          ? report.order_products.map((product, i) => (
                              <div key={i}>
                                {product.delivery_status || "Pending"}
                              </div>
                            ))
                          : "N/A"}
                      </td>

                     <td className="order-table-data payment-mode">
  {(() => {
    const paymentTime = new Date(report.payment_date);
    const currentTime = new Date();
    const threeHours = 3 * 60 * 60 * 1000;

    const isWithinWindow =
      currentTime - paymentTime <= threeHours;

    if (report.cancel_status?.toLowerCase() === "cancelled") {
      return (
        <div className="cancelled-block">
          <span className="cancelled-text">Cancelled</span>
          <br />
          <small>
            {report.cancel_date ? `on ${report.cancel_date}` : ""}
          </small>
        </div>
      );
    }

    return isWithinWindow ? (
      <span className="active-text">Active</span>
    ) : (
      <span className="inactive-text">Inactive</span>
    );
  })()}
</td>

                      {/* NEW EDIT ORDER COLUMN */}
                      <td className="order-table-data">
                        <button
                          className={`edit-order-button ${!editable ? 'disabled' : ''}`}
                          onClick={() => editable && handleOpenEditModal(report)}
                          title={editable ? "Edit Order Details" : "Cannot edit - Order status is not 'created'"}
                          disabled={!editable}
                        >
                          <FaEdit />
                        </button>
                      </td>

                      <td>
                        <Link
                          to={`/admin-order-details/${orderId}`}
                          className="view-link"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="pagination-container">
            <button
              className="first-button"
              onClick={goToFirstPage}
              disabled={currentPage === 1}
            >
              First
            </button>

            <button
              className="previous-button"
              onClick={prevPage}
              disabled={currentPage === 1}
            >
              Previous
            </button>

            <span>
              Page {currentPage} of {totalPages}
            </span>

            <button
              className="next-button"
              onClick={nextPage}
              disabled={currentPage === totalPages}
            >
              Next
            </button>

            <button
              className="last-button"
              onClick={goToLastPage}
              disabled={currentPage === totalPages}
            >
              Last
            </button>
          </div>
        </>
      )}

      {/* NEW EDIT MODAL */}
      {editModalOpen && editingReport && (
        <div className="edit-modal-overlay">
          <div className="edit-modal">
            <div className="edit-modal-header">
              <h3>Edit Order Details</h3>
              <button className="close-modal-btn" onClick={handleCloseEditModal}>
                &times;
              </button>
            </div>
 <div className="modal-body">
            <div className="edit-modal-body">
              <div className="order-info-summary">
                <p><strong>Order ID:</strong> {editingReport.razorpay_order_id}</p>
                <p><strong>Customer:</strong> {editingReport.customer_name}</p>
                <p><strong>Amount:</strong> ₹{editingReport.total_amount}</p>
            <p>
  <strong>Current Status:</strong>{" "}
  {editingReport?.order_products?.[0]?.db_payment_status || "N/A"}
</p>


              </div>

              {editError && <div className="edit-error-message">{editError}</div>}
              {editSuccess && <div className="edit-success-message">{editSuccess}</div>}

              <div className="edit-form-section">
                <h4>Payment Details</h4>
                <div className="form-row">
                  <div className="form-group">
                    <label>Payment Mode</label>
                    <input
                      type="text"
                      value={editingReport.payment_mode || ""}
                      onChange={(e) => handleEditFieldChange("payment_mode", e.target.value)}
                      placeholder="e.g., upi, netbanking, card"
                    />
                  </div>
                  <div className="form-group">
                    <label>Razorpay Payment ID</label>
                    <input
                      type="text"
                      value={editingReport.razorpay_payment_id || ""}
                      onChange={(e) => handleEditFieldChange("razorpay_payment_id", e.target.value)}
                      placeholder="e.g., pay_RnVz8E6ZKkVWWj"
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Payment Status</label>
                    <select
                      value={editingReport.payment_status || ""}
                      onChange={(e) => handleEditFieldChange("payment_status", e.target.value)}
                    >
                      <option value="">Select Status</option>
                      <option value="created">Created</option>
                      
                      <option value="captured">Captured</option>
                     
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Invoice Number</label>
                    <input
                      type="text"
                      value={editingReport.invoice_number || ""}
                      onChange={(e) => handleEditFieldChange("invoice_number", e.target.value)}
                      placeholder="e.g., PVM29112025002"
                    />
                  </div>
                </div>
              </div>

              <div className="edit-form-section">
                <h4>Order Products Status</h4>
                {editingReport.order_products?.map((product, index) => (
                  <div key={product.id} className="order-product-item">
                    <div className="product-info">
                      <span className="product-name">{product.product_name}</span>
                      <span className="product-qty">Qty: {product.quantity}</span>
                    </div>
                    <div className="form-group">
                      <label>Order Status</label>
                      <select
                        value={product.order_status || ""}
                        onChange={(e) => handleOrderProductStatusChange(index, e.target.value)}
                      >
                        <option value="">Select Status</option>
                        <option value="Paid">Paid</option>
                        <option value="Pending">Pending</option>
                        
                        
                      </select>
                    </div>
                  </div>
                ))}
              </div>

              <div className="edit-modal-footer">
                <button className="cancel-btn" onClick={handleCloseEditModal}>
                  Cancel
                </button>
                <button 
                  className="save-btn" 
                  onClick={handleSubmitEdit}
                  disabled={editLoading}
                >
                  {editLoading ? (
                    <>
                      <ClipLoader size={16} color="#ffffff" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </button>
              </div>
            </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Report;