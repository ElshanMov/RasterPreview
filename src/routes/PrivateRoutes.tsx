import { Routes, Route, Navigate } from "react-router-dom";
import MainLayout from "../layouts/AppLayout";
import { privateRoutes } from "./routes";
import { useHasAccess } from "../hooks/useHasAccess";
import NotFound from "../pages/not-found/NotFoundPage";

const PrivateRoutes = () => {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        {privateRoutes.map(route => {
          const hasAccess = route.permission
            ? useHasAccess(route.permission)
            : true;

          return (
            <Route
              key={route.path}
              path={route.path}
              element={hasAccess ? route.element : <NotFound />}
            />
          );
        })}
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};

export default PrivateRoutes;