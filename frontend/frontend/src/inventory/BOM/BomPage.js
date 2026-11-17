import React, { useState, useEffect } from "react";
import axios from "axios";
import BomTable from "./BomTable";
import { Clipboard, TrendingUp, Package, BarChart3 } from "lucide-react";

import RolesHeader from "../../components/RolesHeader/RolesHeader";
import RolesSideMenu from "../../components/RolesSideMenu/RolesSideMenu";
import { ClipLoader } from "react-spinners";

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "http://localhost:8000/api";

const BomPage = () => {
  const [bom, setBom] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [droneCount, setDroneCount] = useState(1);

 
  const fetchBomData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await axios.post(`${API_BASE_URL}/view-product-stock`);
      
      if (response.data.success) {
       
        const transformedData = response.data.data.map((item, index) => ({
          sno: index + 1,
          description: item.description || item.product_name,
          specifications: item.specifications || "",
          uom: item.uom || "",
          qtyPerDrone: item.qty_required_per_drone || 1,
          partNumber: item.part_number || "",
          countryOfOrigin: item.country_of_origin || "",
          qtyInStock: item.qty_in_stock || 0,
          basicPrice: parseFloat(item.basic_price) || 0,
          gst: parseFloat(item.gst) || 0,
          remarks: item.remarks || "",
          
          product_id: item.product_id,
          product_name: item.product_name,
          total_price_inc_gst: parseFloat(item.total_price_inc_gst) || 0
        }));
        
        setBom(transformedData);
      } else {
        setError(response.data.message || "Failed to fetch BOM data");
      }
    } catch (err) {
      console.error("Error fetching BOM data:", err);
      setError(err.response?.data?.error || err.message || "Failed to fetch BOM data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBomData();
  }, []);

 
  const totalParts = bom.length;
  const maxDrones = bom.length > 0 
    ? Math.min(...bom.map((item) => Math.floor(item.qtyInStock / item.qtyPerDrone)))
    : 0;
  
  const totalStockValue = bom.reduce((sum, item) => {
    const totalPrice = item.total_price_inc_gst 
      ? item.total_price_inc_gst * item.qtyInStock
      : (item.basicPrice + (item.basicPrice * item.gst) / 100) * item.qtyInStock;
    return sum + totalPrice;
  }, 0);
  
  const avgBoqCost = bom.length > 0 
    ? bom.reduce((sum, item) => {
        const itemCost = item.total_price_inc_gst 
          ? item.total_price_inc_gst * item.qtyPerDrone
          : (item.basicPrice + (item.basicPrice * item.gst) / 100) * item.qtyPerDrone;
        return sum + itemCost;
      }, 0) / bom.length
    : 0;

  const stats = [
    { 
      title: "Total Parts", 
      value: totalParts.toString(), 
      icon: Clipboard, 
      iconClass: "blue" 
    },
    { 
      title: "Max Drones Possible", 
      value: maxDrones.toString(), 
      icon: Package, 
      iconClass: "amber" 
    },
    { 
      title: "Avg BOQ Cost/Drone", 
      value: `₹${avgBoqCost.toFixed(2)}`, 
      icon: TrendingUp, 
      iconClass: "emerald" 
    },
    { 
      title: "Total Stock Value", 
      value: `₹${totalStockValue.toFixed(2)}`, 
      icon: BarChart3, 
      iconClass: "purple" 
    },
  ];

  
  const handleRefresh = () => {
    fetchBomData();
  };

  if (loading) {
    return (
      <div className="roles-dashboard">
        <RolesHeader />
        <div className="roles-page-body">
          <div className="roles-sidebar">
            <RolesSideMenu />
          </div>
          <div className="roles-main-content">
            <div className="bom-dmrr-container">
              <div className="full-page-loading">
              <div className="loading-content">
                <ClipLoader size={50} color="#4450A2" />
                <p>Loading...</p>
              </div>
            </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="roles-dashboard">
        <RolesHeader />
        <div className="roles-page-body">
          <div className="roles-sidebar">
            <RolesSideMenu />
          </div>
          <div className="roles-main-content">
            <div className="bom-dmrr-container">
              <div className="error-container">
                <h3>Error Loading BOM Data</h3>
                <p>{error}</p>
                <button onClick={handleRefresh} className="retry-button">
                  Retry
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="roles-dashboard">
      
      <RolesHeader />

      <div className="roles-page-body">
       
        <div className="roles-sidebar">
          <RolesSideMenu />
        </div>

       
        <div className="roles-main-content">
          <div className="bom-dmrr-container">
          
            <div className="dmrr-header">
              <div className="dmrr-header-content">
                <div className="dmrr-title-section">
                  <div className="dmrr-icon-container">
                    <Clipboard size={32} color="white" />
                  </div>
                  <div>
                    <h1 className="dmrr-title">Product-Based BOM Stock Statement</h1>
                    <p className="dmrr-subtitle">
                      Track BOM availability, drone production capacity, and costs
                    </p>
                  </div>
                </div>
                <div className="dmrr-actions">
                  <div className="dmrr-date-section">
                    <p className="dmrr-date-label">Today's Date</p>
                    <p className="dmrr-date-value">
                      {new Date().toLocaleDateString("en-US", {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                </div>
              </div>
            </div>

          
            <div className="dmrr-main-content">
             
              <div className="dmrr-stats-grid">
                {stats.map((stat, index) => (
                  <div key={index} className="dmrr-stat-card">
                    <div className="dmrr-stat-content">
                      <div className="dmrr-stat-text">
                        <h3>{stat.title}</h3>
                        <p>{stat.value}</p>
                      </div>
                      <div className={`dmrr-stat-icon ${stat.iconClass}`}>
                        <stat.icon size={24} />
                      </div>
                    </div>
                    <div className={`dmrr-stat-bar ${stat.iconClass}`}></div>
                  </div>
                ))}
              </div>

             
              <div className="dmrr-content-sections">
                <BomTable 
                  bom={bom} 
                  droneCount={droneCount} 
                  loading={loading}
                />
              </div>

              
              <div className="dmrr-footer">
                <div className="dmrr-footer-content">
                  <p className="dmrr-footer-text">
                    BOM Stock Management | Last updated:{" "}
                    {new Date().toLocaleTimeString()}
                  </p>
                  <div className="dmrr-footer-meta">
                    <span>Total Parts: {totalParts}</span>
                    <span>•</span>
                    <span>Active Session: {new Date().toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BomPage;