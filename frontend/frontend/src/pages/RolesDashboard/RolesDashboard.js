import RolesSideMenu from "../../components/RolesSideMenu/RolesSideMenu";
import RolesHeader from "../../components/RolesHeader/RolesHeader";
import "./RolesDashboard.css";

const RolesDashboard = ({ setIsAuthenticated }) => {
    return (
        <div className="roles-dashboard">
            <RolesHeader setIsAuthenticated={setIsAuthenticated} />
            <div className="roles-dashboard-body">
                <div className="roles-dashboard-sidebar">
                    <RolesSideMenu setIsAuthenticated={setIsAuthenticated} />
                </div>
                <div className="roles-dashboard-content">
                    <h1>Welcome to Roles Dashboard</h1>
                </div>
            </div>
        </div>
    );
};

export default RolesDashboard;
