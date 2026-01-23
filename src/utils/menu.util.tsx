import type { MenuItem } from "../types/menu.type";
import { BarChartOutlined, FileImageOutlined, ProfileOutlined } from "@ant-design/icons";
import { GlobalOutlined } from "@ant-design/icons";
export const menus: MenuItem[] = [
    {
        label: "Dashboard",
        icon: <BarChartOutlined  />, 
        path: "/"
    },
    {
    label: 'Raster Map',
    icon: <GlobalOutlined />,
    path: '/raster-map',
    },
    {
        label: "Pipelines",
        icon: <ProfileOutlined   />, 
        path: "/pipelines"
    },
    {
        label: 'Rasters',
        icon: <FileImageOutlined />,
        path: '/rasters',
    },
];
