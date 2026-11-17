import { useState, forwardRef, useImperativeHandle } from "react";
import { useNavigate } from "react-router-dom";
import PopupMessage from "../../../components/Popup/Popup";
import API_BASE_URL from "../../../config";

const RazorpayPayment = forwardRef(({ orderSummary, setPaymentLoading, shippingType, shippingCharge, max_standard_shipping, max_air_shipping,onPaymentClosed  }, ref) => {

    const navigate = useNavigate();
    const [popupMessage, setPopupMessage] = useState({ text: "", type: "" });
    const [showPopup, setShowPopup] = useState(false);

    const displayPopup = (text, type = "success") => {
        setPopupMessage({ text, type });
        setShowPopup(true);
        setTimeout(() => setShowPopup(false), 5000);
    };

    const startPayment = async () => {
        if (!orderSummary || !orderSummary.orders?.length) {
            displayPopup("Order details are required.", "error");
            return;
        }

        setPaymentLoading(true);
        const customerId = localStorage.getItem("customer_id");

        try {
            const response = await fetch(`${API_BASE_URL}/create-razorpay-order`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    customer_id: customerId,
                    order_products: orderSummary.orders.map(o => ({
                        order_id: o.order_id,
                        product_id: o.product_id,
                    })),
                    courier_id: orderSummary.orders[0].courier_id,
                    courier_name: orderSummary.orders[0].courier_name,
                    total_weight: orderSummary.total_weight,
                    shipping_type: shippingType,
                    // shipping_charge: shippingCharge,
                    ...(shippingType === "standard"
                        ? { shipping_charge: max_standard_shipping }
                        : { shipping_charge: max_air_shipping })
                }),
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error || "Failed to create Razorpay order.");

            const options = {
                key: data.razorpay_key,
                amount: (data.total_amount + shippingCharge) * 100,

                currency: "INR",
                name: "Dronekits",
                description: `Payment for Order(s): ${orderSummary.orders.map(o => o.order_id).join(", ")}`,
                order_id: data.razorpay_order_id,
                handler: () => {
                    displayPopup("Payment Successful!", "success");
                    setTimeout(() => navigate("/my-orders"), 2000);
                },
                modal: {
        ondismiss: () => {
            setPaymentLoading(false);  
            onPaymentClosed();         
        }
    },
                prefill: {
                    name: data.customer_name || "Customer",
                    email: data.email || "customer@example.com",
                    contact: data.mobile_no || "9876543210",
                },
                theme: { color: "#3399cc" },
            };

            const razorpay = new window.Razorpay(options);
            razorpay.open();
        } catch (error) {
            displayPopup("Error: " + error.message, "error");
        } finally {
            setPaymentLoading(false);
        }
    };

    useImperativeHandle(ref, () => ({
        startPayment
    }));

    return (
        <div>
            {showPopup && (
                <PopupMessage
                    message={popupMessage.text}
                    type={popupMessage.type}
                    onClose={() => setShowPopup(false)}
                />
            )}
        </div>
    );
});

export default RazorpayPayment;
