import { useEffect, useRef, useState } from 'react';
import './CustomerMyOrderDetails.css';
import { useLocation } from 'react-router-dom';
import { FaCircleArrowRight } from "react-icons/fa6";
import { MdCloudDownload } from "react-icons/md";
import { FaChevronDown, FaChevronUp, FaMapMarkerAlt, FaTruck } from "react-icons/fa";
import generateInvoicePDF from '../CustomerInvoice/CustomerInvoice';
import API_BASE_URL from "../../../config";
import { ClipLoader } from 'react-spinners';
import OrderTracking from './CustomerOrderTracking';

const CustomerMyOrderDetails = () => {
  const [orderDetails, setOrderDetails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [currentPaymentData, setCurrentPaymentData] = useState(null);
  const [isAddressExpanded, setIsAddressExpanded] = useState(false);
  const [isTrackingExpanded, setIsTrackingExpanded] = useState(false);
  const location = useLocation();
  const { payments, order, selected_product_id } = location.state || {};
  const customerId = localStorage.getItem("customer_id");
  const topRef = useRef(null);
  const addressRef = useRef(null);
  const trackingRef = useRef(null);

  const selfPickupAddresses = [
    {
      address_id: "pickup1",
      first_name: "Pavaman Aviation WareHouse",
      phone: "+91 906 313 3028",
      street: "2nd floor, Kapil Kavuri Hub, Financial District",
      mandal: "Nanakramguda",
      district: "Hyderabad",
      state: "Telangana",
      pincode: "500032",
    },
  ];

useEffect(() => {
  const fetchOrderData = async () => {
    if (!customerId) return;

    try {
      const response = await fetch(`${API_BASE_URL}/customer-my-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customer_id: customerId, action: "view" }),
      });

      const data = await response.json();

      if (data.status_code === 200) {
        const payments = data.payments || [];
        setOrderDetails(payments);

        if (order?.product_order_id) {
          const matchingPayment = payments.find(
            p => p.product_order_id === order.product_order_id
          );

          if (matchingPayment) {
            setCurrentPaymentData(matchingPayment);

            // ✅ SET PRODUCT FROM FRESH API RESPONSE
            const freshProduct = matchingPayment.order_products?.find(
              prod => prod.order_product_id === selected_product_id
            );

            setSelectedProduct(
              freshProduct || matchingPayment.order_products?.[0] || null
            );
          }
        }
      }
    } catch (error) {
      console.error('Fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  fetchOrderData();
}, [customerId, order?.product_order_id, selected_product_id]);

  // useEffect(() => {
  //   if (selected_product_id && order?.order_products?.length) {
  //     const initialProduct = order.order_products.find(
  //       (prod) => prod.order_product_id === selected_product_id
  //     );
  //     setSelectedProduct(initialProduct || order.order_products[0]);
  //   } else if (order?.order_products?.length) {
  //     setSelectedProduct(order.order_products[0]);
  //   }
  // }, [order, selected_product_id]);

  const handleProductClick = (product) => {
    setSelectedProduct(product);
    if (topRef.current) {
      topRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleGetInvoice = () => {
    if (selectedProduct) {
      generateInvoicePDF(customerId, order);
    }
  };

  const toggleAddress = () => {
    setIsAddressExpanded(!isAddressExpanded);
    if (!isAddressExpanded && addressRef.current) {
      setTimeout(() => {
        addressRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 100);
    }
  };

  const toggleTracking = () => {
    setIsTrackingExpanded(!isTrackingExpanded);
    if (!isTrackingExpanded && trackingRef.current) {
      setTimeout(() => {
        trackingRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 100);
    }
  };

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

  if (!orderDetails.length) return <div className="order-loader"><p>No orders found.</p></div>;

  const isOrderPaid = order?.order_products?.every(
    (prod) => String(prod.order_status || "").trim().toLowerCase() === "paid"
  );

  const otherProducts = order?.order_products?.filter(
    (prod) => prod.order_product_id !== selectedProduct?.order_product_id
  );

  // Convert Shipway status to customer-friendly status
const mapToCustomerStatus = (status, reason) => {
  if (!status) return "Pending";

  const normalizedStatus = status.trim().toLowerCase();
  const normalizedReason = reason?.trim().toLowerCase();

  if (normalizedStatus === "shipment booked") {
    return "Shipped";
  }

  if (normalizedStatus === "out for pickup") {
    return "Picked Up";
  }

  if (normalizedStatus === "in transit") {
    return "In Transit";
  }

  if (normalizedStatus === "out for delivery") {
    return "Out for Delivery";
  }

  if (normalizedStatus === "undelivered") {
    return "Delivery Attempted";
  }

  if (normalizedStatus === "delivered") {
    return "Delivered";
  }

  return status; // fallback
};

  // Get the current tracking status
  // const getCurrentTrackingStatus = () => {
  //   if (currentPaymentData?.tracking_data && currentPaymentData.tracking_data.length > 0) {
  //     const trackingData = currentPaymentData.tracking_data[0];
  //     if (trackingData?.current_status) {
  //       return trackingData.current_status;
  //     }
  //     if (trackingData?.tracking_history && trackingData.tracking_history.length > 0) {
  //       const shipmentHistory = trackingData.tracking_history.filter(
  //         item => item.type === 'shipment' || !item.type
  //       );
  //       if (shipmentHistory.length > 0) {
  //         return shipmentHistory[shipmentHistory.length - 1].status;
  //       }
  //     }
  //   }
  //   return selectedProduct?.order_status || 'Pending';
  // };

  const getCurrentTrackingStatus = () => {
  if (currentPaymentData?.tracking_data?.length > 0) {
    const trackingData = currentPaymentData.tracking_data[0];

    if (trackingData?.tracking_history?.length > 0) {
      const shipmentHistory = trackingData.tracking_history
        .filter(item => item.type === "shipment")
        .sort((a, b) => new Date(a.time) - new Date(b.time));

      if (shipmentHistory.length > 0) {
        const latest = shipmentHistory[shipmentHistory.length - 1];
        return mapToCustomerStatus(latest.status, latest.reason);
      }
    }
  }

  return selectedProduct?.order_status || "Pending";
};

  const trackingStatus = getCurrentTrackingStatus();

  return (
    <div className="order-box">
      <h4 className="main-heading">Order ID: {order?.product_order_id}</h4>

      {selectedProduct && (
        <div ref={topRef}>
          {/* Product Details - Always Visible */}
          <div className="custom-product-card highlight-product">
            <img
              src={selectedProduct.product_image}
              alt={selectedProduct.product_name}
              className="custom-product-image"
            />
            <div className="custom-product-info">
              <h5 className="custom-product-title">{selectedProduct.product_name}</h5>
              <p><strong>Quantity:</strong> {selectedProduct.quantity}</p>
              <p><strong>Price:</strong> ₹{selectedProduct.final_price?.toFixed(2)} (incl. GST)</p>
            </div>
          </div>

          {/* Collapsible Address Section */}
          {(selectedProduct.self_pickup_address || order?.customer_address?.length > 0) && (
            <div ref={addressRef} className="collapsible-section">
              <div 
                className="section-header" 
                onClick={toggleAddress}
                role="button"
                tabIndex={0}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    toggleAddress();
                  }
                }}
              >
                <div className="section-header-left">
                  <FaMapMarkerAlt className="section-icon" />
                  <h3>{selectedProduct.self_pickup_address ? 'Pickup Location' : 'Delivery Address'}</h3>
                  {!isAddressExpanded && (
                    <span className="section-preview">
                      {selectedProduct.self_pickup_address 
                        ? selfPickupAddresses[0].first_name
                        : order?.customer_address[0]?.street?.substring(0, 30) + '...'}
                    </span>
                  )}
                </div>
                <button className="section-toggle-btn">
                  {isAddressExpanded ? <FaChevronUp /> : <FaChevronDown />}
                </button>
              </div>
              
              <div className={`section-content ${isAddressExpanded ? 'expanded' : 'collapsed'}`}>
                {selectedProduct.self_pickup_address ? (
                  <div className="shipping-address-box">
                    <p><strong>{selfPickupAddresses[0].first_name}</strong></p>
                    <p>{selfPickupAddresses[0].street}</p>
                    <p>
                      {selfPickupAddresses[0].mandal},
                      {selfPickupAddresses[0].district},
                      {selfPickupAddresses[0].state} - {selfPickupAddresses[0].pincode}
                    </p>
                    <p><strong>Phone:</strong> {selfPickupAddresses[0].phone}</p>
                    <p><strong>Pickup Date:</strong> {selectedProduct.pickup_date}</p>
                    <p><strong>Pickup Slot:</strong> {selectedProduct.pickup_slot}</p>
                  </div>
                ) : (
                  order?.customer_address?.length > 0 && (
                    <div className="shipping-address-box">
                      <p><strong>{order.customer_name}</strong></p>
                      <p>{order.customer_address[0].street}, {order.customer_address[0].mandal}</p>
                      <p>{order.customer_address[0].district}, {order.customer_address[0].state} - {order.customer_address[0].pincode}</p>
                      <p><strong>Phone:</strong> {order.customer_address[0].mobile_number}</p>
                    </div>
                  )
                )}
              </div>
            </div>
          )}

          {/* Collapsible Tracking Section */}
          {currentPaymentData && (
            <div ref={trackingRef} className="collapsible-section">
              <div 
                className="section-header tracking-header-bg" 
                onClick={toggleTracking}
                role="button"
                tabIndex={0}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    toggleTracking();
                  }
                }}
              >
                <div className="section-header-left">
                  <FaTruck className="section-icon" />
                  <h3>Order Tracking</h3>
                  {!isTrackingExpanded && trackingStatus && (
                    <span className="section-preview tracking-preview">
                      {trackingStatus}
                    </span>
                  )}
                </div>
                <button className="section-toggle-btn">
                  {isTrackingExpanded ? <FaChevronUp /> : <FaChevronDown />}
                </button>
              </div>
              
              <div className={`section-content ${isTrackingExpanded ? 'expanded' : 'collapsed'}`}>
                <OrderTracking 
                  trackingData={currentPaymentData.tracking_data}
                  orderStatus={currentPaymentData.order_status}
                />
              </div>
            </div>
          )}

          {/* Payment Details - Always Visible */}
          <div className="payment-box">
            <h3>Payment Details</h3>
            <div className="payment-grid">
              <div className="payment-item">
                <span className="payment-label">Payment Mode:</span>
                <span className="payment-value">{order?.payment_mode || "N/A"}</span>
              </div>
              <div className="payment-item">
                <span className="payment-label">Payment Status:</span>
                <span className="payment-value status-badge">{selectedProduct?.payment_status || "N/A"}</span>
              </div>
              <div className="payment-item">
                <span className="payment-label">Product Total:</span>
                <span className="payment-value">₹{(selectedProduct.final_price * selectedProduct.quantity).toFixed(2)}</span>
              </div>

              {selectedProduct?.insurance_price && Number(selectedProduct.insurance_quantity) > 0 && (
                <div className="payment-item">
                  <span className="payment-label">Insurance:</span>
                  <span className="payment-value">₹{(selectedProduct.insurance_price * selectedProduct.insurance_quantity).toFixed(2)}</span>
                </div>
              )}

              <div className="payment-item">
                <span className="payment-label">Delivery Fee:</span>
                <span className="payment-value">+ ₹{selectedProduct.delivery_charge || 0}</span>
              </div>
              <div className="payment-item">
                <span className="payment-label">Shipping Charge:</span>
                <span className="payment-value">+ ₹{selectedProduct.shipping_charge || 0}</span>
              </div>
              <div className="payment-item">
                <span className="payment-label">Weight Charge:</span>
                <span className="payment-value">+ ₹{selectedProduct.weight_charge || 0}</span>
              </div>

              <div className="payment-item total">
                <span className="payment-label">Total Price:</span>
                <span className="payment-value total-amount">₹
                  {(
                    selectedProduct.final_price * selectedProduct.quantity +
                    (selectedProduct.insurance_price && Number(selectedProduct.insurance_quantity) > 0
                      ? selectedProduct.insurance_price * selectedProduct.insurance_quantity
                      : 0) +
                    parseFloat(selectedProduct.delivery_charge || 0) +
                    parseFloat(selectedProduct.shipping_charge || 0) +
                    parseFloat(selectedProduct.weight_charge || 0)
                  ).toFixed(2)}
                </span>
              </div>
            </div>

            {isOrderPaid && (
              <div className="invoice-button-wrapper">
                <button className="invoice-button" onClick={handleGetInvoice}>
                  Get Invoice <MdCloudDownload className="invoice-icon" />
                </button>

                {Number(selectedProduct?.insurance_price) > 0 && (
                  <a
                    href="https://pavaman.s3.ap-south-1.amazonaws.com/static/images/Drone_Insurance.pdf"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="invoice-button"
                  >
                    Insurance Policy 
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Other Products Section */}
          {otherProducts?.length > 0 && (
            <div className="other-products-section">
              <h4 className="other-items-heading">Other Items in this Order</h4>
              {otherProducts.map((product) => (
                <div key={product.order_product_id} className="custom-product-card other-product-card">
                  <img
                    src={product.product_image}
                    alt={product.product_name}
                    className="custom-product-image"
                  />
                  <div className="custom-product-info">
                    <h5 className="custom-product-title">{product.product_name}</h5>
                    <p>Quantity: {product.quantity}</p>
                    <p>Price: ₹{product.final_price?.toFixed(2)}</p>
                  </div>
                  <FaCircleArrowRight 
                    className="custom-arrow-button"
                    onClick={() => handleProductClick(product)}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CustomerMyOrderDetails;