import type { TableProps } from "antd";
import type { BranchListItem } from "../../types/branch.type";
import { FundViewOutlined } from "@ant-design/icons";

export interface BranchTableColumnsProps {
    handleView: (id: string) => void;
}

const BranchTableColumns = ({ handleView, }: BranchTableColumnsProps): TableProps<BranchListItem>["columns"] => [
    {
        title: "Name",
        dataIndex: "name",
    },
    {
        title: "Code",
        dataIndex: "code",
    },
    {
        title: "Description",
        dataIndex: "description",
    },
    {
        title: "Operations",
        render: (branch: BranchListItem) => (
            <div className="flex items-center gap-[10px]">
                <button
                    className="ml-2"
                    onClick={() => handleView(branch.id)}
                >
                    <FundViewOutlined style={{ fontSize: 16 }} />
                </button>
            </div>
        ),
    },
];

export default BranchTableColumns;