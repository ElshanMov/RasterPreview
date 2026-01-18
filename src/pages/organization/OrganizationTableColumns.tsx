import type { TableProps } from "antd";
import type { OrganizationListItem } from "../../types/organization.type";
import { FundViewOutlined } from "@ant-design/icons";

export interface OrganizationTableColumnsProps {
    handleView: (id: string) => void;
}

const OrganizationTableColumns = ({ handleView, }: OrganizationTableColumnsProps): TableProps<OrganizationListItem>["columns"] => [
    {
        title: "Organization",
        dataIndex: "parentName",
    },
    {
        title: "Name",
        dataIndex: "name",
    },
    {
        title: "Code",
        dataIndex: "code",
    },
    {
        title: "Type",
        dataIndex: "typeName",
    },
    {
        title: "Operations",
        render: (organization: OrganizationListItem) => (
            <div className="flex items-center gap-[10px]">
                <button
                    className="ml-2"
                    onClick={() => handleView(organization.id)}
                >
                    <FundViewOutlined style={{ fontSize: 16 }} />
                </button>
            </div>
        ),
    },
];

export default OrganizationTableColumns;