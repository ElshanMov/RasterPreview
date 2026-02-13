import type { TableProps } from "antd";
import type { SpatialAnalysisListItem } from "../../types/analysis.type";
import { FundViewOutlined } from "@ant-design/icons";

export interface SpatialAnalysisTableColumnsProps {
    handleView: (id: string) => void;
}

const SpatialAnalysisTableColumns = ({ handleView, }: SpatialAnalysisTableColumnsProps): TableProps<SpatialAnalysisListItem>["columns"] => [
    {
        title: "Name",
        dataIndex: "name",
    },
    {
        title: "Type",
        dataIndex: "typeName",
    },
    {
        title: "Description",
        dataIndex: "description",
    },
    {
        title: "Operations",
        render: (spatialAnalysis: SpatialAnalysisListItem) => (
            <div className="flex items-center gap-[10px]">
                <button
                    className="ml-2"
                    onClick={() => handleView(spatialAnalysis.id)}
                >
                    <FundViewOutlined style={{ fontSize: 16 }} />
                </button>
            </div>
        ),
    },
];

export default SpatialAnalysisTableColumns;