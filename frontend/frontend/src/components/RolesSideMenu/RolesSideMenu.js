import { Link, useNavigate } from "react-router-dom";
import "../SideMenu/SideMenu.css";
import { MdDashboard } from "react-icons/md";
import { BiLogOut } from "react-icons/bi";
import { TbReportAnalytics } from "react-icons/tb";
import { FaWarehouse, FaBox } from "react-icons/fa6";
import { HiOutlineDocumentText } from "react-icons/hi";

const RolesSideMenu = ({ setIsAuthenticated }) => {
    const navigate = useNavigate();

    const handleLogout = () => {
        sessionStorage.clear();
        localStorage.clear();
        navigate("/role-login"); 
    };

    return (
        <div className="side-menu-container">
        <div className="sidemenu">
            <Link to="/day-wise-consolidated-report" className="sidemenu-item">
                <MdDashboard className="sidemenu-img" />
                <span className="sidemenu-label">Dashboard</span>
            </Link>

            <Link to="/dmrr-page" className="sidemenu-item">
                <TbReportAnalytics className="sidemenu-img" />
                <span className="sidemenu-label">DMRR</span>
            </Link>

            <Link to="/stock-page" className="sidemenu-item">
                <FaWarehouse className="sidemenu-img" />
                <span className="sidemenu-label">Overall Stock </span>
            </Link>

            <Link to="/bom-page" className="sidemenu-item">
                <FaBox className="sidemenu-img" />
                <span className="sidemenu-label">Product Stock</span>
            </Link>

            <Link to="/sin-page" className="sidemenu-item">
                <HiOutlineDocumentText className="sidemenu-img" />
                <span className="sidemenu-label">SIN</span>
            </Link>

            <Link to="/wip-page" className="sidemenu-item">
                <HiOutlineDocumentText className="sidemenu-img" />
                <span className="sidemenu-label">WIP</span>
            </Link>

            <Link to="/mtn-page" className="sidemenu-item">
                <HiOutlineDocumentText className="sidemenu-img" />
                <span className="sidemenu-label">MTN</span>
            </Link>

            <Link to="/mrn-page" className="sidemenu-item">
                <HiOutlineDocumentText className="sidemenu-img" />
                <span className="sidemenu-label">MRN</span>
            </Link>

            <Link to="/mrr-page" className="sidemenu-item">
    <HiOutlineDocumentText className="sidemenu-img" />
    <span className="sidemenu-label">MRR</span>
</Link>


              <Link to="/po-page" className="sidemenu-item">
                <HiOutlineDocumentText className="sidemenu-img" />
                <span className="sidemenu-label">Purchase Orders</span>
            </Link>

            <Link to="/mda-page" className="sidemenu-item">
                <HiOutlineDocumentText className="sidemenu-img" />
                <span className="sidemenu-label">MDA</span>
            </Link>

            <Link to="/role-login" className="sidemenu-item logout-link" onClick={handleLogout}>
                <BiLogOut className="sidemenu-img" />
                <span className="sidemenu-label">Logout</span>
            </Link>
        </div>
        </div>
    );
};

export default RolesSideMenu;