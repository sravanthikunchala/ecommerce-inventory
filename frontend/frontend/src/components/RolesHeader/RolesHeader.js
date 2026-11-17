import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Logo from "../../assets/images/headerlogo.png";
import { IoPerson } from "react-icons/io5";
import "../Header/Header.css";

const RolesHeader = ({ setIsAuthenticated }) => {
    const navigate = useNavigate();
    const [showDropdown, setShowDropdown] = useState(false);
    const dropdownRef = useRef(null);

    const roleData = JSON.parse(sessionStorage.getItem("roleData") || "{}");
    const roleEmail = sessionStorage.getItem("email") ||"Role User";

    const handleLogout = () => {
        sessionStorage.clear();
        localStorage.clear();
        navigate("/role-login"); 
    };

    const toggleDropdown = () => {
        setShowDropdown((prev) => !prev);
    };

    const handleClickOutside = (event) => {
        if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
            setShowDropdown(false);
        }
    };
    document.addEventListener("mousedown", handleClickOutside);

    return (
        <header>
            <div className="top-nav">
                <img src={Logo} alt="Logo" className="role-header-logo" />

                <div className="profile-container" ref={dropdownRef}>
                    <IoPerson className="role-profile-icon" onClick={toggleDropdown} />
                    {showDropdown && (
                        <div className="profile-dropdown">
                            <p className="dropdown-item">{roleEmail}</p>
                            <button className="dropdown-item logout-button" onClick={handleLogout}>
                                Logout
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
};

export default RolesHeader;
