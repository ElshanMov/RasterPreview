import type { MenuItem } from "../types/menu.type";
import { BarChartOutlined, FileImageOutlined, ProfileOutlined } from "@ant-design/icons";
import { GlobalOutlined } from "@ant-design/icons";
export const menus: MenuItem[] = [
    {
        label: "Dashboard",
        icon: <BarChartOutlined />,
        path: "/"
    },
    {
        label: "Pipelines",
        icon: <ProfileOutlined />,
        path: "/pipelines"
    },
    {
        label: 'Rasters',
        icon: <FileImageOutlined />,
        path: '/rasters',
    },
    {
        label: 'Map',
        icon: <GlobalOutlined />,
        path: '/raster-map',
    },
    {
        label: 'Spatial Analyses',
        icon: <GlobalOutlined />,
        path: '/spatial-analyses',
    },
];
