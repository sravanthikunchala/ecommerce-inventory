import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../CustomerViewCart/CustomerViewCart.css"
import { RiDeleteBinLine } from "react-icons/ri";
import { MdCancel } from "react-icons/md";
import PopupMessage from "../../../components/Popup/Popup";
import { Link } from "react-router-dom";
import { FaShoppingCart } from "react-icons/fa";
import API_BASE_URL from "../../../config";
import { ClipLoader } from "react-spinners";
import { FaShieldAlt } from "react-icons/fa";

const CustomerViewCart = () => {
    const navigate = useNavigate();
    const [cartItems, setCartItems] = useState([]);
    const [total_price, setTotalPrice] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [selectedProducts, setSelectedProducts] = useState([]);
    const [popupMessage, setPopupMessage] = useState({ text: "", type: "" });
    const [showPopup, setShowPopup] = useState(false);

    useEffect(() => {
        fetchCartData();
    }, []);

    useEffect(() => {
        const handleSearch = (e) => {
            const query = e.detail?.trim();
            if (!query) {
                setError("");
                setLoading(true);
                fetchCartData();
            } else {
                searchCart(query);
            }
        };

        window.addEventListener("customerCategorySearch", handleSearch);
        return () => window.removeEventListener("customerCategorySearch", handleSearch);
    }, []);

    const displayPopup = (text, type = "success") => {
        setPopupMessage({ text, type });
        setShowPopup(true);

        setTimeout(() => {
            setShowPopup(false);
        }, 5000);
    };

    const fetchCartData = async () => {
        const customer_id = localStorage.getItem("customer_id");

        if (!customer_id) {
            setLoading(false);
            displayPopup(
                <>
                    Please <Link to="/customer-login" className="popup-link">log in</Link> to view your cart.
                </>,
                "error"
            );
            return;
        }

        try {
            setLoading(true);
            const response = await fetch(`${API_BASE_URL}/view-cart-products`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ customer_id }),
            });

            const data = await response.json();

            if (data.status_code === 200) {
                const processedItems = (data.cart_items || []).map(item => {
                    const withInsurance = item.with_insurance === true || item.with_insurance === "true";
                    const insuranceQuantity = parseInt(item.insurance_quantity) || 1;
                    const insurancePrice = parseFloat(item.insurance_price) || 0;
                    const insuranceTotal = insurancePrice * insuranceQuantity;

                    return {
                        ...item,
                        with_insurance: withInsurance,
                        insurance_quantity: insuranceQuantity,
                        insurance_price: insurancePrice,
                        insurance_total: insuranceTotal,
                        unique_key: `${item.cart_id || item.product_id}_${withInsurance ? 'with_insurance' : 'without_insurance'}`,
                        base_price: parseFloat(item.final_price) || 0,
                        final_price: parseFloat(item.final_price) || 0
                    };
                });
                
                setCartItems(processedItems);
                
                const totalWithInsurance = processedItems.reduce((total, item) => {
                    return total +
                        (item.final_price * item.quantity) +
                        (item.insurance_total || 0);
                }, 0);
                
                setTotalPrice(totalWithInsurance || 0);
                setError("");
            } else {
                setError(data.message || "Failed to fetch cart.");
            }
        } catch (error) {
            setError("An unexpected error occurred.");
        } finally {
            setLoading(false);
        }
    };

    const handleInsuranceQuantityChange = async (product_id, change) => {
        const customer_id = localStorage.getItem("customer_id");

        if (!customer_id) {
            displayPopup(
                <>
                    Please <Link to="/customer-login" className="popup-link">log in</Link> to update cart.
                </>,
                "error"
            );
            return;
        }

        setLoading(true);
        
        const currentItem = cartItems.find(item => item.product_id === product_id);
        if (!currentItem) return;

        const currentInsuranceQty = currentItem.insurance_quantity || 1;
const maxAllowedQty = currentItem.quantity;

if (change > 0 && currentInsuranceQty >= maxAllowedQty) {
    displayPopup("Insurance quantity cannot exceed product quantity.", "error");
    setLoading(false);
    return;
}

const newInsuranceQty = Math.max(1, currentInsuranceQty + change);



        try {
            setCartItems(prevItems => {
                const updated = prevItems.map(item =>
                    item.product_id === product_id && item.with_insurance
                        ? {
                            ...item,
                            insurance_quantity: newInsuranceQty,
                            insurance_total: (item.insurance_price || 0) * newInsuranceQty
                        }
                        : item
                );

                const newTotal = updated.reduce(
                    (sum, item) =>
                        sum +
                        (item.final_price * item.quantity) +
                        (item.insurance_total || 0),
                    0
                );

                setTotalPrice(newTotal);
                return updated;
            });

            const response = await fetch(`${API_BASE_URL}/update-cart-quantity`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    customer_id,
                    product_id,
                    insurance_quantity: newInsuranceQty,
                    with_insurance: true
                }),
            });

            const data = await response.json();

            if (data.status_code !== 200) {
                displayPopup(data.error || "Failed to update insurance quantity.", "error");
                
                setCartItems(prevItems => {
                    const reverted = prevItems.map(item =>
                        item.product_id === product_id && item.with_insurance
                            ? {
                                ...item,
                                insurance_quantity: currentInsuranceQty,
                                insurance_total: (item.insurance_price || 0) * currentInsuranceQty
                            }
                            : item
                    );

                    const revertedTotal = reverted.reduce(
                        (sum, item) =>
                            sum +
                            (item.final_price * item.quantity) +
                            (item.insurance_total || 0),
                        0
                    );

                    setTotalPrice(revertedTotal);
                    return reverted;
                });
            } else {
                displayPopup("Insurance quantity updated!", "success");
            }
        } catch (error) {
            displayPopup("An unexpected error occurred.", "error");
            
            setCartItems(prevItems => {
                const reverted = prevItems.map(item =>
                    item.product_id === product_id && item.with_insurance
                        ? {
                            ...item,
                            insurance_quantity: currentInsuranceQty,
                            insurance_total: (item.insurance_price || 0) * currentInsuranceQty
                        }
                        : item
                );

                const revertedTotal = reverted.reduce(
                    (sum, item) =>
                        sum +
                        (item.final_price * item.quantity) +
                        (item.insurance_total || 0),
                    0
                );

                setTotalPrice(revertedTotal);
                return reverted;
            });
        } finally {
            setLoading(false);
        }
    };

    const handleRemoveInsurance = async (product_id) => {
        const customer_id = localStorage.getItem("customer_id");

        if (!customer_id) {
            displayPopup(
                <>
                    Please <Link to="/customer-login" className="popup-link">log in</Link> to update cart.
                </>,
                "error"
            );
            return;
        }

        try {
            setLoading(true);

            const response = await fetch(`${API_BASE_URL}/delete-cart-product`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    customer_id,
                    product_id,
                    delete_insurance: true
                }),
            });

            const data = await response.json();

            if (data.status_code === 200) {
                displayPopup("Insurance removed from product!", "success");

                setCartItems(prevItems => {
                    const updated = prevItems.map(item =>
                        item.product_id === product_id && item.with_insurance
                            ? {
                                ...item,
                                with_insurance: false,
                                insurance_quantity: 0,
                                insurance_total: 0,
                                insurance_price: 0,
                                final_price: item.base_price,
                                unique_key: `${item.cart_id || item.product_id}_without_insurance`
                            }
                            : item
                    );

                    const newTotal = updated.reduce(
                        (sum, item) =>
                            sum +
                            (item.final_price * item.quantity) +
                            (item.insurance_total || 0),
                        0
                    );

                    setTotalPrice(newTotal);
                    return updated;
                });

                setTimeout(fetchCartData, 800);
            } else {
                displayPopup(data.error || "Failed to remove insurance.", "error");
            }
        } catch (error) {
            displayPopup("An unexpected error occurred.", "error");
        } finally {
            setLoading(false);
        }
    };

    const searchCart = async (query) => {
        setLoading(true);
        setError("");

        const customer_id = localStorage.getItem("customer_id");

        if (!customer_id) {
            displayPopup(
                <>
                    Please <Link to="/customer-login" className="popup-link">log in</Link> to search your cart.
                </>,
                "error"
            );
            setLoading(false);
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/customer-cart-view-search`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ customer_id, product_name: query }),
            });

            const data = await response.json();

            if (data.status_code === 200) {
                const items = data.cart_items || [];

                if (items.length === 0) {
                    setCartItems([]);
                    setTotalPrice(0);
                    setError(data.message || "No items found.");
                } else {
                    const normalizedItems = items.map((item) => {
                        const discountPercent = item.discount
                            ? parseFloat(item.discount.replace('%', '')) || 0
                            : 0;
                        const discountAmount = (item.price || 0) * (discountPercent / 100);
                        
                        const withInsurance = item.with_insurance === true || item.with_insurance === "true";
                        const insuranceAmount = parseFloat(item.insurance_amount) || 0;
                        const basePrice = item.price || item.final_price || 0;

                        return {
                            ...item,
                            price_per_item: basePrice,
                            discounted_amount: discountAmount,
                            with_insurance: withInsurance,
                            insurance_amount: insuranceAmount,
                            base_price: basePrice,
                            final_price: withInsurance ? basePrice + insuranceAmount : basePrice,
                            unique_key: `${item.cart_id || item.product_id}_${withInsurance ? 'with_insurance' : 'without_insurance'}`
                        };
                    });

                    setCartItems(normalizedItems);
                    
                    const totalWithInsurance = normalizedItems.reduce(
                        (acc, item) => acc + (item.final_price * item.quantity),
                        0
                    );
                    
                    setTotalPrice(totalWithInsurance || 0);
                    setError("");
                }
            } else {
                setError(data.message || "Failed to search cart.");
            }
        } catch (error) {
            setError("An unexpected error occurred during search.");
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteCartItem = async (product_id) => {
        const customer_id = localStorage.getItem("customer_id");
        if (!customer_id) {
            displayPopup(
                <>
                    Please <Link to="/customer-login" className="popup-link">log in</Link> to manage your cart.
                </>,
                "error"
            );
            navigate("/customer-login");
            return;
        }

        try {
            setLoading(true);
            const response = await fetch(`${API_BASE_URL}/delete-cart-product`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ customer_id, product_id }),
            });

            const data = await response.json();

            if (data.status_code === 200) {
                const updatedCart = cartItems.filter(item => item.product_id !== product_id);
                setCartItems(updatedCart);
                const newTotal = updatedCart.reduce((sum, item) => 
                    sum + (item.final_price * item.quantity) + (item.insurance_total || 0), 0
                );
                setTotalPrice(newTotal);

                displayPopup("Product removed from cart!", "success");

                window.dispatchEvent(new Event("cartUpdated"));
            } else {
                setError(data.error || "Failed to delete product from cart.");
            }
        } catch (error) {
            setError("An unexpected error occurred.");
        } finally {
            setLoading(false);
        }
    };

    const calculatePrice = (items) => {
        return items.reduce((sum, item) => sum + (item.base_price * item.quantity), 0);
    };

    const calculateTotalPrice = (items) => {
        return items.reduce((sum, item) => 
            sum + (item.final_price * item.quantity) + (item.insurance_total || 0), 0
        );
    };

    const calculateSelectedPrice = () => {
        const selectedItems = cartItems.filter(item => selectedProducts.includes(item.unique_key));
        return selectedItems.reduce((sum, item) => sum + (item.base_price * item.quantity), 0);
    };

    const calculateSelectedTotal = () => {
        const selectedItems = cartItems.filter(item => selectedProducts.includes(item.unique_key));
        return selectedItems.reduce((sum, item) => 
            sum + (item.final_price * item.quantity) + (item.insurance_total || 0), 0
        );
    };

    const calculateTotalDiscount = () => {
        return cartItems.reduce((acc, item) => acc + (item.discounted_amount || 0) * item.quantity, 0);
    };

    const calculateSelectedDiscount = () => {
        return cartItems
            .filter(item => selectedProducts.includes(item.unique_key))
            .reduce((acc, item) => acc + (item.discounted_amount || 0) * item.quantity, 0);
    };
    
    const calculateTotalGST = () => {
        return cartItems
            .reduce((acc, item) => {
                const gstPercent = parseFloat(item.gst) || 0;
                return acc + item.base_price * item.quantity * (gstPercent / 100);
            }, 0);
    };
    
    const calculateSelectedGST = () => {
        return cartItems
            .filter(item => selectedProducts.includes(item.unique_key))
            .reduce((acc, item) => {
                const gstPercent = parseFloat(item.gst) || 0;
                return acc + item.base_price * item.quantity * (gstPercent / 100);
            }, 0);
    };
    
    const calculateTotalInsurance = () => {
        return cartItems.reduce((acc, item) => acc + (item.insurance_total || 0), 0);
    };
    
    const calculateSelectedInsurance = () => {
        return cartItems
            .filter(item => selectedProducts.includes(item.unique_key))
            .reduce((acc, item) => acc + (item.insurance_total || 0), 0);
    };

    const handleDeleteSelectedItems = async () => {
        const customer_id = localStorage.getItem("customer_id");
        if (!customer_id) {
            displayPopup(
                <>
                    Please <Link to="/customer-login" className="popup-link">log in</Link> to manage your cart.
                </>,
                "error"
            );
            navigate("/customer-login");
            return;
        }
        if (selectedProducts.length === 0) {
            displayPopup("No products selected for deletion.", "error");
            return;
        }

        try {
            setLoading(true);
            const productIdsToDelete = selectedProducts.map(key => {
                const parts = key.split('_');
                return parts.slice(0, -1).join('_');
            }).filter(id => id && id !== 'undefined');

            const response = await fetch(`${API_BASE_URL}/delete-selected-products-cart`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    customer_id, 
                    product_ids: [...new Set(productIdsToDelete)] 
                }),
            });

            const data = await response.json();

            if (data.status_code === 200) {
                const updatedCart = cartItems.filter(item => !selectedProducts.includes(item.unique_key));
                setCartItems(updatedCart);
                setTotalPrice(calculateTotalPrice(updatedCart));
                setSelectedProducts([]);
                window.dispatchEvent(new Event("cartUpdated"));
                displayPopup("Selected products removed from cart!", "success");
            } else {
                setError(data.error || "Failed to delete selected products.");
                displayPopup(data.error || "Failed to delete selected products.", "error");
            }
        } catch (error) {
            setError("An unexpected error occurred.");
        } finally {
            setLoading(false);
        }
    };

    const handleCheckboxChange = (unique_key) => {
        setSelectedProducts(prevSelected =>
            prevSelected.includes(unique_key)
                ? prevSelected.filter(id => id !== unique_key)
                : [...prevSelected, unique_key]
        );
    };

    const handlePlaceOrder = async () => {
        const customer_id = localStorage.getItem("customer_id");
        if (!customer_id) {
            displayPopup(
                <>
                    Please <Link to="/customer-login" className="popup-link">log in</Link> to place order.
                </>,
                "error"
            );
            navigate("/customer-login");
            return;
        }

        if (selectedProducts.length === 0) {
            displayPopup("Please select at least one product to place an order.", "error");
            return;
        }

        const productsToOrder = cartItems.filter(item => selectedProducts.includes(item.unique_key));

        const orderData = {
            customer_id: String(customer_id),
            from_cart: true,
            products: productsToOrder.map(item => ({
                product_id: String(item.product_id),
                quantity: String(item.quantity),
                with_insurance: item.with_insurance,
                insurance_quantity: item.insurance_quantity || 1
            })),
        };

        try {
            setLoading(true);
            const response = await fetch(`${API_BASE_URL}/products/order-multiple-products`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(orderData),
            });

            const data = await response.json();

            if (data.status_code === 201) {
                const orderIds = data.orders.map(order => order.order_id);
                const productIds = data.orders.map(order => order.product_id);

                localStorage.setItem("order_ids", JSON.stringify(orderIds));
                localStorage.setItem("product_ids", JSON.stringify(productIds));

                navigate("/checkout-page", { state: { orderSummary: data.orders } });
            } else if (data.status_code === 400) {
                displayPopup(data.error || "Requested quantity is unavailable.", "error");
            } else {
                displayPopup(data.error || "Failed to place order.", "error");
            }
        } catch (error) {
            displayPopup("An unexpected error occurred.", "error");
        } finally {
            setLoading(false);
        }
    };

    const handleQuantityChange = async (product_id, change) => {
        setLoading(true);
        setCartItems((prevItems) => {
            const updatedCart = prevItems.map((item) =>
                item.product_id === product_id
                    ? { ...item, quantity: Math.max(1, item.quantity + change) }
                    : item
            );

            setTotalPrice(calculateTotalPrice(updatedCart));

            return updatedCart;
        });

        const customer_id = localStorage.getItem("customer_id");
        const currentItem = cartItems.find(item => item.product_id === product_id);
        if (!customer_id || !currentItem) return;

        const newQuantity = Math.max(1, currentItem.quantity + change);

        try {
            await fetch(`${API_BASE_URL}/update-cart-quantity`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    customer_id,
                    product_id,
                    quantity: newQuantity
                }),
            });
        } catch (error) {
            console.error("Error updating quantity:", error);
            displayPopup("Failed to update quantity. Please try again.", "error");
        } finally {
            setLoading(false);
        }
    };

    if (loading && cartItems.length === 0) {
        return (
            <div className="full-page-loading">
                <div className="loading-content">
                    <ClipLoader size={50} color="#4450A2" />
                    <p>Loading...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="cart-container container">
            <div className="popup-cart">
                {showPopup && (
                    <PopupMessage
                        message={popupMessage.text}
                        type={popupMessage.type}
                        onClose={() => setShowPopup(false)}
                    />
                )}
            </div>
            <h2 className="cart-title"><FaShoppingCart className="cart-nav-icon" />Your Shopping Cart</h2>

            {error && <p className="error-message">{error}</p>}
            {!loading && !error && cartItems.length === 0 && (
                <p className="empty-cart-message">Your cart is empty.</p>
            )}

            <div className="cart-page">
                {!loading && !error && cartItems.length > 0 && (
                    <div className="cart-section">
                        {cartItems.map(item => (
                            <div key={item.unique_key} className="cart-item">
                                <div className="image-quantity-section">
                                    <input
                                        type="checkbox"
                                        className="cart-checkbox"
                                        checked={selectedProducts.includes(item.unique_key)}
                                        onChange={() => handleCheckboxChange(item.unique_key)}
                                        disabled={loading}
                                    />

                                    <img
                                        src={item.image}
                                        alt={item.product_name}
                                        className="cart-image"
                                    />

                                    <div className="quantity-selector">
                                        <button
                                            className="quantity-btn"
                                            onClick={() => handleQuantityChange(item.product_id, -1)}
                                            disabled={item.quantity === 1 || loading}
                                        >
                                            -
                                        </button>
                                        <span className="quantity">{item.quantity}</span>
                                        <button
                                            className="quantity-btn"
                                            onClick={() => handleQuantityChange(item.product_id, 1)}
                                            disabled={loading}
                                        >
                                            +
                                        </button>
                                        <div className="cart-buttons">
                                            <RiDeleteBinLine
                                                className={`remove ${loading ? "disabled-icon" : ""}`}
                                                onClick={() => !loading && handleDeleteCartItem(item.product_id)}
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="cart-details">
                                    <p className="product-name">{item.product_name}</p>
                                    <p className={`availability ${item.availability === "Out Of Stock"
                                        ? "out-of-stock"
                                        : item.availability === "Very Few Products Left"
                                            ? "few-left"
                                            : "in-stock"
                                        }`}>{item.availability}</p>
                                         <p className="discounted-price">
                                        ₹ {item.final_price ? item.final_price.toFixed(2) : "0.00"} 
                                        {item.with_insurance && " (Incl. GST & Insurance)"}
                                        {!item.with_insurance && " (Incl. GST)"}
                                    </p>
                                    
                                    {item.base_price !== item.final_price && !item.with_insurance && (
                                        <p className="original-price">
                                            ₹ {item.base_price ? item.base_price.toFixed(2) : "0.00"}
                                            (incl. GST)
                                            <span className="discount-tag">
                                                {item.discount && parseFloat(item.discount) > 0 && `${item.discount} off`}
                                            </span>
                                        </p>
                                    )}
                                    
                                    {item.gst && parseFloat(item.gst) > 0 && (
                                        <p className="gst-view-cart">GST: {item.gst}</p>
                                    )}

                                    {item.with_insurance && (
                                        <div className="cart-insurance-section">
                                            
                                            <div className="insurance-header">
                                                <div className="insurance-left">
                                                    <FaShieldAlt className="insurance-icon" />
                                                    <span className="insurance-label">Complete Product Protection</span>
                                                    <span className="insurance-duration">1 Year</span>
                                                </div>
                                                <div className="insurance-right">
                                                    <div className="insurance-quantity-controls">
                                                        <button
                                                            className="insurance-qty-btn"
                                                            onClick={() => handleInsuranceQuantityChange(item.product_id, -1)}
                                                            disabled={loading || (item.insurance_quantity || 1) <= 1}
                                                            title="Decrease Insurance Quantity"
                                                        >
                                                            -
                                                        </button>
                                                        <span className="insurance-quantity">
                                                            {item.insurance_quantity || 1}
                                                        </span>
                                                        <button
                                                            className="insurance-qty-btn"
                                                            onClick={() => handleInsuranceQuantityChange(item.product_id, 1)}
                                                            disabled={loading}
                                                            title="Increase Insurance Quantity"
                                                        >
                                                            +
                                                        </button>
                                                    </div>
                                                    
                                                    <span className="insurance-price">
                                                        ₹ {item.insurance_total ? item.insurance_total.toFixed(2) : "0.00"}
                                                    </span>
                                                    <button 
                                                        className="remove-insurance-btn"
                                                        onClick={() => handleRemoveInsurance(item.product_id)}
                                                        disabled={loading}
                                                        title="Remove Insurance"
                                                    >
                                                        <MdCancel className="cancel-icon" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                   

                                    {item.with_insurance && (
                                        <div className="insurance-badge">
                                            <FaShieldAlt className="badge-shield" />
                                            <span>Protected × {item.insurance_quantity || 1}</span>
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <p className="subtotal">
                                        <b>Subtotal: ₹ </b>
                                        {(item.final_price * item.quantity + (item.insurance_total || 0)).toFixed(2)}
                                    </p>
                                </div>
                            </div>
                        ))}
                        
                        {selectedProducts.length > 0 && (
                            <div className="cart-actions">
                                <button
                                    className="cart-delete-selected"
                                    onClick={handleDeleteSelectedItems}
                                    disabled={loading}
                                >
                                    {loading ? (
                                        <ClipLoader size={20} color="#ffffff" />
                                    ) : (
                                        "Remove From Cart"
                                    )}
                                </button>
                                <button
                                    className="cart-place-order"
                                    onClick={handlePlaceOrder}
                                    disabled={loading}
                                >
                                    {loading ? (
                                        <ClipLoader size={20} color="#ffffff" />
                                    ) : (
                                        "Place Order"
                                    )}
                                </button>
                            </div>
                        )}
                    </div>
                )}

                <div className="cart-price-section">
                    {cartItems.length > 0 && selectedProducts.length === 0 && (
                        <div className="cart-side-section">
                            <div>
                                <div className="cart-price-header">Price details</div>
                                <div className="cart-prices">
                                    <div className="cart-price">
                                        <div className="cart-price-label">Price ({cartItems.length} items)</div>
                                        <div className="cart-price-value">₹ {calculatePrice(cartItems).toFixed(2)}</div>
                                    </div>
                                    
                                    {calculateTotalInsurance() > 0 && (
                                        <div className="cart-price cart-insurance-fee">
                                            <div className="cart-price-label">Insurance Protection</div>
                                            <div className="cart-price-value">+ ₹ {calculateTotalInsurance().toFixed(2)}</div>
                                        </div>
                                    )}
                                    
                                    <div className="cart-price cart-disfee">
                                        <div className="cart-price-label">GST Amount</div>
                                        <div className="cart-price-value">+ ₹ {calculateTotalGST().toFixed(2)}</div>
                                    </div>
                                    <div className="cart-price cart-disfee">
                                        <div className="cart-price-label">Discount Amount</div>
                                        <div className="cart-price-value">- ₹{calculateTotalDiscount().toFixed(2)}</div>
                                    </div>
                                    <div className="cart-price cart-total">
                                        <div className="cart-price-label">Total Price</div>
                                        <div className="cart-price-value">₹ {total_price.toFixed(2)}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                    
                    {cartItems.length > 0 && selectedProducts.length > 0 && (
                        <div className="cart-side-section">
                            <div>
                                <div className="cart-price-header">Total Payable</div>
                                <div className="cart-prices">
                                    <div className="cart-price cart-payable">
                                        <div className="cart-price-label"><b>Price ({selectedProducts.length} items)</b></div>
                                        <div className="cart-price-value"><b>₹ {calculateSelectedPrice().toFixed(2)}</b></div>
                                    </div>
                                    
                                    {calculateSelectedInsurance() > 0 && (
                                        <div className="cart-price cart-insurance-fee">
                                            <div className="cart-price-label">Insurance Protection</div>
                                            <div className="cart-price-value">+ ₹ {calculateSelectedInsurance().toFixed(2)}</div>
                                        </div>
                                    )}
                                    
                                    <div className="cart-price cart-disfee">
                                        <div className="cart-price-label">GST Amount</div>
                                        <div className="cart-price-value">+ ₹ {calculateSelectedGST().toFixed(2)}</div>
                                    </div>
                                    <div className="cart-price cart-disfee">
                                        <div className="cart-price-label"><b>Discount Amount</b></div>
                                        <div className="cart-price-value">- ₹{calculateSelectedDiscount().toFixed(2)}</div>
                                    </div>
                                    <div className="cart-price cart-total">
                                        <div className="cart-price-label">Total Price</div>
                                        <div className="cart-price-value">₹ {calculateSelectedTotal().toFixed(2)}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CustomerViewCart;