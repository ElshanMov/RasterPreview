import { type TableProps } from "antd";
import type { PipelineRunListItem } from "../../types/pipeline.run.type";
import dayjs from "dayjs";

const PipelineStepTableColumns = (): TableProps<PipelineRunListItem>["columns"] => [
        {
            title: "Name",
            dataIndex: "pipeline"
        },
        {
            title: "Action",
            dataIndex: "action",
        },
        {
            title: "Details",
            dataIndex: "details",
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

export default PipelineStepTableColumns;