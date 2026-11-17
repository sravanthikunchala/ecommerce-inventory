import React, { useState, useEffect } from "react";
import { PieChart, Pie, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from "recharts";
import RolesHeader from "../../components/RolesHeader/RolesHeader";   
import RolesSideMenu from "../../components/RolesSideMenu/RolesSideMenu";
import API_BASE_URL from "../../config";
import { ClipLoader } from "react-spinners";
import "./ConsolidatedReportCharts.css";
import { ChartNoAxesCombined} from "lucide-react";

const ConsolidatedReportCharts = () => {
  const [chartData, setChartData] = useState({
    stockValue: null,
    profitLoss: null,
    stockQuantity: null,
    monthlyComparison: null
  });
  const [loading, setLoading] = useState({
    stockValue: false,
    profitLoss: false,
    stockQuantity: false,
    monthlyComparison: false
  });
  const [errors, setErrors] = useState({
    stockValue: null,
    profitLoss: null,
    stockQuantity: null,
    monthlyComparison: null
  });
  
  const [chartViews, setChartViews] = useState({
    stockValue: "pie",
    profitLoss: "pie", 
    stockQuantity: "pie"
  });

  const [chartFilters, setChartFilters] = useState({
    stockValue: { start_date: "", end_date: "" },
    profitLoss: { start_date: "", end_date: "" },
    stockQuantity: { start_date: "", end_date: "" },
    monthlyComparison: { start_date: "", end_date: "" }
  });

  const [filterErrors, setFilterErrors] = useState({
  stockValue: "",
  profitLoss: "",
  stockQuantity: "",
  monthlyComparison: ""
});

  const [expandedFilters, setExpandedFilters] = useState({
    stockValue: false,
    profitLoss: false,
    stockQuantity: false,
    monthlyComparison: false
  });

  const PIE_COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];
  const BAR_COLORS = ['#0088FE', '#00C49F', '#FFBB28'];  

  const fetchChartData = async (chartType, customFilters = null) => {
    setLoading(prev => ({ ...prev, [chartType]: true }));
    setErrors(prev => ({ ...prev, [chartType]: null }));
    
    try {
      const filters = customFilters || chartFilters[chartType];
      const response = await fetch(`${API_BASE_URL}/consolidated-report-charts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          report_type: "day",  
          chart_type: "all",
          start_date: filters.start_date,
          end_date: filters.end_date
        }),
      });

      const data = await response.json();
      if (data.success) {
        setChartData(prev => ({
          ...prev,
          [chartType]: data
        }));
      } else {
        setErrors(prev => ({ 
          ...prev, 
          [chartType]: data.message || "Failed to fetch chart data" 
        }));
      }
    } catch (err) {
      console.error(`Error fetching ${chartType} chart data:`, err);
      setErrors(prev => ({ 
        ...prev, 
        [chartType]: "Error fetching chart data. Please try again." 
      }));
    } finally {
      setLoading(prev => ({ ...prev, [chartType]: false }));
    }
  };

  const fetchAllChartsData = async () => {
    const chartTypes = ['stockValue', 'profitLoss', 'stockQuantity', 'monthlyComparison'];
    chartTypes.forEach(chartType => fetchChartData(chartType));
  };

  useEffect(() => {
    fetchAllChartsData();
  }, []);

  const handleFilterChange = (chartType, field, value) => {
    setChartFilters(prev => ({
      ...prev,
      [chartType]: {
        ...prev[chartType],
        [field]: value
      }
    }));
  };

  const handleChartViewChange = (chartType, viewType) => {
    setChartViews(prev => ({
      ...prev,
      [chartType]: viewType
    }));
  };

  const openFilter = (chartType) => {
    setExpandedFilters(prev => ({
      ...prev,
      [chartType]: true
    }));
  };

  const closeFilter = (chartType) => {
    setChartFilters(prev => ({
      ...prev,
      [chartType]: {
        start_date: "",
        end_date: ""
      }
    }));
    setExpandedFilters(prev => ({
      ...prev,
      [chartType]: false
    }));
    fetchChartData(chartType, { start_date: "", end_date: "" });
  };

  const applyChartFilters = (chartType) => {
    fetchChartData(chartType);
  };

  const cancelFilter = (chartType) => {
    setExpandedFilters(prev => ({
      ...prev,
      [chartType]: false
    }));
  };

  const renderChartFilters = (chartType, title) => {
    const filters = chartFilters[chartType];
    const isExpanded = expandedFilters[chartType];
    
    if (!isExpanded) return null;

    return (
      <div className="individual-filters">
        <div className="filter-controls">
          <div className="filter-group">
            <label>Custom Date Range</label>
            <div className="date-inputs">
              <div className="date-input">
                <span>From</span>
                <input
                  type="date"
                  value={filters.start_date}
                  onChange={(e) => handleFilterChange(chartType, "start_date", e.target.value)}
                />
              </div>
              <div className="date-input">
                <span>To</span>
                <input
                  type="date"
                  value={filters.end_date}
                  onChange={(e) => handleFilterChange(chartType, "end_date", e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="filter-actions">
            <button 
              className="filter-btn secondary" 
              onClick={() => cancelFilter(chartType)}
            >
              Cancel
            </button>
            <button 
              className="filter-btn primary" 
              onClick={() => applyChartFilters(chartType)}
              disabled={loading[chartType]}
            >
              {loading[chartType] ? "Applying..." : "Apply"}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderChartCard = (title, dataKey, chartType) => {
    const chartDataForType = chartData[chartType];
    const isLoading = loading[chartType];
    const error = errors[chartType];
    const isFilterExpanded = expandedFilters[chartType];

    if (isLoading) {
      return (
        <div className="chart-card">
          <div className="chart-header">
            <h3>{title}</h3>
          </div>
          <div className="chart-loading">
            <ClipLoader size={30} color={"#4F4892"} />
            <p>Loading {title}...</p>
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="chart-card">
          <div className="chart-header">
            <h3>{title}</h3>
          </div>
          <div className="error-banner">
            <div className="error-content">
              <span className="error-icon">⚠️</span>
              <span>{error}</span>
              <button onClick={() => fetchChartData(chartType)} className="retry-btn">
                Retry
              </button>
            </div>
          </div>
        </div>
      );
    }

    const hasPieData = chartDataForType?.pie_charts?.[dataKey] && 
                      chartDataForType.pie_charts[dataKey].length > 0 &&
                      chartDataForType.pie_charts[dataKey].some(item => item.value !== 0);

    const hasBarData = chartDataForType?.bar_charts?.[dataKey] && 
                      chartDataForType.bar_charts[dataKey].length > 0 &&
                      chartDataForType.bar_charts[dataKey].some(item => item.value !== 0);

    if (!chartDataForType || (!hasPieData && !hasBarData)) {
      return (
        <div className="chart-card">
          <div className="chart-header">
            <h3>{title}</h3>
            <div className="chart-controls">
              <button 
                className={`filter-toggle-btn ${isFilterExpanded ? 'active' : ''}`}
                onClick={() => isFilterExpanded ? closeFilter(chartType) : openFilter(chartType)}
              >
                {isFilterExpanded ? '✕' : 'Filter'}
              </button>
              <select className="view-select" disabled>
                <option>Pie Chart</option>
                <option>Bar Graph</option>
              </select>
            </div>
          </div>
          {renderChartFilters(chartType, title)}
          <div className="no-chart-data">
            <p>No data found for this time interval</p>
          </div>
        </div>
      );
    }

    const isPieView = chartViews[chartType] === "pie";
    const data = isPieView ? chartDataForType.pie_charts[dataKey] : chartDataForType.bar_charts[dataKey];

    return (
      <div className="chart-card">
        <div className="chart-header">
          <h3>{title}</h3>
          <div className="chart-controls">
            <button 
              className={`filter-toggle-btn ${isFilterExpanded ? 'active' : ''}`}
              onClick={() => isFilterExpanded ? closeFilter(chartType) : openFilter(chartType)}
            >
              {isFilterExpanded ? '✕' : 'Filter'}
            </button>
            <select 
              className="view-select"
              value={chartViews[chartType]}
              onChange={(e) => handleChartViewChange(chartType, e.target.value)}
            >
              <option value="pie">Pie Chart</option>
              <option value="bar">Bar Graph</option>
            </select>
          </div>
        </div>

        {renderChartFilters(chartType, title)}

        <div className="chart-content">
          {isPieView ? (
            <ResponsiveContainer width="100%" height={400}>
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent, value }) => 
                    dataKey === 'profit_loss' && name === 'Net Profit/Loss' 
                      ? `${name}: ₹${Math.abs(value).toLocaleString()}`
                      : `${name}: ${(percent * 100).toFixed(0)}%`
                  }
                  outerRadius={100}
                  innerRadius={40}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {data.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={
                        dataKey === 'profit_loss' && entry.value < 0 
                          ? '#FF6B6B' 
                          : PIE_COLORS[index % PIE_COLORS.length]
                      } 
                    />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value, name) => {
                    if (dataKey === 'stock_value' || dataKey === 'profit_loss') {
                      return [`₹${Number(value).toLocaleString()}`, name];
                    }
                    return [value.toLocaleString(), name];
                  }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="name" 
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  fontSize={12}
                />
                <YAxis 
                  tickFormatter={(value) => {
                    if (dataKey === 'stock_value' || dataKey === 'profit_loss') {
                      return `₹${(value/1000).toFixed(0)}k`;
                    }
                    return value.toLocaleString();
                  }}
                  fontSize={12}
                />
                <Tooltip 
                  formatter={(value, name) => {
                    if (dataKey === 'stock_value' || dataKey === 'profit_loss') {
                      return [`₹${Number(value).toLocaleString()}`, name];
                    }
                    return [value.toLocaleString(), name];
                  }}
                  contentStyle={{ 
                    borderRadius: '8px',
                    fontSize: '12px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                  }}
                />
                <Legend />
                <Bar 
                  dataKey="value" 
                  radius={[4, 4, 0, 0]}
                  barSize={40} 
                >
                  {data.map((entry, index) => (
                    <Cell 
                      key={`bar-cell-${index}`} 
                      fill={
                        dataKey === 'profit_loss' && entry.value < 0 
                          ? '#FF6B6B' 
                          : BAR_COLORS[index % BAR_COLORS.length]
                      } 
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    );
  };

  const renderMonthlyComparison = () => {
    const chartType = 'monthlyComparison';
    const chartDataForType = chartData[chartType];
    const isLoading = loading[chartType];
    const error = errors[chartType];
    const isFilterExpanded = expandedFilters[chartType];

    if (isLoading) {
      return (
        <div className="comparison-card">
          <div className="chart-header">
            <h3>Monthly Performance Trend</h3>
          </div>
          <div className="chart-loading">
            <ClipLoader size={30} color={"#4F4892"} />
            <p>Loading Monthly Trend...</p>
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="comparison-card">
          <div className="chart-header">
            <h3>Monthly Performance Trend</h3>
          </div>
          <div className="error-banner">
            <div className="error-content">
              <span className="error-icon">⚠️</span>
              <span>{error}</span>
              <button onClick={() => fetchChartData(chartType)} className="retry-btn">
                Retry
              </button>
            </div>
          </div>
        </div>
      );
    }

    const hasMonthlyData = chartDataForType?.bar_charts?.monthly_comparison && 
                          chartDataForType.bar_charts.monthly_comparison.length > 0 &&
                          chartDataForType.bar_charts.monthly_comparison.some(item => 
                            item.stock_received !== 0 || item.sales !== 0 || item.cost !== 0
                          );

    if (!chartDataForType || !hasMonthlyData) {
      return (
        <div className="comparison-card">
          <div className="chart-header">
            <h3>Monthly Performance Trend</h3>
            <div className="chart-controls">
              <button 
                className={`filter-toggle-btn ${isFilterExpanded ? 'active' : ''}`}
                onClick={() => isFilterExpanded ? closeFilter(chartType) : openFilter(chartType)}
              >
                {isFilterExpanded ? '✕' : 'Filter'}
              </button>
            </div>
          </div>
          {renderChartFilters(chartType, "Monthly Performance Trend")}
          <div className="no-chart-data">
            <p>No data found for this time interval</p>
          </div>
        </div>
      );
    }

    return (
      <div className="comparison-card">
        <div className="chart-header">
          <h3>Monthly Performance Trend</h3>
          <div className="chart-controls">
            <button 
              className={`filter-toggle-btn ${isFilterExpanded ? 'active' : ''}`}
              onClick={() => isFilterExpanded ? closeFilter(chartType) : openFilter(chartType)}
            >
              {isFilterExpanded ? '✕' : 'Filter'}
            </button>
          </div>
        </div>
        
        {renderChartFilters(chartType, "Monthly Performance Trend")}

        <div className="chart-content">
          <ResponsiveContainer width="100%" height={400}>
            <BarChart 
              data={chartDataForType.bar_charts.monthly_comparison}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="month" 
                angle={-45}
                textAnchor="end"
                height={80}
                fontSize={12}
              />
              <YAxis 
                tickFormatter={(value) => `₹${(value/1000).toFixed(0)}k`}
                fontSize={12}
              />
              <Tooltip 
                formatter={(value) => [`₹${Number(value).toLocaleString()}`, 'Value']}
                contentStyle={{ 
                  borderRadius: '8px',
                  fontSize: '12px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                }}
              />
              <Legend />
              <Bar 
                dataKey="stock_received" 
                fill="#0088FE" 
                name="Stock Received" 
                radius={[4, 4, 0, 0]}
                barSize={25}
              />
              <Bar 
                dataKey="sales" 
                fill="#00C49F" 
                name="Sales" 
                radius={[4, 4, 0, 0]}
                barSize={25}
              />
              <Bar 
                dataKey="cost" 
                fill="#FF8042" 
                name="Cost" 
                radius={[4, 4, 0, 0]}
                barSize={25}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  };

  return (
    <div className="roles-dashboard">
      <RolesHeader />
      <div className="roles-page-body">
        <div className="roles-page-sidebar">
          <RolesSideMenu />
        </div>
     
          <div className="charts-container">

            <div className="charts-grid">
              {renderChartCard("Stock Value Distribution", "stock_value", "stockValue")}
              {renderChartCard("Profit & Loss Breakdown", "profit_loss", "profitLoss")}
              {renderChartCard("Stock Quantity Movement", "stock_quantity", "stockQuantity")}
            </div>

            {renderMonthlyComparison()}

          </div>
        </div>
      </div>
  
  );
};

export default ConsolidatedReportCharts;