import { useEffect, useState, useRef } from "react";
import EditAddress from "../CustomerEditAddress/CustomerEditAddress";
import AddCustomerAddress from "../CustomerAddAddress/CustomerAddAddress"; // Import the address form
import "../CustomerViewAddress/CustomerViewAddress.css";
import { BsThreeDotsVertical, BsTruck, BsShop } from "react-icons/bs";
import PopupMessage from "../../../components/Popup/Popup";
import API_BASE_URL from "../../../config";
import { ClipLoader } from "react-spinners";

const ViewCustomerAddress = ({ refresh, setOrderSummary, isAddOpen, onDeliverHere, onAddressSelect, onAddAddressClick }) => {
    const [addresses, setAddresses] = useState([]);
    const [editingAddress, setEditingAddress] = useState(null);
    const [selectedAddressId, setSelectedAddressId] = useState(null);
    const [popupMessage, setPopupMessage] = useState({ text: "", type: "" });
    const [showPopup, setShowPopup] = useState(false);
    const [addressToDelete, setAddressToDelete] = useState(null);
    const [selectedMenu, setSelectedMenu] = useState(null);
    const [showConfirmPopup, setShowConfirmPopup] = useState(false);
    const [loading, setLoading] = useState(false);
    const customerId = localStorage.getItem("customer_id");
    const menuRef = useRef(null);
    const [isSelfPickup, setIsSelfPickup] = useState(null);
    const [selectedPickupAddressId, setSelectedPickupAddressId] = useState(null);
    const [pickupDate, setPickupDate] = useState("");
    const [pickupTimeSlot, setPickupTimeSlot] = useState("");
    const [showAddressForm, setShowAddressForm] = useState(false);
    const editFormRef = useRef(null);
    const addFormRef = useRef(null);

    const selfPickupAddresses = [
        {
            address_id: "pickup1",
            first_name: "Pavaman Aviation WareHouse",
            last_name: "",
            phone: "+91 906 313 3028",
            street: "2nd floor, Kapil Kavuri Hub, Financial District",
            mandal: "Nanakramguda",
            district: "Hyderabad",
            state: "Telangana",
            pincode: "500032",
        },
    ];

    const displayPopup = (text, type = "success") => {
        setPopupMessage({ text, type });
        setShowPopup(true);
        setTimeout(() => {
            setShowPopup(false);
        }, 5000);
    };

   useEffect(() => {
    const handleClickOutside = (event) => {      
        if (editingAddress && editFormRef.current?.contains(event.target)) {
            return;
        }     
        if (showAddressForm && addFormRef.current?.contains(event.target)) {
            return;
        }
        if (!event.target.closest(".manage-menu-container")) {
            setSelectedMenu(null);
        }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
        document.removeEventListener("mousedown", handleClickOutside);
    };
}, [editingAddress, showAddressForm]);
    const fetchAddresses = async () => {
        try {
            setLoading(true);
            const response = await fetch(`${API_BASE_URL}/view-customer-address`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ customer_id: customerId }),
            });
            const data = await response.json();
            if (response.ok) {
                setAddresses(data.addresses);
                if (data.addresses.length > 0 && !selectedAddressId && isSelfPickup === false) {
                    setSelectedAddressId(data.addresses[0].address_id);
                }
            } else {
                if (data.error !== "No address found for the given customer ID.") {
                    displayPopup(data.error || "Failed to fetch addresses", "error");
                }
                setAddresses([]);
            }
        } catch (error) {
            displayPopup("Something went wrong while fetching addresses.", "error");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (customerId) {
            fetchAddresses();
        }
    }, [customerId, refresh]);

    useEffect(() => {
 
        if (isSelfPickup === false && addresses.length > 0 && !selectedAddressId) {
            setSelectedAddressId(addresses[0].address_id);
        }
    }, [isSelfPickup, addresses]);

    const handleEditClick = (address) => {
        setEditingAddress(address);
        setSelectedMenu(null);
    };

    const handleEditCompleted = (message) => {
        setEditingAddress(null);
        if (message) {
            displayPopup(message);
            fetchAddresses();
        }
    };

    const handleDeleteClick = (addressId) => {
        setAddressToDelete(addressId);
        setShowConfirmPopup(true);
        setSelectedMenu(null);
    };

    const confirmDelete = async () => {
        setShowConfirmPopup(false);
        try {
            setLoading(true);
            const response = await fetch(`${API_BASE_URL}/delete-customer-address`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ address_id: addressToDelete, customer_id: customerId }),
            });
            const data = await response.json();
            if (response.ok) {
                displayPopup("Address deleted successfully", "success");
                fetchAddresses();
            } else {
                displayPopup(data.error || "Failed to delete address", "error");
            }
        } catch (error) {
            displayPopup("Something went wrong during deletion", "error");
        } finally {
            setLoading(false);
        }
    };

    const handleAddressSelect = (id) => {
        setSelectedAddressId(id);
    };

    const handleOrderSummary = async () => {
        try {
            setLoading(true);
            const orderIds = JSON.parse(localStorage.getItem("order_ids")) || [];
            const productIds = JSON.parse(localStorage.getItem("product_ids")) || [];

            if (!orderIds.length || !productIds.length) {
                displayPopup("Missing order or product details.", "error");
                return;
            }

          
if (isSelfPickup === true) {

    if (!customerId) {
        displayPopup("Customer information is missing. Please login again.", "error");
        return;
    }

    if (!orderIds.length || !productIds.length) {
        displayPopup("Your cart details are missing. Please add products again.", "error");
        return;
    }

   
    if (!selectedAddressId) {
        displayPopup("Please select a billing address for invoice.", "error");
        return;
    }

    if (!selectedPickupAddressId) {
        displayPopup("Please select a pickup location.", "error");
        return;
    }

    if (!pickupDate) {
        displayPopup("Please select a pickup date.", "error");
        return;
    }

    if (!pickupTimeSlot) {
        displayPopup("Please select a pickup time slot.", "error");
        return;
    }



                const pickupAddr = selfPickupAddresses.find(a => a.address_id === selectedPickupAddressId);
                let pickupWord = "";
                if (selectedPickupAddressId === "pickup1") pickupWord = "pavaman";

                const response = await fetch(`${API_BASE_URL}/products/order-multiple-products-summary`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        customer_id: customerId,
                        address_id: selectedAddressId || null,
                        order_ids: orderIds,
                        product_ids: productIds,
                        is_self_pickup: true,
                        self_pickup_address: pickupWord,
                        pickup_date: pickupDate,
                        pickup_slot: pickupTimeSlot,
                    }),
                });

                const data = await response.json();
                if (response.ok) {
                    displayPopup("Pickup address selected!", "success");
                    setOrderSummary({
    orders: data.orders,
    shippingAddress: pickupWord,
    customer_id: customerId,

    courier_id: null,
    courier_name: "Self Pickup",

    total_weight: data.total_weight,
    total_delivery_charge: data.total_delivery_charge,
    total_standard_shipping: data.total_standard_shipping,
    total_air_shipping: data.total_air_shipping,
    total_weight_charge: data.total_weight_charge,

    isSelfPickup: true,
    self_pickup_address: pickupWord,
    pickup_date: pickupDate,
    pickup_slot: pickupTimeSlot,
    address_id: selectedAddressId,
});
                    onDeliverHere();
                    onAddressSelect(pickupAddr);
                } else {
                    displayPopup(data.error || "Failed to select pickup address", "error");
                }
                return;
            }

         
            if (isSelfPickup === false) {
                if (!selectedAddressId) {
                    displayPopup("Please select a delivery address.", "error");
                    return;
                }

                const response = await fetch(`${API_BASE_URL}/products/order-multiple-products-summary`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        customer_id: customerId,
                        address_id: selectedAddressId,
                        order_ids: orderIds,
                        product_ids: productIds,
                        is_self_pickup: false,
                    }),
                });

                const data = await response.json();
                if (response.ok && data.status_code === 200) {
                    const selectedAddr = addresses.find(addr => addr.address_id === selectedAddressId);
                    setOrderSummary({
    orders: data.orders,
    shippingAddress: data.shipping_address,
    customer_id: customerId,

    courier_id: data.courier_id,
    courier_name: data.courier_name,

    total_weight: data.total_weight,
    total_delivery_charge: data.total_delivery_charge,
    total_standard_shipping: data.total_standard_shipping,
    total_air_shipping: data.total_air_shipping,
    total_weight_charge: data.total_weight_charge,

    max_standard_shipping: data.max_standard_shipping,
    max_air_shipping: data.max_air_shipping,
});

                    onDeliverHere();
                    if (selectedAddr) {
                        onAddressSelect(selectedAddr);
                    }
                } else {
                    displayPopup(data.error || "Failed to load summary.", "error");
                }
            }

        } catch (error) {
            displayPopup("Something went wrong. Try again.", "error");
        } finally {
            setLoading(false);
        }
    };

    const getSlotAvailability = () => {
        const now = new Date();
        const hours = now.getHours();
        const minutes = now.getMinutes();
        const isBefore2PM = hours < 14 || (hours === 14 && minutes === 0);
        return {
            slot1: hours < 10 ? true : pickupDate !== getTodayDate(),
            slot2: isBefore2PM && pickupDate === getTodayDate(),
        };
    };

    const getTodayDate = () => {
        const today = new Date();
        return today.toISOString().split("T")[0];
    };

    const handleDeliveryTypeSelect = (type) => {
        setIsSelfPickup(type);
        setSelectedAddressId(null);
        setSelectedPickupAddressId(null);
        setPickupDate("");
        setPickupTimeSlot("");
    
        if (type === false && addresses.length > 0) {
            setSelectedAddressId(addresses[0].address_id);
        }
    };

    const handleAddAddressClick = () => {
        setShowAddressForm(true);
    };

    const handleAddressFormClose = () => {
        setShowAddressForm(false);
    };

    const handleAddressAdded = () => {
        setShowAddressForm(false);
        displayPopup("New address added successfully!", "success");
        fetchAddresses();
    };

    if (loading && addresses.length === 0) {
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
        <div className="address-list container">
            <h3 className="address-heading">Select Delivery Option</h3>
            
            <div className="popup-cart">
                {showPopup && (
                    <PopupMessage
                        message={popupMessage.text}
                        type={popupMessage.type}
                        onClose={() => setShowPopup(false)}
                    />
                )}
            </div>

            {showConfirmPopup && (
                <div className="confirm-popup-overlay">
                    <div className="confirm-popup">
                        <p>Are you sure you want to delete this address?</p>
                        <div className="popup-buttons">
                            <button className="cart-place-order-cv" onClick={confirmDelete}>Yes, Delete</button>
                            <button className="cart-delete-selected-cv" onClick={() => setShowConfirmPopup(false)}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}

            {isSelfPickup === null && (
                <div className="delivery-type-selection">
                    <h4 className="selection-heading">How would you like to receive your order?</h4>
                    <div className="delivery-type-options">
                        <button 
                            className={`delivery-type-btn self-pickup-btn ${isSelfPickup === true ? 'active' : ''}`}
                            onClick={() => handleDeliveryTypeSelect(true)}
                        >
                            <div className="btn-icon">
                                <BsShop />
                            </div>
                            <div className="btn-content">
                                <h4>Self Pick-up</h4>
                                <p>Collect directly from our store</p>
                            </div>
                        </button>
                        
                        <button 
                            className={`delivery-type-btn home-delivery-btn ${isSelfPickup === false ? 'active' : ''}`}
                            onClick={() => handleDeliveryTypeSelect(false)}
                        >
                            <div className="btn-icon">
                                <BsTruck />
                            </div>
                            <div className="btn-content">
                                <h4>Delivery</h4>
                                <p>Deliver to your doorstep</p>
                            </div>
                        </button>
                    </div>
                </div>
            )}

            {isSelfPickup === true && (
                <div className="self-pickup-flow">
                   
                    <button 
                        className="back-to-selection-btn"
                        onClick={() => setIsSelfPickup(null)}
                    >
                        ← Change Delivery Method
                    </button>

                    <div className="flow-progress">
                        <div className="progress-step active">
                            <span className="step-number">1</span>
                            <span className="step-text">Pickup Details</span>
                        </div>
                        <div className="progress-line"></div>
                        <div className="progress-step">
                            <span className="step-number">2</span>
                            <span className="step-text">Payment</span>
                        </div>
                    </div>

                 
                    <div className="pickup-datetime-section container card-section">
                        <h4 className="section-heading">
                            <span className="section-icon">📅</span>
                            Select Pickup Date & Time
                        </h4>
                        <div className="date-input-wrapper">
                            <label className="input-label">Pickup Date</label>
                            <input
                                type="date"
                                className="pickup-date-input"
                                value={pickupDate}
                                onChange={(e) => {
                                    setPickupDate(e.target.value);
                                    setPickupTimeSlot("");
                                }}
                                min={getTodayDate()}
                            />
                        </div>

                        {pickupDate && (
                            <div className="time-slot-section">
                                <label className="input-label">Available Time Slots</label>
                                <div className="time-slot-grid">
                                    <div
                                        className={`time-slot-card ${pickupTimeSlot === "10.00AM - 1.00PM" ? 'selected' : ''} ${(pickupDate === getTodayDate() && !getSlotAvailability().slot1) ? 'disabled' : ''}`}
                                        onClick={() => {
                                            if (pickupDate === getTodayDate() && !getSlotAvailability().slot1) return;
                                            setPickupTimeSlot("10.00AM - 1.00PM");
                                        }}
                                    >
                                        <div className="slot-radio">
                                            <input
                                                type="radio"
                                                name="pickupSlot"
                                                checked={pickupTimeSlot === "10.00AM - 1.00PM"}
                                                onChange={() => setPickupTimeSlot("10.00AM - 1.00PM")}
                                                disabled={pickupDate === getTodayDate() && !getSlotAvailability().slot1}
                                            />
                                        </div>
                                        <div className="slot-details">
                                            <h5>Morning</h5>
                                            <p>10:00 AM - 1:00 PM</p>
                                            {pickupDate === getTodayDate() && !getSlotAvailability().slot1 && (
                                                <span className="slot-badge unavailable">Unavailable</span>
                                            )}
                                        </div>
                                    </div>

                                    <div
                                        className={`time-slot-card ${pickupTimeSlot === "2.00PM - 5.00PM" ? 'selected' : ''} ${(pickupDate === getTodayDate() && !getSlotAvailability().slot2) ? 'disabled' : ''}`}
                                        onClick={() => {
                                            if (pickupDate === getTodayDate() && !getSlotAvailability().slot2) return;
                                            setPickupTimeSlot("2.00PM - 5.00PM");
                                        }}
                                    >
                                        <div className="slot-radio">
                                            <input
                                                type="radio"
                                                name="pickupSlot"
                                                checked={pickupTimeSlot === "2.00PM - 5.00PM"}
                                                onChange={() => setPickupTimeSlot("2.00PM - 5.00PM")}
                                                disabled={pickupDate === getTodayDate() && !getSlotAvailability().slot2}
                                            />
                                        </div>
                                        <div className="slot-details">
                                            <h5>Afternoon</h5>
                                            <p>2:00 PM - 5:00 PM</p>
                                            {pickupDate === getTodayDate() && !getSlotAvailability().slot2 && (
                                                <span className="slot-badge unavailable">Unavailable</span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {pickupDate === getTodayDate() && !getSlotAvailability().slot2 && (
                                    <div className="slot-alert">
                                        <span className="alert-icon">⚠</span>
                                        <p>Today's afternoon slots are closed. Please select another date or choose morning slot.</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                   
                    <div className="pickup-address-section card-section">
                        <h4 className="section-heading">
                            <span className="section-icon">📍</span>
                            Select Pickup Location
                        </h4>
                        <div className="pickup-locations">
                            {selfPickupAddresses.map((addr) => (
                                <div key={addr.address_id} className="pickup-location-card">
                                    <div className="location-header">
                                        <input
                                            type="radio"
                                            name="pickupAddress"
                                            className="location-radio"
                                            checked={selectedPickupAddressId === addr.address_id}
                                            onChange={() => setSelectedPickupAddressId(addr.address_id)}
                                        />
                                        <div className="location-info">
                                            <h5>{addr.first_name}</h5>
                                            <p className="location-phone">{addr.phone}</p>
                                        </div>
                                    </div>
                                    <div className="location-details">
                                        <p className="location-address">
                                            <span className="address-icon">🏢</span>
                                            {addr.street}, {addr.mandal}, {addr.district}, {addr.state} - {addr.pincode}
                                        </p>
                                        <div className="location-tags">
                                            <span className="location-tag">Warehouse</span>
                                            <span className="location-tag">Free Parking</span>
                                            <span className="location-tag">24/7 Security</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                   
                    <div className="invoice-address-section card-section">
                        <h4 className="section-heading">
                            <span className="section-icon">📄</span>
                            Billing/Invoice Address
                        </h4>
                        
                        {addresses.length > 0 ? (
                            <div className="invoice-addresses">
                                {addresses.map((address) => (
                                    <div key={address.address_id} className={`invoice-address-card ${selectedAddressId === address.address_id ? 'selected' : ''}`}>
                                        <div className="address-radio-wrapper">
                                            <input
                                                type="radio"
                                                name="invoiceAddress"
                                                className="invoice-address-radio"
                                                checked={selectedAddressId === address.address_id}
                                                onChange={() => handleAddressSelect(address.address_id)}
                                            />
                                        </div>
                                      <div className="address-content">
    <div className="address-header-row">
        <h5>{address.first_name} {address.last_name}</h5>
        <span className="address-phone">{address.phone || address.mobile_number || address.contact_number}</span>
    </div>
    <div className="address-type-row">
      
        {address.address_type && address.address_type !== "Home" && (
            <span className="address-type-tag">{address.address_type}</span>
        )}
    </div>
    <div className="address-details">
        <p className="address-line">{address.street}</p>
        <div className="address-location">
            {address.village && <span className="address-location-item">{address.village}</span>}
            {address.mandal && <span className="address-location-item">{address.mandal}</span>}
            {address.district && <span className="address-location-item">{address.district}</span>}
            {address.state && <span className="address-location-item">{address.state}</span>}
            <span className="address-pincode">PIN: {address.pincode}</span>
        </div>
    </div>
</div>
                                        
                                        
                                        <div className="manage-menu-container" onClick={(e) => e.stopPropagation()}>
                                            <BsThreeDotsVertical
                                                className="manage-menu-icon"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSelectedMenu((prev) =>
                                                        prev === address.address_id ? null : address.address_id
                                                    );
                                                }}
                                            />

                                            {selectedMenu === address.address_id && (
                                                <div className="manage-menu-dropdown">
                                                    <button
                                                        className="edit-btn"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleEditClick(address);
                                                        }}
                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        className="delete-btn"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleDeleteClick(address.address_id);
                                                        }}
                                                    >
                                                        Delete
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="no-address-message">
                                <div className="no-address-icon">🏠</div>
                                <p>No billing addresses saved</p>
                                <p className="no-address-subtext">Add an address for invoice generation</p>
                            </div>
                        )}
                        
                        <div className="add-address-btn-section">
                            <button className="add-address-btn secondary" onClick={handleAddAddressClick}>
                                <span className="btn-plus">+</span>
                                Add New Billing Address
                            </button>
                        </div>
                    </div>

                  
                    {editingAddress && (
    <div
        ref={editFormRef}
        className="edit-address-form-section card-section"
        onClick={(e) => e.stopPropagation()}
    >
        <h4 className="section-heading">
            <span className="section-icon">✏️</span>
            Edit Address
        </h4>

        <EditAddress
            address={editingAddress}
            onEditCompleted={handleEditCompleted}
            onCancel={() => setEditingAddress(null)}  
        />
    </div>
)}


                   
                    <div className="payment-section">
                        <div className="payment-summary">
                            <div className="summary-item">
                                <span>Pickup Location:</span>
                                <span>{selectedPickupAddressId ? selfPickupAddresses.find(a => a.address_id === selectedPickupAddressId)?.first_name : 'Not selected'}</span>
                            </div>
                            <div className="summary-item">
                                <span>Pickup Date:</span>
                                <span>{pickupDate || 'Not selected'}</span>
                            </div>
                            <div className="summary-item">
                                <span>Time Slot:</span>
                                <span>{pickupTimeSlot || 'Not selected'}</span>
                            </div>
                        </div>
                        
                        <button 
                            className="address-del-btn payment-btn"
                            onClick={handleOrderSummary}
                            disabled={loading || !selectedPickupAddressId || !pickupDate || !pickupTimeSlot}
                        >
                            {loading ? (
                                <>
                                    <ClipLoader size={15} color="#ffffff" />
                                    <span style={{marginLeft: '10px'}}>Processing...</span>
                                </>
                            ) : (
                                'Proceed to Payment'
                            )}
                        </button>
                    </div>
                </div>
            )}

           
            {isSelfPickup === false && (
                <div className="home-delivery-flow">
                    
                    <button 
                        className="back-to-selection-btn"
                        onClick={() => setIsSelfPickup(null)}
                    >
                        ← Change Delivery Method
                    </button>

                    <div className="flow-progress">
                        <div className="progress-step active">
                            <span className="step-number">1</span>
                            <span className="step-text">Delivery Address</span>
                        </div>
                        <div className="progress-line"></div>
                        <div className="progress-step">
                            <span className="step-number">2</span>
                            <span className="step-text">Payment</span>
                        </div>
                    </div>

                
                    <div className="delivery-address-section card-section">
                        <div className="section-header-row">
                            <h4 className="section-heading">
                                <span className="section-icon">🏠</span>
                                Delivery Address
                            </h4>
                            <span className="selected-count">
                                {selectedAddressId ? '1 Selected' : 'Not selected'}
                            </span>
                        </div>
                        
                        {addresses.length > 0 ? (
                            <div className="delivery-addresses">
                                {addresses.map((address) => (
                                    <div key={address.address_id} className={`delivery-address-card ${selectedAddressId === address.address_id ? 'selected' : ''}`}>
                                        <div className="address-radio-wrapper">
                                            <input
                                                type="radio"
                                                name="deliveryAddress"
                                                className="delivery-address-radio"
                                                checked={selectedAddressId === address.address_id}
                                                onChange={() => handleAddressSelect(address.address_id)}
                                            />
                                        </div>
                                        <div className="address-content">
    <div className="address-header-row">
        <h5>{address.first_name} {address.last_name}</h5>
        <span className="address-phone">{address.phone || address.mobile_number || address.contact_number}</span>
    </div>
    <div className="address-type-row">
        
        {address.address_type && address.address_type !== "Home" && (
            <span className="address-type-tag">{address.address_type}</span>
        )}
    </div>
    <div className="address-details">
        <p className="address-line">{address.street}</p>
        <div className="address-location">
            {address.village && <span className="address-location-item">{address.village}</span>}
            {address.mandal && <span className="address-location-item">{address.mandal}</span>}
            {address.district && <span className="address-location-item">{address.district}</span>}
            {address.state && <span className="address-location-item">{address.state}</span>}
            <span className="address-pincode">PIN: {address.pincode}</span>
        </div>
    </div>
</div>
                                        
                                        
                                        <div className="manage-menu-container" onClick={(e) => e.stopPropagation()}>
                                            <BsThreeDotsVertical
                                                className="manage-menu-icon"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSelectedMenu((prev) =>
                                                        prev === address.address_id ? null : address.address_id
                                                    );
                                                }}
                                            />

                                            {selectedMenu === address.address_id && (
                                                <div className="manage-menu-dropdown">
                                                    <button
                                                        className="edit-btn"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleEditClick(address);
                                                        }}
                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        className="delete-btn"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleDeleteClick(address.address_id);
                                                        }}
                                                    >
                                                        Delete
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                        
                                        {selectedAddressId === address.address_id && (
                                            <div className="deliver-here-section">
                                                <button 
                                                    className="deliver-here-btn"
                                                    onClick={handleOrderSummary}
                                                    disabled={loading}
                                                >
                                                    {loading ? (
                                                        <>
                                                            <ClipLoader size={15} color="#ffffff" />
                                                            <span style={{marginLeft: '10px'}}>Processing...</span>
                                                        </>
                                                    ) : (
                                                        'Deliver Here'
                                                    )}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="no-address-message">
                                <div className="no-address-icon">📦</div>
                                <p>No delivery addresses saved</p>
                                <p className="no-address-subtext">Add an address to get your order delivered</p>
                            </div>
                        )}
                        
                    
                        {editingAddress && (
                            <div className="edit-address-form-section card-section">
                                <h4 className="section-heading">
                                    <span className="section-icon">✏️</span>
                                    Edit Address
                                </h4>
                                <EditAddress
                                    address={editingAddress}
                                    onEditCompleted={handleEditCompleted}
                                />
                            </div>
                        )}
                        
                        <div className="add-address-btn-section">
                            <button className="add-address-btn" onClick={handleAddAddressClick}>
                                <span className="btn-plus">+</span>
                                Add New Delivery Address
                            </button>
                        </div>
                    </div>
                </div>
            )}

            
            {showAddressForm && (
    <div className="address-form-popup-overlay">
        <div
            ref={addFormRef}
            className="address-form-popup"
            onClick={(e) => e.stopPropagation()}
        >
            <div className="address-form-popup-header">
                <h3>{isSelfPickup === true ? 'Add Billing Address' : 'Add Delivery Address'}</h3>
                <button
                    className="close-popup-btn"
                    onClick={() => setShowAddressForm(false)}
                >
                    ×
                </button>
            </div>

            <div className="address-form-popup-content">
                <AddCustomerAddress
                    onAddressAdded={handleAddressAdded}
                    onCancel={() => setShowAddressForm(false)} 
                />
            </div>
        </div>
    </div>
)}
        </div>
    );
};

export default ViewCustomerAddress;