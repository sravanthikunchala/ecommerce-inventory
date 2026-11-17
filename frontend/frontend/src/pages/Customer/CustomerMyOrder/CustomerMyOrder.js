import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './CustomerMyOrder.css';
import { FaCircleArrowRight, FaStar, FaRegStar } from "react-icons/fa6";
import PopupMessage from "../../../components/Popup/Popup";
import API_BASE_URL from "../../../config";
import { Link } from "react-router-dom";
import { ClipLoader } from 'react-spinners';

const CustomerMyOrders = () => {
  const [products, setProducts] = useState([]);
  const [error, setError] = useState(null);
  const location = useLocation();
  const { selected_product_id } = location.state || {};
  const customerId = localStorage.getItem("customer_id");
  const navigate = useNavigate();
  const highlightedRef = useRef(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const isMobile = window.innerWidth <= 425;
  const [popupMessage, setPopupMessage] = useState({ text: "", type: "" });
  const [showPopup, setShowPopup] = useState(false);
  const [deliveryStatus, setDeliveryStatus] = useState("");
  const [orderTime, setOrderTime] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const ordersPerPage = 10;
  const [isLoading, setIsLoading] = useState(true);

  const [showReviewFormFor, setShowReviewFormFor] = useState(null);
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [charCount, setCharCount] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [editReviewFor, setEditReviewFor] = useState(null);
  const [editRating, setEditRating] = useState(0);
  const [editFeedback, setEditFeedback] = useState("");
  const [editCharCount, setEditCharCount] = useState(0);
  const [editHoverRating, setEditHoverRating] = useState(0);
  
  const [showDeliveryReviewFor, setShowDeliveryReviewFor] = useState(null);
  const [deliveryRating, setDeliveryRating] = useState(0);
  const [deliveryFeedback, setDeliveryFeedback] = useState("");
  const [deliveryCharCount, setDeliveryCharCount] = useState(0);
  const [deliveryHoverRating, setDeliveryHoverRating] = useState(0);
  const [deliveryReviewedOrders, setDeliveryReviewedOrders] = useState(new Set());
const productFeedbackRef = useRef(null);
const deliveryFeedbackRef = useRef(null);

  const ratingLabels = {
    1: "Poor",
    2: "Fair",
    3: "Good",
    4: "Very Good",
    5: "Excellent"
  };

  const displayPopup = (text, type = "success") => {
    setPopupMessage({ text, type });
    setShowPopup(true);

    setTimeout(() => {
      setShowPopup(false);
    }, 5000);
  };

  useEffect(() => {
    if (searchTerm.trim() === "") {
      fetchOrders();
    }
  }, [searchTerm]);

  useEffect(() => {
    const shouldLockScroll =
      showReviewFormFor || editReviewFor || showDeliveryReviewFor;

    if (shouldLockScroll) {
      document.body.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
    }
  }, [showReviewFormFor, editReviewFor, showDeliveryReviewFor]);

  const fetchOrders = async () => {
    if (!customerId) {
      setIsLoading(false);   
      displayPopup(
        <>
          Please <Link to="/customer-login" className="popup-link">log in</Link> to view your orders.
        </>,
        "error"
      );
      return;
    }
    
    try {
      setIsLoading(true);
      const response = await fetch(`${API_BASE_URL}/customer-my-order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_id: customerId,
          action: "view"
        }),
      });
      const data = await response.json();
      if (response.ok) {
        const flatProducts = [];
        data.payments.forEach(order => {
          order.order_products.forEach(product => {
            flatProducts.push({ ...product, order, payment_id: product.payment_id });
          });
        });
        const ratingResponse = await fetch(`${API_BASE_URL}/view-rating`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ customer_id: customerId }),
        });
        const ratingData = await ratingResponse.json();
        const ratingsMap = {};
        if (ratingResponse.ok) {
          ratingData.ratings.forEach(rating => {
  ratingsMap[rating.order_product_id] = {
    rating: rating.rating,
    feedback: rating.feedback || "",
    product_images: rating.product_images || []
  };
});

        }
        const productsWithRatings = flatProducts.map(product => {
  const ratingInfo = ratingsMap[product.order_product_id] || {};
  return {
    ...product,
    rating: ratingInfo.rating || null,
    feedback: ratingInfo.feedback || "",
    review_images: ratingInfo.product_images || []
  };
});


        const sortedProducts = productsWithRatings.sort((a, b) => {
          return a.order_product_id === selected_product_id ? -1 : b.order_product_id === selected_product_id ? 1 : 0;
        });

        setProducts(sortedProducts);
      } else {
        setError(data.error || "Error fetching orders");
      }
    } catch (error) {
      setError("Fetch error: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [customerId]);

  useEffect(() => {
    if (highlightedRef.current) {
      highlightedRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [products]);

  const EnhancedStarRating = ({ 
    rating, 
    onRatingChange, 
    hoverRating, 
    onHoverChange,
    size = "large",
    showLabels = true
  }) => {
    return (
      <div className={`star-rating-container ${size}`}>
        <div className="stars-input">
          {[1, 2, 3, 4, 5].map((star) => {
            const isFilled = star <= (hoverRating || rating);
            const isActive = star === (hoverRating || rating);
            
            return (
              <div key={star} className="star-wrapper">
                <button
                  type="button"
                  className={`star-button ${isFilled ? "filled" : ""} ${isActive ? "active" : ""}`}
                  onClick={() => onRatingChange(star)}
                  onMouseEnter={() => onHoverChange?.(star)}
                  onMouseLeave={() => onHoverChange?.(0)}
                  aria-label={`Rate ${star} star${star !== 1 ? 's' : ''}`}
                >
                  {isFilled ? (
                    <FaStar className="star-icon" />
                  ) : (
                    <FaRegStar className="star-icon" />
                  )}
                </button>
                {star === Math.ceil(hoverRating || rating) && hoverRating > 0 && showLabels && (
                  <div className="rating-label">{ratingLabels[star]}</div>
                )}
              </div>
            );
          })}
        </div>
        {rating > 0 && showLabels && !hoverRating && (
          <div className="selected-rating-label">
            You selected: <span className="rating-value">{ratingLabels[rating]}</span>
          </div>
        )}
      </div>
    );
  };

  const EnhancedReviewForm = ({ 
    product, 
    isEdit = false,
    rating: currentRating,
    onRatingChange,
    feedback: currentFeedback,
    onFeedbackChange,
    charCount,
    onSubmit,
    onCancel,
    hoverRating,
    onHoverChange,
    title = "Rate Your Purchase"
  }) => {
    const [photos, setPhotos] = useState([]);
    const [selectedIssues, setSelectedIssues] = useState([]);
    const fileInputRef = useRef(null);
    const textareaRef = useRef(null);

    const issues = [
      "Dirty packaging",
      "Crushed/damaged",
      "Bad quality",
      "Wrong item received",
      "Missing parts",
      "Poor assembly",
      "Battery issues",
      "Connection problems",
      "Performance not as described"
    ];

    useEffect(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    }, []);

    const handlePhotoUpload = (e) => {
      const files = Array.from(e.target.files);
      if (photos.length + files.length > 5) {
        displayPopup("You can upload maximum 5 photos", "error");
        return;
      }
      
      const newPhotos = files.map(file => ({
        file,
        preview: URL.createObjectURL(file)
      }));
      
      setPhotos(prev => [...prev, ...newPhotos]);
    };

    const removePhoto = (index) => {
      URL.revokeObjectURL(photos[index].preview);
      setPhotos(prev => prev.filter((_, i) => i !== index));
    };

    const handleIssueToggle = (issue) => {
      setSelectedIssues(prev => 
        prev.includes(issue) 
          ? prev.filter(i => i !== issue)
          : [...prev, issue]
      );
    };

    const handleFeedbackChange = (e) => {
      const text = e.target.value;
      if (text.length <= 500) {
        onFeedbackChange(text);
      }
    };

    useEffect(() => {
      return () => {
        photos.forEach(photo => URL.revokeObjectURL(photo.preview));
      };
    }, [photos]);

    return (
      <div className="enhanced-review-form">
        <div className="review-form-header">
          <h3>{title}</h3>
          <p className="review-subtitle">Help other drone enthusiasts by sharing your experience</p>
        </div>
        
        <div className="product-review-card">
          <img src={product.product_image} alt={product.product_name} className="review-product-image" />
          <div className="product-review-details">
            <h4 className="review-product-name">{product.product_name}</h4>
            <p className="review-product-info">Order ID: {product.order.product_order_id}</p>
            <p className="review-product-info">Purchased on: {product.order.payment_date}</p>
          </div>
        </div>

        <div className="rating-section">
          <div className="rating-prompt">
            <h4>How would you rate this product?</h4>
            <p>Your rating helps us improve and assists other customers</p>
          </div>
          
          <EnhancedStarRating
            rating={currentRating}
            onRatingChange={onRatingChange}
            hoverRating={hoverRating}
            onHoverChange={onHoverChange}
            showLabels={true}
          />
        </div>


<div className="feedback-section">
  <div className="feedback-header">
    <label htmlFor="feedback">
      Detailed Review
      <span className="optional-tag">(Optional but helpful)</span>
    </label>
    <div className="char-counter-wrapper">
      <span className="char-counter">{currentFeedback.length}</span>
      <span className="char-max">/500</span>
    </div>
  </div>

  <textarea
    ref={textareaRef}
    id="feedback"
    placeholder="Share your experience with this product. Consider mentioning: build quality, performance, battery life, ease of use, value for money..."
    value={currentFeedback}
    onChange={handleFeedbackChange}
    rows={4}
    className="text-area-rating"  
    maxLength={500}
  />
  <div className="textarea-tips">
    <span className="tip-icon">💡</span>
    <span className="tip-text">Be specific about what you liked or didn't like</span>
  </div>
</div>

        <div className="issues-section">
          <h4>Did you face any of these issues?</h4>
          <p className="section-subtitle">Select all that apply</p>
          <div className="issues-grid">
            {issues.map((issue, index) => (
              <button
                key={index}
                type="button"
                className={`issue-chip ${selectedIssues.includes(issue) ? 'selected' : ''}`}
                onClick={() => handleIssueToggle(issue)}
              >
                {issue}
              </button>
            ))}
          </div>
        </div>

        <div className="photos-section">
          <div className="photos-header">
            <h4>Add Photos</h4>
            <p className="photos-subtitle">Show what you received (max 5 photos, 5MB each)</p>
          </div>
          
          <input
            type="file"
            ref={fileInputRef}
            onChange={handlePhotoUpload}
            accept="image/*"
            multiple
            style={{ display: 'none' }}
          />
          
          {photos.length === 0 ? (
            <div 
              className="upload-area"
              onClick={() => fileInputRef.current.click()}
            >
              <div className="upload-icon">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="17 8 12 3 7 8"/>
                  <line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
              </div>
              <p className="upload-text">Click to upload photos</p>
              <p className="upload-hint">or drag and drop images here</p>
            </div>
          ) : (
            <div className="photos-grid">
              {photos.map((photo, index) => (
                <div key={index} className="photo-card">
                  <img src={photo.preview} alt={`Preview ${index + 1}`} />
                  <button 
                    type="button" 
                    className="remove-photo-btn"
                    onClick={() => removePhoto(index)}
                    aria-label="Remove photo"
                  >
                    ×
                  </button>
                  <div className="photo-overlay">
                    <span>Preview {index + 1}</span>
                  </div>
                </div>
              ))}
              {photos.length < 5 && (
                <div 
                  className="photo-card add-more"
                  onClick={() => fileInputRef.current.click()}
                >
                  <div className="add-more-content">
                    <span className="add-icon">+</span>
                    <p>Add more</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="review-actions">
          <button
            type="button"
            className="review-cancel-btn"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            type="button"
            className="review-submit-btn"
            onClick={() => onSubmit(product, photos)}
            disabled={currentRating === 0}
          >
            {isEdit ? "Update Review" : "Submit Review"}
          </button>
        </div>
      </div>
    );
  };

  const EnhancedDeliveryReviewForm = ({ 
    product, 
    onCancel,
    onRatingChange,
    onFeedbackChange,
    rating,
    feedback,
    charCount,
    hoverRating,
    onHoverChange
  }) => {
    const orderProducts = products.filter(p => p.order.product_order_id === product.order.product_order_id);
    const [photos, setPhotos] = useState([]);
    const fileInputRef = useRef(null);
    const textareaRef = useRef(null);

    useEffect(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    }, []);

    const handlePhotoUpload = (e) => {
      const files = Array.from(e.target.files);
      if (photos.length + files.length > 5) {
        displayPopup("You can upload maximum 5 photos", "error");
        return;
      }
      
      const newPhotos = files.map(file => ({
        file,
        preview: URL.createObjectURL(file)
      }));
      
      setPhotos(prev => [...prev, ...newPhotos]);
    };

    const removePhoto = (index) => {
      URL.revokeObjectURL(photos[index].preview);
      setPhotos(prev => prev.filter((_, i) => i !== index));
    };

    const handleFeedbackChange = (e) => {
      const text = e.target.value;
      if (text.length <= 500) {
        onFeedbackChange(text);
      }
    };

    useEffect(() => {
      return () => {
        photos.forEach(photo => URL.revokeObjectURL(photo.preview));
      };
    }, [photos]);

    return (
      <div className="delivery-review-form">
        <div className="review-form-header">
          <h3>Delivery Experience</h3>
          <p className="review-subtitle">Rate your overall delivery and packaging</p>
        </div>

        <div className="rating-section">
          <div className="rating-prompt">
            <h4>How was your delivery experience?</h4>
            <p>Rate the packaging, delivery time, and condition of items</p>
          </div>
          
          <EnhancedStarRating
            rating={rating}
            onRatingChange={onRatingChange}
            hoverRating={hoverRating}
            onHoverChange={onHoverChange}
            showLabels={true}
          />
        </div>

        <div className="delivery-details">
          <h4>Delivery Details</h4>
          <div className="details-grid">
            <div className="detail-item">
              <span className="detail-label">Order ID:</span>
              <span className="detail-value">{product.order.product_order_id}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Delivery Date:</span>
              <span className="detail-value">{product.delivery_date || product.order.payment_date}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Items Delivered:</span>
              <span className="detail-value">{orderProducts.length} items</span>
            </div>
          </div>
        </div>

        <div className="products-section">
          <h4>Condition of Products</h4>
          <p className="section-subtitle">How were the items when you received them?</p>
          
          <div className="products-grid">
            {orderProducts.map(orderProduct => (
              <div key={orderProduct.order_product_id} className="product-card-co">
                <img src={orderProduct.product_image} alt={orderProduct.product_name} />
                <div className="product-info">
                  <h5>{orderProduct.product_name}</h5>
                  <div className="condition-options">
                    {['Perfect', 'Minor Damage', 'Major Damage', 'Missing Parts', 'Wrong Item'].map(condition => (
                      <label key={condition} className="condition-option">
                        <input type="radio" name={`condition-${orderProduct.order_product_id}`} />
                        <span className="condition-label">{condition}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

<div className="feedback-section">
  <div className="feedback-header">
    <label htmlFor="delivery-feedback">
      Additional Feedback
      <span className="optional-tag">(Optional)</span>
    </label>
    <div className="char-counter-wrapper">
      <span className="char-counter">{feedback.length}</span>
      <span className="char-max">/500</span>
    </div>
  </div>
  <textarea
    ref={textareaRef}
    id="delivery-feedback"
    placeholder="Any comments about packaging, delivery time, or communication..."
    value={feedback}
    onChange={handleFeedbackChange}
    rows={3}
    className="text-area-rating"  
    maxLength={500}
  />
</div>

        <div className="photos-section">
          <div className="photos-header">
            <h4>Photos of Packaging/Items</h4>
            <p className="photos-subtitle">Show the condition you received (max 5 photos)</p>
          </div>
          
          <input
            type="file"
            ref={fileInputRef}
            onChange={handlePhotoUpload}
            accept="image/*"
            multiple
            style={{ display: 'none' }}
          />
          
          {photos.length === 0 ? (
            <div 
              className="upload-area"
              onClick={() => fileInputRef.current.click()}
            >
              <div className="upload-icon">
                📸
              </div>
              <p className="upload-text">Add photos of packaging</p>
            </div>
          ) : (
            <div className="photos-grid">
              {photos.map((photo, index) => (
                <div key={index} className="photo-card">
                  <img src={photo.preview} alt={`Packaging ${index + 1}`} />
                  <button 
                    type="button" 
                    className="remove-photo-btn"
                    onClick={() => removePhoto(index)}
                  >
                    ×
                  </button>
                </div>
              ))}
              {photos.length < 5 && (
                <div 
                  className="photo-card add-more"
                  onClick={() => fileInputRef.current.click()}
                >
                  <div className="add-more-content">
                    <span className="add-icon">+</span>
                    <p>Add more</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="review-actions">
          <button
            type="button"
            className="review-cancel-btn"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            type="button"
            className="review-submit-btn"
            onClick={() => handleSubmitDeliveryReview(product, photos)}
            disabled={rating === 0}
          >
            Submit Delivery Review
            <span className="btn-icon">✓</span>
          </button>
        </div>
      </div>
    );
  };

  const uploadPhotos = async (product, photos) => {
    if (!photos.length) return;
    
    const formData = new FormData();
    formData.append('customer_id', customerId);
    formData.append('product_id', product.product_id);
    formData.append('order_id', product.order.product_order_id);
    
    photos.forEach((photo) => {
      formData.append(`photos`, photo.file);
    });

    try {
      const response = await fetch(`${API_BASE_URL}/upload-review-photos`, {
        method: "POST",
        body: formData,
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        console.error("Failed to upload photos:", result.error);
        displayPopup("Review submitted but photos failed to upload.", "warning");
      }
    } catch (error) {
      console.error("Error uploading photos:", error);
    }
  };

  const handleSubmitReview = async (product, photos = []) => {
    if (rating === 0) {
      displayPopup("Please select a rating before submitting.", "error");
      return;
    }

    try {
      const formData = new FormData();
      formData.append("customer_id", customerId);
      formData.append("product_id", product.product_id);
      formData.append("product_order_id", product.order.product_order_id);
      formData.append("rating", rating);
      formData.append("feedback", feedback || "");

      photos.forEach(photo => {
        formData.append("product_images", photo.file);
      });

      const response = await fetch(`${API_BASE_URL}/submit-feedback-rating`, {
        method: "POST",
        body: formData, 
      });

      const result = await response.json();

      if (response.ok) {
        displayPopup("Thank you! Your review has been submitted.", "success");

        setProducts(prevProducts =>
          prevProducts.map(p =>
            p.order_product_id === product.order_product_id
              ? { ...p, rating, feedback }
              : p
          )
        );

        setShowReviewFormFor(null);
        setRating(0);
        setFeedback("");
        setCharCount(0);
      } else {
        displayPopup(result.error || "Failed to submit review.", "error");
      }
    } catch (error) {
      console.error("Error submitting review:", error);
      displayPopup("An error occurred while submitting your review.", "error");
    }
  };

  const handleSubmitDeliveryReview = async (product, photos = []) => {
    if (deliveryRating === 0) {
      displayPopup("Please select a delivery rating before submitting.", "error");
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/submit-delivery-rating`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customer_id: customerId,
          order_id: product.order.product_order_id,
          rating: deliveryRating,
          feedback: deliveryFeedback,
        }),
      });
      const result = await response.json();
      if (response.ok) {
        if (photos.length > 0) {
          await uploadPhotos(product, photos);
        }
        
        displayPopup("Thank you! Your delivery review has been submitted.", "success");
        setDeliveryReviewedOrders(prev => new Set([...prev, product.order.product_order_id]));
        setShowDeliveryReviewFor(null);
        setDeliveryRating(0);
        setDeliveryFeedback("");
        setDeliveryCharCount(0);
      } else {
        displayPopup(result.error || "Failed to submit delivery review.", "error");
      }
    } catch (error) {
      console.error("Error submitting delivery review:", error);
      displayPopup("An error occurred while submitting your review.", "error");
    }
  };

  const handleEditReview = async (product, newPhotos = [], deletedImages = []) => {
  if (editRating === 0) {
    displayPopup("Please select a rating before updating.", "error");
    return;
  }

  try {
    const formData = new FormData();
    formData.append("customer_id", customerId);
    formData.append("product_id", product.product_id);
    formData.append("product_order_id", product.order.product_order_id);
    formData.append("rating", editRating);
    formData.append("feedback", editFeedback || "");

  
    deletedImages.forEach(img => {
      formData.append("deleted_images[]", img);
    });

   
    newPhotos.forEach(photo => {
      formData.append("new_images", photo.file);
    });

    const response = await fetch(`${API_BASE_URL}/edit-feedback-rating`, {
      method: "POST",
      body: formData,
    });

    const result = await response.json();

    if (response.ok) {
      displayPopup("Your review has been updated.", "success");

      setProducts(prevProducts =>
        prevProducts.map(p =>
          p.order_product_id === product.order_product_id
            ? {
                ...p,
                rating: editRating,
                feedback: editFeedback,
                review_images: result.product_images || p.review_images
              }
            : p
        )
      );

      setEditReviewFor(null);
      setEditRating(0);
      setEditFeedback("");
      setEditCharCount(0);
    } else {
      displayPopup(result.error || "Failed to update review.", "error");
    }
  } catch (error) {
    console.error("Error updating review:", error);
    displayPopup("An error occurred while updating your review.", "error");
  }
};

  if (isLoading) {
    return (
      <div className="full-page-loading">
        <div className="loading-content">
          <ClipLoader size={50} color="#4450A2" />
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className='error-message'>
        <p>{error}</p>
      </div>
    );
  }

  const goToOrderDetails = (product) => {
    navigate("/my-orders-details", {
      state: {
        order: product.order,
        selected_product_id: product.order_product_id,
      },
    });
  };

  const filterMyOrders = async (status = "", orderTime = "") => {
    const requestBody = {
      customer_id: customerId,
      order_time: orderTime || null,
    };
    if (status === "Delivered") {
      requestBody.delivery_status = "Delivered";
    } else if (status === "On the way") {
      requestBody.shipping_status = "Shipped";
    }
    try {
      setIsLoading(true);
      const response = await fetch(`${API_BASE_URL}/filter-my-order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (response.ok) {
        const flatProducts = [];
        data.payments.forEach(order => {
          order.order_products.forEach(product => {
            flatProducts.push({
  ...product,
  order,
  payment_status: order.payment_status,
  shipping_status: order.shipping_status,
  delivery_status: order.delivery_status,
  payment_id: order.payment_id
});
          });
        });
        const ratingResponse = await fetch(`${API_BASE_URL}/view-rating`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ customer_id: customerId }),
        });

        const ratingData = await ratingResponse.json();
        const ratingsMap = {};
        if (ratingResponse.ok) {
          ratingData.ratings.forEach(rating => {
  ratingsMap[rating.order_product_id] = {
    rating: rating.rating,
    feedback: rating.feedback || "",
    product_images: rating.product_images || []
  };
});

        }
        const productsWithRatings = flatProducts.map(product => {
  const ratingInfo = ratingsMap[product.order_product_id] || {};
  return {
    ...product,
    rating: ratingInfo.rating || null,
    feedback: ratingInfo.feedback || "",
    review_images: ratingInfo.product_images || []
  };
});


        setProducts(productsWithRatings);
        setCurrentPage(1);
      } else if (response.status === 404) {
        setProducts([]);
      } else {
        throw new Error(data.error || "Error filtering orders");
      }
    } catch (error) {
      console.error("Something went wrong!", error);
      displayPopup("Something went wrong while filtering orders.", "error");
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleStatusFilter = (status) => {
    setDeliveryStatus(status);
    filterMyOrders(status, orderTime);
  };
  
  const handleTimeFilter = (time) => {
    setOrderTime(time);
    filterMyOrders(deliveryStatus, time);
  };
  
  const currentYear = new Date().getFullYear();
  const orderTimeOptions = [
    "Last 30 days",
    ...Array.from({ length: 4 }, (_, i) => `${currentYear - i}`),
    "Older"
  ];
  
  const handleClearFilters = () => {
    setDeliveryStatus("");
    setOrderTime("");
    fetchOrders();
  };
  
  const renderStars = (rating) => {
    const totalStars = 5;
    return (
      <div className="stars-display">
        {[...Array(totalStars)].map((_, index) => (
          <span key={index} className={index < rating ? "filled-star" : "empty-star"}>
            ★
          </span>
        ))}
        <span className="rating-text">{rating}/5</span>
      </div>
    );
  };

  const searchOrdersByProduct = async (term) => {
    try {
      setIsLoading(true);

      const response = await fetch(`${API_BASE_URL}/customer-my-order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_id: customerId,
          action: "search",
          search_product_name: term.trim(),
        }),
      });
      const data = await response.json();
      if (response.ok) {
        const flatProducts = [];
        data.payments.forEach(order => {
          order.order_products.forEach(product => {
            flatProducts.push({ ...product, order });
          });
        });

        const ratingResponse = await fetch(`${API_BASE_URL}/view-rating`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ customer_id: customerId }),
        });
        const ratingData = await ratingResponse.json();
        const ratingsMap = {};
        if (ratingResponse.ok) {
          ratingData.ratings.forEach(rating => {
  ratingsMap[rating.order_product_id] = {
    rating: rating.rating,
    feedback: rating.feedback || "",
    product_images: rating.product_images || []
  };
});

        }
        const productsWithRatings = flatProducts.map(product => {
  const ratingInfo = ratingsMap[product.order_product_id] || {};
  return {
    ...product,
    rating: ratingInfo.rating || null,
    feedback: ratingInfo.feedback || "",
    review_images: ratingInfo.product_images || []
  };
});

        setProducts(productsWithRatings);
        setCurrentPage(1);
      } else {
        setProducts([]);
        setError(data.error || "No results found.");
      }
    } catch (error) {
      setError("Search fetch error: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };
  
  const indexOfLastOrder = currentPage * ordersPerPage;
  const indexOfFirstOrder = indexOfLastOrder - ordersPerPage;
  const currentOrders = products.slice(indexOfFirstOrder, indexOfLastOrder);

  const totalPages = Math.ceil(products.length / ordersPerPage);

  const goToFirstPage = () => setCurrentPage(1);
  const goToLastPage = () => setCurrentPage(totalPages);
  const nextPage = () => setCurrentPage(prev => Math.min(prev + 1, totalPages));
  const prevPage = () => setCurrentPage(prev => Math.max(prev - 1, 1));

  const getStatusText = (product) => {
    if (product.order.order_status?.toLowerCase() === "cancelled") {
      return "Order Cancelled";
    }

    const paymentStatus = product.payment_status?.toLowerCase().trim();

    if (product.delivery_status === "Delivered") {
      return "Delivered";
    } else if (product.shipping_status === "Shipped") {
      return "Shipped, item will be delivered soon";
    } else if (paymentStatus === "success" || paymentStatus === "payment successful") {
      return "Payment successful. Order placed, item will be shipped soon";
    } else {
      return `Payment Status: ${product.payment_status || "Unknown"}`;
    }
  };

  const getStatusClass = (product) => {
    if (product.order.order_status?.toLowerCase() === "cancelled") {
      return "order_cancelled";
    }
    const paymentStatus = product.payment_status?.toLowerCase().trim();

    if (product.delivery_status === "Delivered") {
      return "delivery_status";
    } else if (product.shipping_status === "Shipped") {
      return "shipping_status";
    } else if (paymentStatus === "success" || paymentStatus === "payment successful") {
      return "order_placed";
    } else {
      return "payment_pending";
    }
  };

  const handleCancelOrder = async (paymentId) => {
    try {
      setIsLoading(true);
      const response = await fetch(`${API_BASE_URL}/cancel-order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_id: customerId,
          payment_id: paymentId
        }),
      });

      const result = await response.json();

      if (response.ok) {
        displayPopup(result.message || "Order cancelled successfully.", "success");
       setProducts(prevProducts =>
  prevProducts.map(product =>
    product.order.payment_id === paymentId
      ? {
          ...product,
          payment_status: "Cancelled",
          shipping_status: "",
          delivery_status: "",
          order: {
            ...product.order,
            order_status: "Cancelled"
          }
        }
      : product
  )
);
      } else {
        displayPopup(result.error || "Failed to cancel order.", "error");
      }
    } catch (error) {
      console.error("Error cancelling order:", error);
      displayPopup("An error occurred while cancelling your order.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const isCancellable = (product) => {
    if (product.order.order_status?.toLowerCase() === "cancelled") return false;

    const paymentDate = new Date(product.order.payment_date);
    const now = new Date();
    const diffHours = (now - paymentDate) / 1000 / 60 / 60;

    return diffHours <= 3;
  };

  const hasMultipleProducts = (product) => {
    const orderId = product.order.product_order_id;
    const productsInSameOrder = products.filter(p => p.order.product_order_id === orderId);
    return productsInSameOrder.length > 1;
  };

  const areAllProductsDelivered = (product) => {
    const orderId = product.order.product_order_id;
    const productsInSameOrder = products.filter(p => p.order.product_order_id === orderId);
    return productsInSameOrder.every(p => p.delivery_status === "Delivered");
  };

  const isDeliveryReviewed = (product) => {
    return deliveryReviewedOrders.has(product.order.product_order_id);
  };

  return (
    <div className="my-orders-wrapper container">
      <div className="breadcrumb-order">
        <span onClick={() => navigate("/")}>Home</span>
        <span className="current-my-orders">My Orders</span>
      </div>

      <div className="order-page-container">
        {isMobile && (
          <div className="mobile-filter-toggle" onClick={() => setShowFilters(!showFilters)}>
            {showFilters ? "Hide Filters ▲" : "Show Filters ▼"}
          </div>
        )}

        <aside className={`filters-sidebar ${isMobile ? "mobile" : ""} ${showFilters ? "open" : ""}`}>
          <div className='filter-heading'>Filters</div>

          <div className="filter-section">
            <div className='filter-header'>ORDER STATUS</div>
            {["On the way", "Delivered"].map(status => (
              <label key={status}>
                <input
                  type="radio"
                  name="status"
                  checked={deliveryStatus === status}
                  onChange={() => handleStatusFilter(status)}
                /> {status}
              </label>
            ))}
          </div>
          <div className="filter-section">
            <div className="filter-header">ORDER TIME</div>
            {orderTimeOptions.map((time) => (
              <label key={time} style={{ display: 'block', marginBottom: '4px' }}>
                <input
                  type="radio"
                  name="orderTime"
                  checked={orderTime === time}
                  onChange={() => handleTimeFilter(time)}
                />{" "}
                {time}
              </label>
            ))}
          </div>
          <div className="filter-actions">
            <button className="clear-filters-button" onClick={() => handleClearFilters()}>
              Clear Filters
            </button>
          </div>
        </aside>
        <section className="orders-section">
          <div className="orders-search">
            <input
              type="text"
              placeholder="Search your orders..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <button
              className="search-btn"
              onClick={() => searchOrdersByProduct(searchTerm)}
              disabled={!searchTerm.trim()}
            >
              Search
            </button>
          </div>
          <h2 className="heading-my-order">My Orders</h2>
          <div className="popup-cart">
            {showPopup && (
              <PopupMessage
                message={popupMessage.text}
                type={popupMessage.type}
                onClose={() => setShowPopup(false)}
              />
            )}
          </div>
          <div className="orders-list">
            {products.length === 0 ? (
              <p className="no-orders">No orders found.</p>
            ) : (
              currentOrders.map((product, index) => (
                <div 
                  key={product.order_product_id}
                  className={`order-card ${product.order_product_id === selected_product_id ? 'highlight-product' : ''}`} 
                  ref={product.order_product_id === selected_product_id ? highlightedRef : null}
                >
                  <div className="product-summary">
                    <img src={product.product_image}
                      alt={product.product_name} className="product-image" />
                    <div className="product-info">
                      <div>
                        <p className="product-name">{product.product_name}</p>
                        <p>Order ID: {product.order.product_order_id}</p>
                        <p>Price: ₹{product.final_price.toFixed(2)} (incl. GST)
                          <span className="discount-tag-myorder">
                            {product.discount && parseFloat(product.discount) > 0 && `${product.discount} off`}
                          </span></p>
                        {parseFloat(product.price) !== parseFloat(product.final_price) && (
                          <p className="customer-discount-section-original-price-myorder">
                            ₹{product.price} (incl. GST)
                          </p>
                        )}
                        {product.gst && parseFloat(product.gst) > 0 && <p className="gst-myorder">GST: {product.gst}</p>}

                        <p className={getStatusClass(product)}>
                          {getStatusText(product)}
                        </p>
                        {product.order.order_status?.toLowerCase() === "cancelled" && product.order.cancel_date && (
                          <p className="cancel-date">
                            Cancelled on: {product.order.cancel_date}
                          </p>
                        )}

                        {product.payment_status === "Payment Successful" &&
                          !product.shipping_status &&
                          !product.delivery_status &&
                          isCancellable(product) && (
                            <div className="cancel-button-container">
                              <button
                                className="cancel-order-button"
                                onClick={() => handleCancelOrder(product.order.payment_id)}
                              >
                                Cancel Order
                              </button>
                            </div>
                          )}

                        {product.delivery_status === "Delivered" && product.rating && (
                          <div className="product-rating-display">
                            <div className="rating-summary">
                              {renderStars(product.rating)}
                            </div>
                            {product.feedback && (
                              <p className="review-preview">{product.feedback.substring(0, 100)}...</p>
                            )}
                          </div>
                        )}
{product.review_images?.length > 0 && (
  <div className="review-image-preview">
    {product.review_images.map((img, idx) => (
      <img
        key={idx}
        src={img}
        alt="Review"
        className="review-thumb"
      />
    ))}
  </div>
)}

                        {product.delivery_status === 'Delivered' && !product.rating && (
                          <div className="edit-review-button-container rate-review-button-container">
                            <button
                              className="edit-review-button rate-review-button"
                              onClick={() => setShowReviewFormFor(product.order_product_id)}
                            >
                              Rate and Review
                            </button>
                          </div>
                        )}

                        {product.delivery_status === "Delivered" && product.rating && (
                          <div className="edit-review-button-container">
                            <button
                              className="edit-review-button"
                              onClick={() => {
                                setEditReviewFor(product.order_product_id);
                                setEditRating(product.rating);
                                setEditFeedback(product.feedback || "");
                                setEditCharCount(product.feedback?.length || 0);
                              }}
                            >
                              Edit Review
                            </button>
                          </div>
                        )}

                        {product.delivery_status === "Delivered" && 
                         hasMultipleProducts(product) && 
                         areAllProductsDelivered(product) &&
                         !isDeliveryReviewed(product) && (
                          <div className="delivery-review-button-container">
                            <button
                              className="delivery-review-button"
                              onClick={() => setShowDeliveryReviewFor(product.order_product_id)}
                            >
                              Rate Delivery Experience
                            </button>
                          </div>
                        )}

                        <div className="toggle-container">
                          <span className="toggle-details" onClick={() => goToOrderDetails(product)}>
                            <FaCircleArrowRight />
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {(showReviewFormFor || editReviewFor || showDeliveryReviewFor) && (
            <div className="review-modal-overlay" onClick={(e) => {
              if (e.target.className === 'review-modal-overlay') {
                if (showReviewFormFor) {
                  setShowReviewFormFor(null);
                  setRating(0);
                  setFeedback("");
                }
                if (editReviewFor) {
                  setEditReviewFor(null);
                  setEditRating(0);
                  setEditFeedback("");
                }
                if (showDeliveryReviewFor) {
                  setShowDeliveryReviewFor(null);
                  setDeliveryRating(0);
                  setDeliveryFeedback("");
                }
              }
            }}>
              <div className="review-modal" onClick={(e) => e.stopPropagation()}>
                {showReviewFormFor && (
                  <EnhancedReviewForm
                    product={products.find(p => p.order_product_id === showReviewFormFor)}
                    rating={rating}
                    onRatingChange={setRating}
                    feedback={feedback}
                    onFeedbackChange={setFeedback}
                    charCount={charCount}
                    hoverRating={hoverRating}
                    onHoverChange={setHoverRating}
                    onSubmit={handleSubmitReview}
                    onCancel={() => {
                      setShowReviewFormFor(null);
                      setRating(0);
                      setFeedback("");
                      setCharCount(0);
                    }}
                  />
                )}
                
                {editReviewFor && (
                  <EnhancedReviewForm
                    product={products.find(p => p.order_product_id === editReviewFor)}
                    isEdit={true}
                    rating={editRating}
                    onRatingChange={setEditRating}
                    feedback={editFeedback}
                    onFeedbackChange={setEditFeedback}
                    charCount={editCharCount}
                    hoverRating={editHoverRating}
                    onHoverChange={setEditHoverRating}
                    onSubmit={handleEditReview}
                    onCancel={() => {
                      setEditReviewFor(null);
                      setEditRating(0);
                      setEditFeedback("");
                      setEditCharCount(0);
                    }}
                    title="Edit Your Review"
                  />
                )}
                
                {showDeliveryReviewFor && (
                  <EnhancedDeliveryReviewForm
                    product={products.find(p => p.order_product_id === showDeliveryReviewFor)}
                    rating={deliveryRating}
                    onRatingChange={setDeliveryRating}
                    feedback={deliveryFeedback}
                    onFeedbackChange={setDeliveryFeedback}
                    charCount={deliveryCharCount}
                    hoverRating={deliveryHoverRating}
                    onHoverChange={setDeliveryHoverRating}
                    onCancel={() => {
                      setShowDeliveryReviewFor(null);
                      setDeliveryRating(0);
                      setDeliveryFeedback("");
                      setDeliveryCharCount(0);
                    }}
                  />
                )}
              </div>
            </div>
          )}

          {products.length > 0 && (
            <div className="cmo-pagination-container">
              <button
                className="cmo-first-button"
                onClick={goToFirstPage}
                disabled={currentPage === 1}
              >
                First
              </button>

              <button
                className="cmo-previous-button"
                onClick={prevPage}
                disabled={currentPage === 1}
              >
                Previous
              </button>

              <span>Page {currentPage} of {totalPages}</span>

              <button
                className="cmo-next-button"
                onClick={nextPage}
                disabled={currentPage === totalPages}
              >
                Next
              </button>

              <button
                className="cmo-last-button"
                onClick={goToLastPage}
                disabled={currentPage === totalPages}
              >
                Last
              </button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default CustomerMyOrders;