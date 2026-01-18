import { useEffect, useState, useCallback, useMemo } from "react";
import { Layout as AntLayout, theme, Spin, message } from "antd";
import { Outlet } from "react-router-dom";
import AppHeader from "./AppHeader";
import AppSidebar from "./AppSidebar";
import { GlobalLoadingProvider } from "../contexts/GlobalLoadingContext";
import socket from "../services/_socket";
import { AccountService } from "../services/account.service";
import type { Account } from "../types/account.type";

const { Content, Footer } = AntLayout;

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [account, setAccount] = useState<Account | null>(null);

  const { token } = theme.useToken();

  const fetchAccount = useCallback(async () => {
    try {
      setLoading(true);
      const response = await AccountService.getAccountProfile();
      setAccount(response.data);
    } catch (error) {
      console.error("Account Fetch Error:", error);
      message.error("İstifadəçi məlumatları yüklənərkən xəta baş verdi.");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSignOut = useCallback(() => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    message.success("Sistemdən çıxış edildi");
    window.location.href = "/login";
  }, []);

  useEffect(() => {
    fetchAccount();
    socket.init();

    return () => {
      socket.disconnect(); 
    };
  }, [fetchAccount]);

  const contentStyle = useMemo(() => ({
    margin: "16px",
    padding: "24px",
    background: token.colorBgContainer,
    borderRadius: token.borderRadiusLG,
    minHeight: 280,
  }), [token]);

  return (
    <AntLayout style={{ minHeight: "100vh" }}>
      <AppSidebar
        collapsed={collapsed}
        onCollapsed={setCollapsed}
      />

      <AntLayout>
        <AppHeader
          account={account || undefined}
          handleSignOut={handleSignOut}
          collapsed={collapsed}
          onCollapsed={() => setCollapsed((prev) => !prev)}
        />

        <GlobalLoadingProvider>
          <Content style={{ margin: "16px" }}>
            <div style={contentStyle}>
              {loading ? (
                <div style={{ textAlign: "center", padding: "50px" }}>
                  <Spin size="large" tip="Yüklənir..." />
                </div>
              ) : (
                <Outlet context={{ account }} />
              )}
            </div>
          </Content>
        </GlobalLoadingProvider>

        <Footer style={{ textAlign: "center", color: token.colorTextDescription }}>
          Milli Məkan ©{new Date().getFullYear()} — Admin Panel
        </Footer>
      </AntLayout>
    </AntLayout>
  );
}