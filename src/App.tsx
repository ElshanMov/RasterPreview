import { App as AntdApp } from "antd";
import PrivateRoutes from "./routes/PrivateRoutes";
import PublicRoutes from "./routes/PublicRoutes";

export default function App() {
  const isAuthenticated = Boolean(localStorage.getItem('accessToken') && localStorage.getItem('refreshToken'));
  return (
    <AntdApp>
      {isAuthenticated ? <PrivateRoutes /> : <PublicRoutes />}
    </AntdApp>
  );
}