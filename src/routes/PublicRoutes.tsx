import LoginPage from "../pages/login/LoginPage"
import { Navigate, Route, Routes } from "react-router-dom"

const PublicRoutes: React.FC = () => {
    return (
        <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/*" element={<Navigate to="/login" replace />} />
        </Routes>
    );
};

export default PublicRoutes;