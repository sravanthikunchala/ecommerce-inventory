import { useEffect, useState } from "react";
import { useRef } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { AiOutlineLeft, AiOutlineRight } from "react-icons/ai";
import defaultImage from "../../../assets/images/product.png";
import { MdZoomIn, MdClose } from "react-icons/md";
import "./CustomerViewProductDetails.css";
import { MdCloudDownload } from "react-icons/md";
import PopupMessage from "../../../components/Popup/Popup";
import { Link } from "react-router-dom";
import { PiShareFatFill } from "react-icons/pi";
import API_BASE_URL from "../../../config";
import { AiFillHeart, AiOutlineHeart } from "react-icons/ai";
import { ClipLoader } from "react-spinners";
import { FaShieldAlt } from "react-icons/fa";

const CustomerViewProductDetails = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const params = useParams();
    const category_name = params.category_name || localStorage.getItem("category_name");
    const sub_category_name = params.sub_category_name || localStorage.getItem("sub_category_name");
    const product_name = params.product_name || localStorage.getItem("product_name");

    const [productDetails, setProductDetails] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [activeImageIndex, setActiveImageIndex] = useState(0);
    const [activeTab, setActiveTab] = useState("description");
    const [isZoomOpen, setIsZoomOpen] = useState(false);
    const zoomImageRef = useRef(null);
    const [zoomStyle, setZoomStyle] = useState({});
    const [popupMessage, setPopupMessage] = useState({ text: "", type: "" });
    const [showPopup, setShowPopup] = useState(false);
    const [isWishlisted, setIsWishlisted] = useState(false);
    const [addToCartLoading, setAddToCartLoading] = useState(false);
    const [buyNowLoading, setBuyNowLoading] = useState(false);
    const [wishlistLoading, setWishlistLoading] = useState(false);
    const [downloadLoading, setDownloadLoading] = useState(false);
    
   
    const [insuranceOption, setInsuranceOption] = useState("without");
    const [currentPrice, setCurrentPrice] = useState(0);
    const [insurancePrice, setInsurancePrice] = useState(0);
    const [showInsuranceOption, setShowInsuranceOption] = useState(false);

    const displayPopup = (text, type = "success") => {
        setPopupMessage({ text, type });
        setShowPopup(true);

        setTimeout(() => {
            setShowPopup(false);
        }, 5000);
    };

    useEffect(() => {
        setLoading(true);
        setError("");

        localStorage.removeItem("category_name");
        localStorage.removeItem("sub_category_name");
        localStorage.removeItem("product_name");

        const productId = window.location.pathname.split("/").pop();
        const currentCategory = params.category_name || localStorage.getItem("category_name");
        const currentSubCategory = params.sub_category_name || localStorage.getItem("sub_category_name");
        const currentProduct = params.product_name || localStorage.getItem("product_name");

        if (!currentCategory || !currentSubCategory || !currentProduct) {
            if (productId) {
                fetch(`${API_BASE_URL}/get-product-info-by-id/${productId}`)
                    .then((res) => res.json())
                    .then((data) => {
                        if (data.status_code === 200) {
                            localStorage.setItem("category_name", data.category_name);
                            localStorage.setItem("sub_category_name", data.sub_category_name);
                            localStorage.setItem("product_name", data.product_name);

                            fetchProductDetails(data.category_name, data.sub_category_name, data.product_name);
                        } else {
                            setError("Product not found.");
                            setLoading(false);
                        }
                    })
                    .catch(() => {
                        setError("Failed to load product info.");
                        setLoading(false);
                    });
            } else {
                setError("Invalid product URL.");
                setLoading(false);
            }
        }
        else {
            fetchProductDetails(currentCategory, currentSubCategory, currentProduct);
        }
    }, [location.pathname]);

    const fetchProductDetails = async (category = category_name,
        subCategory = sub_category_name,
        product = product_name) => {
        setLoading(true);
        setError("");

        try {
            const response = await fetch(`${API_BASE_URL}/products/${product}/`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    category_name: category,
                    sub_category_name: subCategory,
                    product_name: product,
                    customer_id: localStorage.getItem("customer_id")
                }),
            });

            const data = await response.json();

            if (data.status_code === 200) {
                const fullDetails = {
                    ...data.product_details,
                    category_name: data.category_name,
                    sub_category_name: data.sub_category_name,
                };
                setProductDetails(fullDetails);
                setIsWishlisted(data.product_details.is_in_wishlist || false);
                
               
                const hasInsurance = data.product_details.specifications?.Insurance === "yes";
               const insurancePriceStr =
    data.product_details.specifications?.["Insurance price"] ||

    data.product_details.specifications?.["Insurance price"];

                const originalPrice = data.product_details.final_price;
                
                setShowInsuranceOption(hasInsurance);
                setInsurancePrice(parseFloat(insurancePriceStr) || 0);
                setCurrentPrice(originalPrice);
                
                
                setInsuranceOption("without");
            } else {
                setError(data.error || "Failed to fetch product details.");
            }
        } catch (error) {
            setError("An unexpected error occurred.");
        } finally {
            setLoading(false);
        }
    };

   
    const handleInsuranceChange = (option) => {
        setInsuranceOption(option);
        if (option === "with" && productDetails) {
            const insuranceAmount = parseFloat(productDetails.specifications?.["Insurance price"] || 0);
            const newPrice = productDetails.final_price + insuranceAmount;
            setCurrentPrice(newPrice);
        } else {
            setCurrentPrice(productDetails.final_price);
        }
    };

    const handlePrevImage = () => {
        setActiveImageIndex((prevIndex) =>
            prevIndex === 0 ? productDetails.product_images.length - 1 : prevIndex - 1
        );
    };

    const handleNextImage = () => {
        setActiveImageIndex((prevIndex) =>
            prevIndex === productDetails.product_images.length - 1 ? 0 : prevIndex + 1
        );
    };

    const handleZoomOpen = () => {
        setIsZoomOpen(true);
    };

    const handleZoomClose = () => {
        setIsZoomOpen(false);
    };

    const handleAddCart = async (product_id) => {
        setAddToCartLoading(true);
        const customer_id = localStorage.getItem("customer_id");

        if (!customer_id) {
            displayPopup(
                <>
                    Please <Link to="/customer-login" className="popup-link">log in</Link> to add products to cart.
                </>,
                "error"
            );
            navigate("/customer-login");
            return;
        }

        if (!product_id) {
            displayPopup("Invalid product. Please try again.", "error");
            return;
        }
        try {
            const response = await fetch(`${API_BASE_URL}/add-cart-product`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
    customer_id: customer_id,
    product_id: product_id,
    quantity: 1,
    with_insurance: insuranceOption === "with",
    insurance_quantity: insuranceOption === "with" ? 1 : 0
}),

            });

            const data = await response.json();

            if (data.status_code === 200) {
                displayPopup("Product added to cart successfully!", "success");
                window.dispatchEvent(new Event("cartUpdated"));
            } else {
                displayPopup(data.error || "Failed to add product to cart.", "error");
            }
        } catch (error) {
            displayPopup("An unexpected error occurred while adding to cart.", error, "error");
        }
        finally {
            setAddToCartLoading(false);
        }
    };

    const formatDescription = (text) => {
        if (!text) return "";
        
        const paragraphs = text.split(/\n\s*\n/);
        
        if (paragraphs.length > 1) {
            return paragraphs.map((para, index) => (
                <p key={index} className="description-paragraph">
                    {para.trim()}
                </p>
            ));
        } else {
            const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
            const chunks = [];
            
            for (let i = 0; i < sentences.length; i += 3) {
                const chunk = sentences.slice(i, i + 3).join(' ');
                if (chunk.trim()) {
                    chunks.push(chunk);
                }
            }
            
            return chunks.map((chunk, index) => (
                <p key={index} className="description-paragraph">
                    {chunk.trim()}
                </p>
            ));
        }
    };

    const handleBuyNow = async (product_id) => {
        setBuyNowLoading(true);
        const customer_id = localStorage.getItem("customer_id");
       if (!customer_id) {
    displayPopup(
        <>
            Please <Link to="/customer-login" className="popup-link">log in</Link> to purchase products.
        </>,
        "error"
    );
    setBuyNowLoading(false); 
    return;
}


        if (!product_id) {
            displayPopup("Invalid product id.", "error");
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/products/order-multiple-products`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
               body: JSON.stringify({
  customer_id: customer_id,
  from_cart: false,
  products: [
  {
    product_id: product_id,
    quantity: 1,
    with_insurance: insuranceOption === "with",
    ...(insuranceOption === "with" && { insurance_quantity: 1 })
  }
]
})



            });

            const data = await response.json();

            if (data.status_code === 201) {
                localStorage.setItem("order_ids", JSON.stringify([data.orders[0]?.order_id]));
                localStorage.setItem("product_ids", JSON.stringify([product_id]));
                navigate("/checkout-page", { state: { orderDetails: data } });
            } else {
                displayPopup("Failed to place order.", data.error, "error");
            }
        } catch (error) {
            displayPopup("An unexpected error occurred while placing the order.", error, "error");
        } finally {
            setBuyNowLoading(false);
        }
    };

    const handleDownloadMaterialFile = async (productId) => {
        setDownloadLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/download-material/${productId}/`);

            if (!response.ok) throw new Error("Failed to download file.");

            const blob = await response.blob();
            const contentDisposition = response.headers.get("Content-Disposition");
            const match = contentDisposition && contentDisposition.match(/filename="(.+)"/);
            const fileName = match ? match[1] : `material_${productId}.pdf`;

            const url = window.URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.setAttribute("download", fileName);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            console.error("Download error:", error);
            displayPopup("Failed to download the material file.", "error");
        } finally {
            setDownloadLoading(false);
        }
    };

    const handleMouseMove = (e) => {
        const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
        const x = ((e.clientX - left) / width) * 100;
        const y = ((e.clientY - top) / height) * 100;

        if (zoomImageRef.current) {
            zoomImageRef.current.style.transformOrigin = `${x}% ${y}%`;
            zoomImageRef.current.style.transform = "scale(2)";
        }
    };

    const handleMouseLeave = () => {
        if (zoomImageRef.current) {
            zoomImageRef.current.style.transform = "scale(1)";
        }
    };

    const handleShare = (product) => {
        const shareUrl = `${API_BASE_URL}/share-preview/${product.product_id}`;

        if (navigator.share) {
            navigator.share({
                title: product.product_name,
                text: `Check out this product: ${product.product_name}`,
                url: shareUrl,
            }).catch(() => {
                navigator.clipboard.writeText(shareUrl).then(() => {
                    displayPopup("Link copied to clipboard!", "success");
                });
            });
        } else {
            navigator.clipboard.writeText(shareUrl).then(() => {
                displayPopup("Link copied to clipboard!", "success");
            });
        }
    };

    const toggleWishlist = async () => {
        const customer_id = localStorage.getItem("customer_id");
        const product_id = productDetails?.product_id;

        if (!customer_id) {
            displayPopup(
                <>Please <Link to="/customer-login" className="popup-link">log in</Link> to manage wishlist.</>,
                "error"
            );
            return;
        }

        const endpoint = isWishlisted ? "remove-wishlist" : "add-to-wishlist";

        try {
            setWishlistLoading(true);
            const response = await fetch(`${API_BASE_URL}/${endpoint}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ customer_id, product_id }),
            });

            const data = await response.json();

            if (data.status_code === 200) {
                displayPopup(
                    isWishlisted ? "Removed from wishlist." : "Added to wishlist.",
                    "success"
                );
                setIsWishlisted(!isWishlisted);
            } else {
                displayPopup(data.message || "Something went wrong.", "error");
            }
        } catch (error) {
            displayPopup("An error occurred while updating wishlist.", "error");
        } finally {
            setWishlistLoading(false);
        }
    };

    return (
        <div className="customer-view-details-container container">
            {loading && (
                <div className="full-page-loading">
                    <div className="loading-content">
                        <ClipLoader size={50} color="#4450A2" />
                        <p>Loading...</p>
                    </div>
                </div>
            )}
            {error && <p className="error-message">{error}</p>}

            {!loading && !error && productDetails && (
                <div className="customer-view-details">
                    <div className="breadcrumb">
                        <span className="breadcrumb-link" onClick={() => navigate("/")}>Home</span>
                        <span className="breadcrumb-separator"> › </span>
                        <span className="breadcrumb-link" onClick={() => navigate("/")}>{category_name}</span>
                        <span className="breadcrumb-separator"> › </span>
                        <span className="breadcrumb-link" onClick={() => navigate("/categories/view-sub-categories/", { state: { category_name } })}>{sub_category_name}</span>
                        <span className="breadcrumb-separator"> › </span>
                        <span className="breadcrumb-link" onClick={() => navigate(`/categories/${encodeURIComponent(category_name)}/${encodeURIComponent(sub_category_name)}`, { state: { sub_category_name } })}>{product_name}</span>
                    </div>

                    <div className="popup-discount">
                        {showPopup && (
                            <PopupMessage
                                message={popupMessage.text}
                                type={popupMessage.type}
                                onClose={() => setShowPopup(false)}
                            />
                        )}
                    </div>
                    <div className="customer-view-section">
                        <div className="customer-image-section">
                            <div className="customer-view-image-container">
                                <button className="image-arrow left-arrow" onClick={handlePrevImage}>
                                    <AiOutlineLeft />
                                </button>
                                <div
                                    className="customer-main-image-zoom-container"
                                    onMouseMove={handleMouseMove}
                                    onMouseLeave={handleMouseLeave}
                                >
                                    <img
                                        src={productDetails.product_images?.[activeImageIndex] || defaultImage}
                                        alt="Product"
                                        className=" customer-main-image customer-main-image-zoom"
                                        ref={zoomImageRef}
                                    />
                                </div>

                                <button className="image-arrow right-arrow" onClick={handleNextImage}>
                                    <AiOutlineRight />
                                </button>
                                <button className="zoom-icon" onClick={handleZoomOpen}>
                                    <MdZoomIn />
                                </button>
                            </div>

                            <div className="customer-thumbnail-container">
                                {productDetails.product_images?.map((image, index) => (
                                    <img
                                        key={index}
                                        src={image || defaultImage}
                                        alt="Thumbnail"
                                        className={`customer-thumbnail ${index === activeImageIndex ? "active" : ""}`}
                                        onClick={() => setActiveImageIndex(index)}
                                        onError={(e) => (e.target.src = defaultImage)}
                                    />
                                ))}
                            </div>
                        </div>

                        <div className="customer-view-info">
                            <div className="title-share-div">
                                <div className="customer-view-title">{productDetails.product_name}</div>
                                <div
                                    className="wishlist-icon product-wishlist-icon"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        toggleWishlist();
                                    }}
                                >
                                    {wishlistLoading ? (
                                        <ClipLoader size={20} color="#ff0000" />
                                    ) : isWishlisted ? (
                                        <AiFillHeart className="wishlist-heart filled" />
                                    ) : (
                                        <AiOutlineHeart className="wishlist-heart" />
                                    )}
                                </div>
                                <div>
                                    <PiShareFatFill className="customer-share-button" onClick={() => handleShare(productDetails)} />
                                    <span>Share</span>
                                </div>
                            </div>
                            
                           
                            <p className="customer-price">₹ {currentPrice.toFixed(2)} <span>(Incl. GST)</span></p>
                            
                           
                            {insuranceOption === "without" && productDetails.price !== productDetails.final_price && (
                                <p className="customer-original-price">
                                    ₹ {productDetails.price.toFixed(2)} <span>(Incl. GST)</span>
                                    <span className="discount-tag-product-details">
                                        {productDetails.discount && parseFloat(productDetails.discount) > 0 && `${productDetails.discount} off`}
                                    </span>
                                </p>
                            )}
                            
                            <p className="customer-availability">
                                Availability :
                                <span className={`availability ${productDetails.availability === "Out of Stock" ? "out-of-stock" : productDetails.availability === "Very Few Products Left" ? "few-left" : "in-stock"}`}>
                                    {productDetails.availability}
                                </span>
                            </p>

                            <p className="customer-sku">SKU: {productDetails.sku_number}</p>

                            {showInsuranceOption && (
                                <div className="insurance-selection-section">
                                    <div className="insurance-header">
                                        <FaShieldAlt className="insurance-icon" />
                                        <h3>Insurance Protection</h3>
                                        <span className="insurance-badge">Recommended</span>
                                    </div>
                                    
                                    <div className="insurance-options">
                                        <div 
                                            className={`insurance-option ${insuranceOption === "with" ? "selected" : ""}`}
                                            onClick={() => handleInsuranceChange("with")}
                                        >
                                            <div className="option-header">
                                                <div className="radio-circle">
                                                    {insuranceOption === "with" && <div className="radio-dot"></div>}
                                                </div>
                                                <span className="option-title">With Insurance</span>
                                                <span className="option-price">+ ₹ {insurancePrice.toFixed(2)}</span>
                                            </div>
                                            <p className="option-desc">
                                                Full protection against damages for 1 year
                                            </p>
                                            <ul className="option-benefits">
                                                <li>Accidental damage</li>
                                                <li>Repair,Replacement,or cash settlement</li>
                                                <li>Total loss</li>
                                                <li>Crash during takeoff,flight,landing</li>
                                                <li>Forced landing damage</li>
                                                <li>Crash due to sudden failure</li>
                                                <li>Injury or death to third parties</li>
                                                <li>Damage to third-party property</li>
                                                <li>If the drone goes missing after flight</li>
                                                <li>Theft/Loss lost during flight,Drone does not return</li>
                                            </ul>
                                        </div>
                                        
                                        <div 
                                            className={`insurance-option ${insuranceOption === "without" ? "selected" : ""}`}
                                            onClick={() => handleInsuranceChange("without")}
                                        >
                                            <div className="option-header">
                                                <div className="radio-circle">
                                                    {insuranceOption === "without" && <div className="radio-dot"></div>}
                                                </div>
                                                <span className="option-title">Without Insurance</span>
                                                <span className="option-price">No extra cost</span>
                                            </div>
                                            <p className="option-desc">
                                                Standard manufacturer warranty only
                                            </p>
                                            <ul className="option-benefits">
                                                 <li>Accidental damage</li>
                                                <li>Total loss</li>
                                                <li>Damage to third-part property</li>
                                                <li>Theft/Loss lost during flight, drone does not return</li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            )}

                       
                            {(productDetails.availability === "Very Few Products Left" || productDetails.availability === "In Stock") && (
                                <div className="customer-wishlist-buttons">
                                    <button
                                        className="customer-wishlist-button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleAddCart(productDetails.product_id);
                                        }}
                                        disabled={addToCartLoading}
                                    >
                                        {addToCartLoading ? <ClipLoader size={20} color="#ffffff" /> : "Add to Cart"}
                                    </button>
                                    <button
                                        className="customer-wishlist-button buy-now-button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleBuyNow(productDetails.product_id);
                                        }}
                                        disabled={buyNowLoading}
                                    >
                                        {buyNowLoading ? <ClipLoader size={20} color="#ffffff" /> : "Buy Now"}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {isZoomOpen && (
                        <div className="zoom-modal-overlay" onClick={handleZoomClose}>
                            <div className="zoom-modal-content" onClick={(e) => e.stopPropagation()}>
                                <button className="zoom-close-btn" onClick={handleZoomClose}><MdClose /></button>
                                <div className="zoom-main-image-wrapper">
                                    <img
                                        src={productDetails.product_images?.[activeImageIndex] || defaultImage}
                                        alt="Zoomed"
                                        className="zoom-main-image"
                                    />
                                </div>
                                <div className="zoom-thumbnails">
                                    {productDetails.product_images?.map((image, index) => (
                                        <img
                                            key={index}
                                            src={image || defaultImage}
                                            alt="Zoom Thumb"
                                            className={`zoom-thumbnail ${index === activeImageIndex ? "active" : ""}`}
                                            onClick={() => setActiveImageIndex(index)}
                                            onError={(e) => (e.target.src = defaultImage)}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="customer-view-tabs-container">
                        <div className="customer-tabs">
                            <button className={activeTab === "description" ? "active" : ""} onClick={() => setActiveTab("description")}>Description</button>
                            <button className={activeTab === "specification" ? "active" : ""} onClick={() => setActiveTab("specification")}>Specification</button>
                            <button className={activeTab === "material" ? "active" : ""} onClick={() => setActiveTab("material")}>Material</button>
                        </div>

                        <div className="customer-tab-content">
                            {activeTab === "description" && (
                                <div className="product-description">
                                    {formatDescription(productDetails.description)}
                                </div>
                            )}

                            {activeTab === "specification" && (productDetails.specifications ? (
                                <div>
                                    {Object.entries(productDetails.specifications).map(([key, value], index) => (
                                        <div key={key} className={`spec-row ${index % 2 === 0 ? 'even' : 'odd'}`}>
                                            <div className="spec-key">{key}</div>
                                            <div className="spec-value">{value}</div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p>No specifications available.</p>
                            ))}

                            {activeTab === "material" && (
    productDetails.material_file ? (
        <div className="customer-material-section">
            <div className="material-left">
                <p className="material-file-name">
                    {productDetails.material_file
                        ?.split("/")
                        .pop()
                        ?.replace(".pdf", "")
                        .toUpperCase()}
                </p>
            </div>

            <div className="material-right">
                <a
                    className="customer-material-file"
                    href={productDetails.material_file}
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    View Material File
                </a>

                <button
                    className="download-btn"
                    onClick={() => handleDownloadMaterialFile(productDetails.product_id)}
                    disabled={downloadLoading}
                >
                    {downloadLoading ? (
                        <ClipLoader size={20} color="#ffffff" />
                    ) : (
                        <>
                            Download <MdCloudDownload />
                        </>
                    )}
                </button>
            </div>
        </div>
    ) : (
        <p>No material file uploaded.</p>
    )
)}

                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CustomerViewProductDetails;
