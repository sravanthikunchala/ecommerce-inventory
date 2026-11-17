import React, { useState, useEffect } from "react";
import "./ViewRole.css";
import API_BASE_URL from "../../config";
import PopupMessage from "../../components/Popup/Popup";
import axios from "axios";
import { ClipLoader } from "react-spinners";
import { FiEdit } from "react-icons/fi";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";

const ViewRoles = () => {
  const adminId = sessionStorage.getItem("admin_id");

  const [isLoading, setIsLoading] = useState(true);
  const [roles, setRoles] = useState([]);
  const [showPopup, setShowPopup] = useState(false);
  const [popupMessage, setPopupMessage] = useState({ text: "", type: "" });
  const [isEditMode, setIsEditMode] = useState(false);
  const [editRoleId, setEditRoleId] = useState(null);

  const [formData, setFormData] = useState({
    firstname: "",
    lastname: "",
    email: "",
    phone: "",
    role: "",
    country_code: "+91",
  });

  useEffect(() => {
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    try {
      setIsLoading(true);
      const response = await axios.post(`${API_BASE_URL}/view-roles`, {
        admin_id: adminId,
      });
      if (response.status === 200) {
        setRoles(response.data.roles || []);
      }
    } catch (error) {
      setPopupMessage({ text: "Failed to fetch roles", type: "error" });
    } finally {
      setIsLoading(false);
    }
  };

  const displayPopup = (text, type = "success") => {
    setPopupMessage({ text, type });
     setShowPopup(true);

        setTimeout(() => {
            setShowPopup(false);
        }, 5000);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  // ✅ Open Edit Modal
  const handleEdit = (role) => {
    setIsEditMode(true);
    setEditRoleId(role.id);

    setFormData({
      firstname: role.first_name,
      lastname: role.last_name,
      email: role.email,
      phone: role.mobile_no,
      role: role.role_type,
      country_code: "+91",
    });

    setShowPopup(true);
  };

  // ✅ Reset when closing popup
  useEffect(() => {
    if (!showPopup) {
      setFormData({
        firstname: "",
        lastname: "",
        email: "",
        phone: "",
        role: "",
        country_code: "+91",
      });
      setPopupMessage({ text: "", type: "" });
      setIsEditMode(false);
      setEditRoleId(null);
    }
  }, [showPopup]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const endpoint = isEditMode ? "/edit-role" : "/add-role";

    const payload = {
      admin_id: adminId,
      first_name: formData.firstname,
      last_name: formData.lastname,
      email: formData.email,
      mobile_no: formData.phone,
      role_type: formData.role,
      ...(isEditMode && { role_id: editRoleId })
    };

    try {
      const response = await axios.post(`${API_BASE_URL}${endpoint}`, payload);

      if (response.status === 201 || response.status === 200) {
        displayPopup(
          isEditMode ? "Role updated successfully!" : "Role added successfully!",
          "success"
        );

        fetchRoles();

        setTimeout(() => {
          setShowPopup(false);
        }, 2000);
      }
    } catch (error) {
      displayPopup(error.response?.data?.error || "Something went wrong", "error");
    }
  };

  if (isLoading) {
    return (
      <div className="full-page-loading">
        <ClipLoader size={50} color="#4450A2" />
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="roles-container">
      <div className="roles-header">
        <h2>Roles</h2>
        <button
          className="add-btn"
          onClick={() => {
            setIsEditMode(false);
            setShowPopup(true);
          }}
        >
          Add Role
        </button>
      </div>

      <div className="customer-table-container role-table-container">
        <table className="customer-table">
          <thead>
            <tr>
              <th>S.No</th>
              <th>First Name</th>
              <th>Last Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Role Type</th>
              <th>Created On</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {roles.map((role, index) => (
              <tr key={role.id}>
                <td>{index + 1}</td>
                <td>{role.first_name}</td>
                <td>{role.last_name}</td>
                <td className="admin-email">{role.email}</td>
                <td>{role.mobile_no}</td>
                <td>{role.role_type}</td>
                <td>{role.created_on}</td>
                <td className="action-icons">
                  <FiEdit
                    size={18}
                    className="edit-icon"
                    onClick={() => handleEdit(role)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showPopup && (
        <div className="role-popup-overlay">
          <div className="role-popup-box">
            <h3>{isEditMode ? "Edit Role" : "Add New Role"}</h3>

          {popupMessage.text && (
  <PopupMessage
    message={popupMessage.text}
    type={popupMessage.type}
    onClose={() => setPopupMessage({ text: "", type: "" })}
  />
)}


            <form onSubmit={handleSubmit} className="form-container">
              <div className="role-form-row">
                <div>
                  <label>First Name *</label>
                  <input name="firstname" value={formData.firstname} onChange={handleChange} required />
                </div>
                <div>
                  <label>Last Name *</label>
                  <input name="lastname" value={formData.lastname} onChange={handleChange} required />
                </div>
              </div>

              <div className="role-form-row">
                <div>
                  <label>Email *</label>
                  <input name="email" type="email" value={formData.email} onChange={handleChange} required />
                </div>

                <div>
                  <label>Phone *</label>
                  <PhoneInput
                    country={"in"}
                    value={formData.phone}
                    onChange={(value) => setFormData({ ...formData, phone: value })}
                    containerClass="signup-phone-input"
                    inputClass="signup-input-field signup-mobile"
                    inputStyle={{ width: "100%" }}
                    required
                  />


                </div>
              </div>

              <div>
                <label>Role *</label>
                <select name="role" value={formData.role} onChange={handleChange} required>
                  <option value="">Select Role</option>
                  <option value="stores incharge">Stores Incharge</option>
                  <option value="quality incharge">Quality Incharge</option>
                  <option value="production incharge">Production Incharge</option>
                  <option value="finance">Finance</option>
                </select>
              </div>

              <div className="role-btn-group">
                <button type="button" className="role-cancel-btn" onClick={() => setShowPopup(false)}>
                  Cancel
                </button>
                <button type="submit" className="submit-btn">
                  {isEditMode ? "Update Role" : "Submit"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default ViewRoles;
