import { Link } from "react-router-dom";
import { Layout as AntLayout, Menu } from "antd";
import type { MenuItem } from "../types/menu.type";
import { menus } from "../utils/menu.util";

const { Sider } = AntLayout;

interface AppSidebarProps {
    collapsed: boolean;
    onCollapsed: (collapsed: boolean) => void;
}

export default function AppSidebar({ collapsed, onCollapsed }: AppSidebarProps) {
    return (
        <Sider
            collapsible
            collapsed={collapsed}
            onCollapse={onCollapsed}
            breakpoint="lg"
            collapsedWidth={80}>
            <div
                style={{
                    height: 64,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: collapsed ? "center" : "flex-start",
                    paddingLeft: collapsed ? 0 : 16,
                    color: "white",
                    fontWeight: "bold",
                    fontSize: 18,
                }}
            >
                {collapsed ? "MM" : "Milli Mekan"}
            </div>

            <Menu
                theme="dark"
                mode="inline"
                defaultSelectedKeys={["1"]}
                items={menus.map((item: MenuItem, index: number) => ({
                    key: `${index + 1}`,
                    icon: item.icon,
                    label: <Link to={item.path}>{item.label}</Link>,
                }))}
            />
        </Sider>
    )
}