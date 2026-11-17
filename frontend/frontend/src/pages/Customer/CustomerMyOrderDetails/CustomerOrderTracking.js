import React, { useEffect, useState } from "react";
import "./CustomerOrderTracking.css";
import {
  FaTruck,
  FaCheckCircle,
  FaMapMarkerAlt,
  FaExclamationTriangle,
  FaRedo
} from "react-icons/fa";
import { PiDroneBold } from "react-icons/pi";

const OrderTracking = ({ trackingData, orderStatus }) => {
  const [progressPercent, setProgressPercent] = useState(0);
  const [derivedStatus, setDerivedStatus] = useState("");
  const [latestUpdate, setLatestUpdate] = useState(null);
  const [trackingHistory, setTrackingHistory] = useState([]);
  const [shipmentHistory, setShipmentHistory] = useState([]); // ✅ Only shipment entries
  const [undeliveredInfo, setUndeliveredInfo] = useState(null);
  const [nextAttempt, setNextAttempt] = useState(null);

    // ✅ MOVE IT HERE (GLOBAL INSIDE COMPONENT)
  const mapToCustomerStatus = (status, reason) => {
    if (!status) return "";

    const s = status.toLowerCase().trim();

    if (s.includes("shipment booked")) return "Shipped";
    if (s.includes("out for pickup")) return "Picked Up";
    if (s.includes("in transit")) return "In Transit";
    if (s.includes("out for delivery")) return "Out for Delivery";
    if (s.includes("undelivered")) return "Delivery Attempted";
    if (s.includes("delivered")) return "Delivered";

    return status;
  };

  // Process tracking data
  useEffect(() => {
    if (trackingData && trackingData.length > 0) {
      const tracking = trackingData[0];
      
      // Use current_status from backend first
      if (tracking.current_status) {
        setDerivedStatus(tracking.current_status.toLowerCase());
      }
      
      // Get the latest tracking history entry for additional info
      if (tracking.tracking_history && tracking.tracking_history.length > 0) {
        // Filter ONLY shipment type entries for progress tracking
        const shipmentEntries = tracking.tracking_history.filter(
          entry => entry.type === "shipment"
        );
        
        // Keep all entries for display purposes
        const processedHistory = [];
        let foundUndelivered = null;
        let foundReattempt = null;
        let lastShipmentEntry = null;
        
        tracking.tracking_history.forEach((entry, index) => {
          // Handle ALL entries for display (including NDR)
          if (entry.type === "shipment" || entry.type === "ndr") {
            processedHistory.push({
              ...entry,
              id: `${entry.type}-${index}`,
              displayStatus: entry.status || entry.action || entry.type
            });
          }
          
          // Track undelivered status from shipment entries
          if (entry.type === "shipment" && entry.status?.toLowerCase().includes("undelivered")) {
            foundUndelivered = {
              time: entry.time,
              reason: entry.reason || "Delivery could not be completed",
              status: entry.status
            };
          }
          
          // Handle NDR entries for reattempt information
          if (entry.type === "ndr" && entry.action === "Re-Attempt Request") {
            foundReattempt = {
              action_date: entry.action_date,
              preferred_date: entry.details?.prefered_date,
              action_by: entry.action_by
            };
          }

          // Get the last shipment entry for status
          if (entry.type === "shipment") {
            lastShipmentEntry = {
              ...entry,
              id: `shipment-${index}`
            };
          }
        });
        
        setTrackingHistory(processedHistory);
        setShipmentHistory(shipmentEntries); // ✅ Store only shipment entries
        setLatestUpdate(lastShipmentEntry);
        setUndeliveredInfo(foundUndelivered);
        setNextAttempt(foundReattempt);
        
        // If no current_status, use the last shipment entry status
        if (!tracking.current_status && lastShipmentEntry?.status) {
          setDerivedStatus(lastShipmentEntry.status.toLowerCase());
        }
      }
    } else {
      setDerivedStatus(orderStatus || "");
    }
  }, [trackingData, orderStatus]);

  const normalizedStatus = derivedStatus.toLowerCase().replace(/\s+/g, "_");

  // Check if delivered (only from shipment entries)
  const isDelivered = shipmentHistory.some(
    entry => entry.status?.toLowerCase().includes("delivered")
  ) || normalizedStatus.includes("delivered");

  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    if (isNaN(date)) return "";
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const formatDateOnly = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    if (isNaN(date)) return "";
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  };

  const steps = [
    { key: "out_for_pickup", label: "Out for Pickup", icon: <FaTruck /> },
    { key: "in_transit", label: "In Transit", icon: <FaMapMarkerAlt /> },
    { key: "delivered", label: "Delivered", icon: <FaCheckCircle /> }
  ];

  const getCurrentStepIndex = () => {
    // Use ONLY shipment history for step calculation
    if (shipmentHistory.length > 0) {
      // Get the latest shipment entry
      const latestShipment = shipmentHistory[shipmentHistory.length - 1];
      const status = latestShipment?.status?.toLowerCase() || "";
      
      // Step 0: Out for Pickup
      if (status.includes("out for pickup") || 
          status.includes("pickup") ||
          status.includes("shipment_booked")) return 0;
      
      // Step 1: In Transit (covers all intermediate states)
      if (status.includes("in_transit") || 
          status.includes("reached") ||
          status.includes("out for delivery") ||
          status.includes("undelivered")) return 1;
      
      // Step 2: Delivered
      if (status.includes("delivered")) return 2;
    }
    
    // Fallback to normalizedStatus if no shipment history
    const status = normalizedStatus;
    if (status.includes("out for pickup") || status.includes("pickup") || status.includes("shipment_booked")) return 0;
    if (status.includes("in_transit") || status.includes("reached") || status.includes("out for delivery") || status.includes("undelivered")) return 1;
    if (status.includes("delivered")) return 2;
    
    return 0;
  };

  const currentStepIndex = getCurrentStepIndex();

  useEffect(() => {
    const percent = (currentStepIndex / (steps.length - 1)) * 100;
    setTimeout(() => {
      setProgressPercent(percent);
    }, 200);
  }, [currentStepIndex]);

  // Get delivery time
  const getDeliveryTime = () => {
    if (!trackingData || trackingData.length === 0) return null;
    
    const tracking = trackingData[0];
    if (tracking.tracking_history) {
      const deliveredEntry = tracking.tracking_history.find(
        entry => entry.type === "shipment" && 
                entry.status && 
                entry.status.toLowerCase().includes("delivered")
      );
      return deliveredEntry?.time || tracking.current_status_time;
    }
    return tracking.current_status_time;
  };

  // Filter tracking history to show from Out for Pickup onwards (shipment only)
  const getRelevantShipmentHistory = () => {
    let startIndex = shipmentHistory.findIndex(
      entry => entry.status?.toLowerCase().includes("out_for_pickup") ||
               entry.status?.toLowerCase().includes("shipment_booked")
    );
    
    if (startIndex === -1) startIndex = 0;
    
    return shipmentHistory.slice(startIndex);
  };

  // Get the latest status message for display
  const getStatusMessage = () => {
    if (latestUpdate) {
      if (latestUpdate.reason) {
        return `${mapToCustomerStatus(latestUpdate.status, latestUpdate.reason)}${
  latestUpdate.reason ? " - " + latestUpdate.reason : ""
}`;
      }
      return latestUpdate.status;
    }
    return derivedStatus;
  };

  // If Delivered → Show Success Card
  if (isDelivered) {
    const relevantHistory = getRelevantShipmentHistory();

  

    
    return (
      <div className="tracking-complete-wrapper">
        <div className="delivery-success-card">
          <FaCheckCircle className="delivery-icon" />
          <div>
            <h3>✓ Delivered Successfully</h3>
            <p>
              Delivered on {formatDate(getDeliveryTime())}
            </p>
          </div>
        </div>
        
        {/* Show complete tracking journey (shipment only) */}
        {relevantHistory.length > 0 && (
          <div className="tracking-journey">
            <h4>Tracking Journey</h4>
            <div className="journey-timeline">
              {relevantHistory.map((entry, index) => (
                <div key={entry.id || index} className="journey-item">
                  <div className="journey-dot">
                    {entry.status?.toLowerCase().includes("delivered") ? (
                      <FaCheckCircle />
                    ) : entry.status?.toLowerCase().includes("undelivered") ? (
                      <FaExclamationTriangle />
                    ) : (
                      <div className="dot" />
                    )}
                  </div>
                  <div className="journey-content">
                    <div className="journey-status">
  {mapToCustomerStatus(entry.status, entry.reason)}
</div>
                    {entry.reason && (
                      <div className="journey-reason">{entry.reason}</div>
                    )}
                    <div className="journey-time">{formatDate(entry.time)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // If no tracking data and no status, show a message
  if ((!trackingData || trackingData.length === 0) && !orderStatus) {
    return (
      <div className="tracking-wrapper">
        <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
          <p>No tracking information available yet.</p>
          <p style={{ fontSize: '13px', marginTop: '8px' }}>
            Tracking will be updated once your order is processed.
          </p>
        </div>
      </div>
    );
  }

  // Check if we have undelivered info from shipment entries
  const showUndeliveredInfo = undeliveredInfo && !isDelivered;

  return (
    <div className="tracking-wrapper">
      {/* Main Timeline - Now based on shipment history only */}
      <div className="tracking-timeline-modern">
        <div className="timeline-base-line" />
        <div
          className="progress-line"
          style={{ width: `${progressPercent}%` }}
        />
        <div
          className="drone-indicator"
          style={{ left: `${progressPercent}%` }}
        >
          <PiDroneBold />
        </div>

        {steps.map((step, index) => {
          let statusClass = "pending";
          if (index < currentStepIndex) statusClass = "completed";
          else if (index === currentStepIndex) statusClass = "active";

          return (
            <div key={step.key} className="modern-step">
              <div className={`modern-icon ${statusClass}`}>
                {step.icon}
              </div>
              <div className="modern-label">{step.label}</div>
            </div>
          );
        })}
      </div>
      
      {/* Current Status */}
      {derivedStatus && (
        <div className={`status-card ${showUndeliveredInfo ? 'status-card-warning' : ''}`}>
          <div className="status-header">
            <span className="status-label">CURRENT STATUS</span>
            {showUndeliveredInfo && (
              <FaExclamationTriangle className="status-warning-icon" />
            )}
          </div>
          <div className="status-value">
            {getStatusMessage()}
          </div>
          {latestUpdate?.time && (
            <div className="status-time">
              Last updated: {formatDate(latestUpdate.time)}
            </div>
          )}
        </div>
      )}

      {/* Undelivered Information with Next Steps */}
      {showUndeliveredInfo && (
        <div className="undelivered-section">
          <div className="undelivered-card">
            <div className="undelivered-header">
              <FaExclamationTriangle className="undelivered-icon" />
              <h4>⚠️ Delivery Attempt Failed</h4>
            </div>
            <div className="undelivered-details">
              <p><strong>Reason:</strong> {undeliveredInfo.reason}</p>
              <p><strong>Attempted on:</strong> {formatDate(undeliveredInfo.time)}</p>
            </div>
            
            {/* Next Attempt Information */}
            {nextAttempt && (
              <div className="next-attempt-card">
                <div className="next-attempt-header">
                  <FaRedo className="reattempt-icon" />
                  <h5>📅 Next Delivery Attempt Scheduled</h5>
                </div>
                <div className="next-attempt-details">
                  {nextAttempt.preferred_date && (
                    <p>
                      <strong>Preferred Date:</strong>{' '}
                      {formatDateOnly(nextAttempt.preferred_date)}
                    </p>
                  )}
                  <p><strong>Scheduled by:</strong> {nextAttempt.action_by}</p>
                  <p><strong>On:</strong> {formatDate(nextAttempt.action_date)}</p>
                </div>
              </div>
            )}
            
            {/* Action Required */}
            <div className="action-required">
              <p>⚠️ Please ensure someone is available to receive the package.</p>
              <p>🔗 You can also contact support to reschedule or provide delivery instructions.</p>
            </div>
          </div>
        </div>
      )}

      {/* Tracking History - Show ALL entries but highlight shipment ones */}
      {trackingHistory.length > 0 && !isDelivered && (
        <div className="tracking-history-section">
          <h4>Tracking History</h4>
          <div className="history-timeline">
            {trackingHistory
  .filter(entry => entry.type === "shipment")
  .map((entry, index) => (
              <div key={entry.id || index} className={`history-item ${entry.type === 'ndr' ? 'ndr-entry' : ''}`}>
                <div className="history-marker">
                  {entry.type === 'ndr' ? (
                    <div className="marker-ndr">📋</div>
                  ) : entry.status?.toLowerCase().includes("undelivered") ? (
                    <FaExclamationTriangle className="marker-icon warning" />
                  ) : entry.status?.toLowerCase().includes("out_for_delivery") ? (
                    <FaTruck className="marker-icon" />
                  ) : (
                    <div className="marker-dot" />
                  )}
                </div>
                <div className="history-content">
                  <div className="history-status-row">
                    <span className="history-status">
                      {entry.type === "shipment"
  ? mapToCustomerStatus(entry.status, entry.reason)
  : null}
                      {entry.type === 'ndr' && ' (System Update)'}
                    </span>
                    <span className="history-time">
                      {formatDate(entry.time || entry.action_date)}
                    </span>
                  </div>
                  {entry.reason && (
                    <div className="history-reason">{entry.reason}</div>
                  )}
                  {entry.type === 'ndr' && entry.details && (
                    <div className="history-details">
                      {Object.entries(entry.details).map(([key, value]) => (
                        <div key={key} className="detail-item">
                          <strong>{key}:</strong> {JSON.stringify(value)}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderTracking;