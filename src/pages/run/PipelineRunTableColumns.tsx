import { Button, type TableProps } from "antd";
import type { PipelineRunListItem } from "../../types/pipeline.run.type";
import dayjs from "dayjs";

export interface PipelineTableColumnsProps {
    handleNavigate: (id: string) => void;
}

const PipelineAuditTableColumns = ({ handleNavigate }: PipelineTableColumnsProps): TableProps<PipelineRunListItem>["columns"] => [
    {
        title: "Name",
        render: (pipelineRun: PipelineRunListItem) => (
            <Button type="link" onClick={() => handleNavigate(pipelineRun.id)}>
                {pipelineRun.pipeline}
            </Button>
        )
    },
    {
        title: "Progress",
        dataIndex: "progress",
    },
    {
        title: "Status",
        dataIndex: "statusName",
    },
    {
        title: "User",
        dataIndex: "user",
    },
    {
        title: "Date",
        dataIndex: "date",
        render: (date: string) => dayjs(date).format("DD.MM.YYYY HH:mm:ss"),
    },
];

export default PipelineAuditTableColumns;