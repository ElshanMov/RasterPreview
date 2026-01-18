import { Progress, Tag, type TableProps } from "antd";
import type { PipelineLatest } from "../../types/pipeline.type";
import dayjs from "dayjs";
import { CheckCircleOutlined, CheckOutlined, CloseCircleOutlined, StopOutlined, SyncOutlined } from "@ant-design/icons";

const RecentPipelinesTableColumns = (): TableProps<PipelineLatest>["columns"] => [
    {
        title: "Name",
        dataIndex: "name"
    },
    {
        title: "Mode",
        dataIndex: "modeName",
    },
    {
        title: "Status",
        render: (pipeline: PipelineLatest) => {
            const statusConfig: Record<number, { color: string; icon: React.ReactNode }> = {
                0: {
                    color: 'default',
                    icon: <SyncOutlined spin />
                },
                1: {
                    color: 'processing',
                    icon: <CheckOutlined />
                },
                2: {
                    color: 'cyan',
                    icon: <SyncOutlined spin />
                },
                3: {
                    color: 'error',
                    icon: <CloseCircleOutlined />
                },
                4: {
                    color: 'success',
                    icon: <CheckCircleOutlined />
                },
                5: {
                    color: 'warning',
                    icon: <StopOutlined />
                },
            };

            const config = statusConfig[pipeline.status] || { color: 'default', icon: null };

            return (
                <Tag color={config.color} icon={config.icon}>
                    {pipeline.statusName}
                </Tag>
            );
        },

    },
    {
        title: "Progress",
        dataIndex: "progress",
        render: (progress: number) => (
            <Progress
                percent={progress}
                steps={10}
                size="default"
                strokeColor="#52c41a"
            />
        ),
    },
    {
        title: "User",
        dataIndex: "user",
    },
    {
        title: "Date",
        dataIndex: "createdAt",
        render: (date: string) => dayjs(date).format("DD.MM.YYYY HH:mm:ss"),
    },
];

export default RecentPipelinesTableColumns;