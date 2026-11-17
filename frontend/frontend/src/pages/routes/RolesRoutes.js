import { Routes, Route, Navigate } from "react-router-dom";
import RolesDashboard from "../RolesDashboard/RolesDashboard";


const RolesRoutes = () => {
    return (
        <Routes>
            <Route path="/roles-dashboard" element={<RolesDashboard />} />
            <Route path="*" element={<Navigate to="/roles-dashboard" />} />
        </Routes>
    );
};

export default RolesRoutes;
