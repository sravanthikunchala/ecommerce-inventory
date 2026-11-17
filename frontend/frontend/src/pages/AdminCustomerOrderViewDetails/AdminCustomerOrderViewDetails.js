import { useEffect, useState } from 'react';
import { useParams } from "react-router-dom";
import axios from 'axios';
import "./AdminCustomerOrderViewDetails.css";
import PopupMessage from "../../components/Popup/Popup";
import API_BASE_URL from "../../config";
import { ClipLoader } from 'react-spinners';

const PaidOrderDetails = () => {
  const { orderId } = useParams();
  const [order, setOrder] = useState(null);
  const [productStatuses, setProductStatuses] = useState({});
  const [popupMessage, setPopupMessage] = useState({ text: "", type: "" });
  const [showPopup, setShowPopup] = useState(false);
  const [isloading, setIsLoading] = useState(true);

  const displayPopup = (text, type = "success") => {
    setPopupMessage({ text, type });
    setShowPopup(true);
    setTimeout(() => setShowPopup(false), 5000);
  };

  useEffect(() => {
    const fetchOrderDetails = async () => {
      try {
        setIsLoading(true);
        const adminId = sessionStorage.getItem("admin_id");

        const response = await axios.post(
          `${API_BASE_URL}/get-payment-details-by-order`,
          {
            razorpay_order_id: orderId,
            admin_id: adminId
          },
          { withCredentials: true }
        );

        const matchedOrder = response.data.payments.find(
          (payment) => payment.razorpay_order_id === orderId
        );

        if (matchedOrder) {
          setOrder(matchedOrder);

          const statuses = {};
          matchedOrder.order_products.forEach((product) => {
            statuses[product.order_product_id] = {
              shipped: product.shipping_status?.toLowerCase().trim() === "shipped",
              delivered: product.delivery_status?.toLowerCase().trim() === "delivered"
            };
          });

          setProductStatuses(statuses);
        }
      } catch (error) {
        console.error("Error fetching order details:", error);
        displayPopup("Failed to load order details", "error");
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrderDetails();
  }, [orderId]);

  const allshipped = Object.values(productStatuses).every(s => s.shipped);
  const allDelivered = Object.values(productStatuses).every(s => s.delivered);

  if (isloading) {
    return (
      <div className="full-page-loading">
        <div className="loading-content">
          <ClipLoader size={50} color="#4450A2" />
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (!order) return <div className="error-message">Order not found</div>;

  const {
    customer_name,
    email,
    mobile_number,
    customer_address,
    order_products,
    cancel_status,
    cancel_date,
    tracking_data
  } = order;

  const address = customer_address[0] || {};

  const formattedCancelDate = cancel_date
    ? new Date(cancel_date).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "-";

  const shipmentTracking =
    tracking_data?.[0]?.tracking_history
      ?.filter(item => item.type === "shipment")
      ?.sort((a, b) => new Date(a.time) - new Date(b.time)) || [];

  const showTracking = shipmentTracking.length > 0;
  const currentStepIndex = shipmentTracking.length - 1;

  // 🔹 Cancellation Window Logic (3 Hours)
const paymentTime = new Date(order.payment_date);
const currentTime = new Date();

const threeHoursInMs = 3 * 60 * 60 * 1000;

const isWithinCancellationWindow =
  currentTime - paymentTime <= threeHoursInMs;

  return (
    <div className="report-details-container">

      {showPopup && (
        <PopupMessage
          message={popupMessage.text}
          type={popupMessage.type}
          onClose={() => setShowPopup(false)}
        />
      )}

      {/* Remaining UI EXACTLY SAME — not modified */}
<div className="customer-address-box">
      <div className="details-row">

        <div className="details-column">
          <h2>Customer Details</h2>
          <div className="detail-item"><strong>Name:</strong> {customer_name}</div>
          <div className="detail-item"><strong>Email:</strong> {email}</div>
          <div className="detail-item"><strong>Mobile:</strong> {mobile_number}</div>
        </div>

        <div className="details-column">
          <h2>Delivery Address</h2>
          <div className="address-details-columns">
            <div className='first-address-details-column'>
                <div className='detail-item'><strong>Name:</strong> {address.customer_name}</div>
                <div className='detail-item'><strong>Mobile:</strong> {address.mobile_number}</div>
                <div className='detail-item'><strong>Alternate:</strong> {address.alternate_mobile}</div>
                <div className='detail-item'><strong>Type:</strong> {address.address_type}</div>
                <div className='detail-item'><strong>Street:</strong> {address.street}</div>
              </div>
             <div className='second-address-details-column'>
                <div className='detail-item'><strong>Village:</strong> {address.village}</div>
                <div className='detail-item'><strong>District:</strong> {address.district}</div>
                <div className='detail-item'><strong>State:</strong> {address.state}</div>
                <div className='detail-item'><strong>Pincode:</strong> {address.pincode}</div>
              </div>
          </div>
        </div>

      </div>
    </div>

    {/* ================= PRODUCT TABLE ================= */}

      <div className="product-details-table">
        <div className='product-details-table-heading'>
          <h3>Payment Order Details</h3>
          <h3 className='product_order-id'>
            Product Order ID: {order?.product_order_id}
          </h3>
        </div>

        <table>
          <thead className='table-order'>
            <tr>
              <th>Image</th>
              <th>Product Name</th>
              <th>Unit Price</th>
              <th>Discount</th>
              <th>Final Price</th>
              <th>Quantity</th>
              <th>Total</th>
              <th>Shipping Status</th>
              <th>Delivery Status</th>
              <th>Cancellation Status</th>
              <th>Cancelled Date</th>
              {/* <th>Shipping</th>
              <th>Deliver</th> */}
            </tr>
          </thead>

          <tbody>
            {order_products.map((item) => {
              const productId = item.order_product_id;

              const isCancelled =
                cancel_status?.toLowerCase() === "cancelled" ||
                item.order_status?.toLowerCase() === "cancelled";

              return (
                <tr key={productId} className={isCancelled ? "cancelled-row" : ""}>
                  <td>
                    {item.product_image ? (
                      <img src={item.product_image} alt={item.product_name} height="50" />
                    ) : "No image"}
                  </td>

                  <td>{item.product_name}</td>
                  <td>₹{item.price}</td>
                  <td>{item.discount}</td>
                  <td>₹{item.final_price}</td>
                  <td>{item.quantity}</td>
                  <td>₹{(item.final_price * item.quantity).toFixed(2)}</td>

                  <td>
  {productStatuses[productId]?.shipped
    ? "Shipment Booked"
    : "Pending"}
</td>
                  <td>{productStatuses[productId]?.delivered ? "Delivered" : "Pending"}</td>

                  <td>
  {isCancelled
    ? "Cancelled"
    : isWithinCancellationWindow
    ? "Active"
    : "Inactive"}
</td>
                  <td>
  {isCancelled ? formattedCancelDate : "-"}
</td>

                  {/* Now read-only checkboxes */}
                  {/* <td>
                    <input
                      type="checkbox"
                      checked={productStatuses[productId]?.shipped || false}
                      disabled
                    />
                  </td>

                  <td>
                    <input
                      type="checkbox"
                      checked={productStatuses[productId]?.delivered || false}
                      disabled
                    />
                  </td> */}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

     
    {/* ================= TRACKING SECTION ================= */}

    {showTracking && (
      <div className="admin-tracking-container">
        <div className="tracking-heading">Shipment Tracking</div>

        <div className="tracking-timeline">
          {shipmentTracking.map((track, index) => {
            const formattedTime = track.time
              ? new Date(track.time).toLocaleString("en-IN", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "-";

            const isCompleted = index < currentStepIndex;
            const isCurrent = index === currentStepIndex;

            return (
              <div
                key={index}
                className={`tracking-step ${
                  isCompleted
                    ? "completed"
                    : isCurrent
                    ? "current"
                    : "upcoming"
                }`}
              >
                <div className="tracking-icon">
                  {isCompleted ? "✓" : isCurrent ? "●" : "○"}
                </div>

                <div>
                  <div className="tracking-status">{track.status}</div>
                  {track.reason && (
                    <div className="tracking-reason">{track.reason}</div>
                  )}
                  <div className="tracking-time">{formattedTime}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    )}

  </div>
);

};

export default PaidOrderDetails;
