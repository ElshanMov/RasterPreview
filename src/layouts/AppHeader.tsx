import { LogoutOutlined, MenuFoldOutlined, MenuUnfoldOutlined } from "@ant-design/icons";
import { Layout as AntLayout, Button, Popconfirm } from "antd";
import type { Account } from "../types/account.type";

const { Header } = AntLayout;

interface AppHeaderProps {
  account: Account | undefined;
  collapsed: boolean;
  handleSignOut: () => void;
  onCollapsed: () => void;
}

export default function AppHeader({
  account,
  collapsed,
  handleSignOut,
  onCollapsed }: AppHeaderProps) {

  return (
    <Header
      style={{
        padding: "0 16px",
        background: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <Button type="text" onClick={onCollapsed} style={{ fontSize: 18 }}>
        {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
      </Button>

      <div>
        <span style={{ marginRight: 6, fontSize: '16px' }}>
          {account?.given_name} {account?.family_name}
        </span>

        <Popconfirm
          title="Çıxış etmək istəyirsiniz?"
          onConfirm={handleSignOut}
          okText="Bəli"
          cancelText="Xeyr"
          placement="bottomRight"
        >
          <Button
            type="primary"
            danger
            icon={<LogoutOutlined />}
          />
        </Popconfirm>


      </div>
    </Header>
  )
}