import { useState, useEffect } from "react";
import { useRef } from "react";
import RazorpayPayment from "../CustomerPayment/CustomerPayment";
import "./CustomerOrderSummary.css";
import defaultImage from "../../../assets/images/product.png";
import PopupMessage from "../../../components/Popup/Popup";
import API_BASE_URL from "../../../config";
import { useNavigate } from "react-router-dom";
import { ClipLoader } from "react-spinners";
import { FaTruck, FaPlane,  FaCheckCircle, FaBox } from "react-icons/fa";

const OrderSummary = ({ orderSummary, setOrderSummary = () => { }, setPopup = () => { } }) => {
    const navigate = useNavigate();
    const [orders, setOrders] = useState(orderSummary?.orders || []);
    const [showPayment, setShowPayment] = useState(false);
    const paymentRef = useRef(null);

    const [popupMessage, setPopupMessage] = useState({ text: "", type: "" });
    const [showPopup, setShowPopup] = useState(false);
    const [paymentLoading, setPaymentLoading] = useState(false);
    const [shippingType, setShippingType] = useState("standard");
    
    const displayPopup = (text, type = "success") => {
        setPopupMessage({ text, type });
        setShowPopup(true);
        setTimeout(() => setShowPopup(false), 5000);
    };
    const handlePaymentClosed = () => {
    setPaymentLoading(false);
    setShowPayment(false); 
};


    const shippingCharge =
        shippingType === "standard"
            ? orderSummary.max_standard_shipping
            : orderSummary.max_air_shipping;
    
    const grandTotal =
        orders.reduce((sum, order) => sum + order.quantity * order.final_price, 0) +
        shippingCharge;

    useEffect(() => {
        setOrders(orderSummary?.orders || []);
    }, [orderSummary]);

    useEffect(() => {
        if (showPayment && paymentRef.current) {
            paymentRef.current.startPayment();
        }
    }, [showPayment]);

    const handleCancelOrder = async () => {
        const customerId = localStorage.getItem("customer_id");

        const ordersToCancel = orders
            .filter(order => order?.order_id && order?.product_id)
            .map(order => ({
                order_id: order.order_id,
                product_id: order.product_id
            }));
        
        if (!customerId || ordersToCancel.length === 0) {
            displayPopup("Missing order details. Cannot cancel.", "error");
            return;
        }
        
        try {
            const response = await fetch(`${API_BASE_URL}/products/cancel-multiple-orders`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ customer_id: customerId, orders: ordersToCancel }),
            });
            const data = await response.json();
            
            if (response.ok) {
                const cancelled_orders = data.cancelled_orders || [];
                const failed_orders = data.failed_orders || [];
                
                if (cancelled_orders.length > 0) {
                    setPopup({ text: "Selected orders have been successfully cancelled!", type: "success" });

                    setOrders(prevOrders =>
                        prevOrders.filter(order =>
                            !cancelled_orders.some(canceled => canceled.order_id === order.order_id)
                        )
                    );
                    
                    setOrderSummary(prevSummary => ({
                        ...prevSummary,
                        orders: prevSummary.orders.filter(order =>
                            !cancelled_orders.some(canceled => canceled.order_id === order.order_id)
                        ),
                    }));
                    
                    setTimeout(() => {
                        navigate("/view-cart-products");
                    }, 2000);
                }
                
                if (failed_orders.length > 0) {
                    displayPopup(`Some orders could not be cancelled:\n${failed_orders.map(f => f.message).join("\n")}`, "error");
                }
            } else {
                displayPopup(data.error || "Failed to cancel orders.", "error");
            }
        } catch (error) {
            console.error("Error cancelling orders:", error);
            displayPopup("An error occurred while cancelling orders.", "error");
        }
    };

    if (!orderSummary || !orderSummary.orders || orderSummary.orders.length === 0) return null;
    
    return (
        <div className="order-summary container">
            <div className="order-section-header">
                <FaBox style={{ marginRight: '12px' }} />
                Order Summary
            </div>
            
            {showPopup && (
                <PopupMessage
                    message={popupMessage.text}
                    type={popupMessage.type}
                    onClose={() => setShowPopup(false)}
                />
            )}
            
            <div>
                {showPayment && orderSummary?.orders?.length > 0 && (
                    <RazorpayPayment
                        ref={paymentRef}
                        orderSummary={orderSummary}
                        setPaymentLoading={setPaymentLoading}
                        shippingType={shippingType}
                        shippingCharge={shippingCharge}
                        max_standard_shipping={orderSummary.max_standard_shipping}
                        max_air_shipping={orderSummary.max_air_shipping}
                        onPaymentClosed={handlePaymentClosed} 
                    />
                )}
            </div>
            
            <div className="order-items-container">
                {orders.map((order, index) => (
                    <div key={order.order_id} className="order-item">
                        <div className="order-image">
                            <img
                                src={order.product_images}
                                alt="Product"
                                onError={(e) => {
                                    e.target.onerror = null;
                                    e.target.src = defaultImage;
                                }}
                            />
                        </div>
                        <div className="order-details">
                            <div className="order-product-title">
                                {order.product_name}
                            </div>
                            
                            <div className="order-price-section">
                                <div className="order-discount-price">
                                    {(order.final_price ?? 0).toFixed(2)}
                                </div>
                                {parseFloat(order.final_price).toFixed(2) !== parseFloat(order.product_price).toFixed(2) && (
                                    <div className="order-original-price">
                                        ₹ {order.product_price}(incl. GST)
                                    </div>
                                )}
                            </div>
                            
                            <div className="quantity-badge">
                                Quantity: {order.quantity}
                            </div>
                            
                            <div className="total-price-badge">
                                Total: ₹ {(order.quantity * order.final_price).toFixed(2)}
                            </div>
                     
{order.with_insurance && (
    <div className="insurance-badge-co" style={{ marginTop: "6px" }}>
        <strong>Insurance Included:</strong>{" "}
        ₹{Number(order.insurance_price).toFixed(2)} × {order.insurance_quantity}
        {" "} = ₹{Number(order.total_insurance).toFixed(2)}
    </div>
)}



                        </div>
                    </div>
                ))}
            </div>

           
          
{!orderSummary?.isSelfPickup && (
    <div className="shipping-section">
        <h3><FaTruck /> Select Shipping Method</h3>
        <div className="shipping-options">
            <div 
                className={`shipping-option ${shippingType === "standard" ? "selected" : ""}`}
                onClick={() => setShippingType("standard")}
            >
                <input
                    type="radio"
                    name="shippingType"
                    value="standard"
                    checked={shippingType === "standard"}
                    onChange={() => setShippingType("standard")}
                />
                <div className="shipping-header">
                    <div className="shipping-type">
                        <div className="shipping-icon">
                            <FaTruck />
                        </div>
                        <span className="shipping-name">Standard Shipping</span>
                    </div>
                    <div className="shipping-price">
                        ₹{orderSummary.total_standard_shipping}
                    </div>
                </div>
                <div className="shipping-time">
                    <FaCheckCircle style={{ color: '#4450A2' }} />
                    Estimated delivery: 5-7 business days
                </div>
            </div>

            <div 
                className={`shipping-option ${shippingType === "air" ? "selected" : ""}`}
                onClick={() => setShippingType("air")}
            >
                <input
                    type="radio"
                    name="shippingType"
                    value="air"
                    checked={shippingType === "air"}
                    onChange={() => setShippingType("air")}
                />
                <div className="shipping-header">
                    <div className="shipping-type">
                        <div className="shipping-icon air-icon">
                            <FaPlane />
                        </div>
                        <span className="shipping-name">Express Air Shipping</span>
                    </div>
                    <div className="shipping-price">
                        ₹{orderSummary.total_air_shipping}
                    </div>
                </div>
                <div className="shipping-time">
                    <FaCheckCircle style={{ color: '#4450A2' }} />
                    Estimated delivery: 2-3 business days
                </div>
            </div>
        </div>
    </div>
)}


            
            {orders.length > 0 && (() => {
                const weightCharge = orders.reduce(
                    (acc, item) => acc + Number(item.weight_charge || 0),
                    0
                );
const insuranceTotal = orders.reduce(
    (sum, item) =>
        sum + (item.with_insurance ? Number(item.total_insurance || 0) : 0),
    0
);

                const productsTotal = orders.reduce(
                    (sum, order) => sum + order.quantity * order.final_price,
                    0
                );

                const shippingCharge =
                    shippingType === "standard"
                        ? Number(orderSummary.total_standard_shipping || 0)
                        : Number(orderSummary.total_air_shipping || 0);

                const grandTotal =
    productsTotal +
    shippingCharge +
    weightCharge +
    insuranceTotal;


                return (
                    <div className="order-total-summary-container">
                        <h3>Payment Summary</h3>
                        <div className="order-total-summary">
                            <div className="summary-row">
                                <span className="summary-label">Subtotal ({orders.length} items)</span>
                                <span className="summary-value">₹ {productsTotal.toFixed(2)}</span>
                            </div>
                            
                            {!orderSummary?.isSelfPickup && (
                            <div className="summary-row">
                                <span className="summary-label">Platform Fee</span>
                                <span className="summary-value">₹ 0.00</span>
                            </div>
                            )}
                            
                          
{!orderSummary?.isSelfPickup && (
    <div className="summary-row weight-charge">
        <span className="summary-label">
            Weight Charges
        </span>
        <span className="summary-value">₹ {weightCharge.toFixed(2)}</span>
    </div>
)}

                            
{!orderSummary?.isSelfPickup && (
    <div className="summary-row">
        <span className="summary-label">
            {shippingType === "standard"
                ? "Standard Shipping"
                : "Express Air Shipping"}
        </span>
        <span className="summary-value">₹ {shippingCharge.toFixed(2)}</span>
    </div>
)}
{insuranceTotal > 0 && (
    <div className="summary-row">
        <span className="summary-label">Insurance Charges</span>
        <span className="summary-value">₹ {insuranceTotal.toFixed(2)}</span>
    </div>
)}


                            
                            <div className="summary-row grand-total">
                                <span className="summary-label">Grand Total</span>
                                <span className="summary-value">₹ {grandTotal.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>
                );
            })()}

          
            <div className="cart-actions">
                <button
                    className="cart-place-order loading-btn"
                    onClick={() => {
    setPaymentLoading(true);
    setShowPayment(false);   
    setTimeout(() => {
        setShowPayment(true);  
        orderSummary.grandTotal = grandTotal;
    }, 0);
}}

                    disabled={paymentLoading}
                >
                    {paymentLoading ? (
                        <ClipLoader size={20} color="#ffffff" />
                    ) : (
                        "Continue to Payment"
                    )}
                </button>
                <button className="cart-delete-selected" onClick={handleCancelOrder}>Cancel Order</button>
            </div>
        </div>
    );
};

export default OrderSummary;