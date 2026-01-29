import { Button, Popconfirm, Progress, Space, Tag, type TableProps } from "antd";
import type { PipelineListItem } from "../../types/pipeline.type";
import {
    CheckCircleOutlined,
    CheckOutlined,
    CloseCircleOutlined,
    PlayCircleOutlined,
    StopOutlined,
    SyncOutlined
} from "@ant-design/icons";
import dayjs from "dayjs";
import { PipelineStatus } from "../../types/enum.type";

export interface PipelineTableColumnsProps {
    handleRun: (id: string) => void;
    handleStop: (id: string) => void;
    handleNavigate: (id: string) => void;
}

const PipelineTableColumns = ({
    handleRun,
    handleStop,
    handleNavigate }: PipelineTableColumnsProps): TableProps<PipelineListItem>["columns"] => [
        {
            title: "Name",
            render: (pipeline: PipelineListItem) => (
                <Button type="link" onClick={() => handleNavigate(pipeline.id)}>
                    {pipeline.name}
                </Button>
            )
        },
        {
            title: "Geometry",
            dataIndex: "geometryType",
        },
        {
            title: "SRID",
            dataIndex: "sourceSrid",
        },
        {
            title: "Execution",
            dataIndex: "executionModeName",
        },
        {
            title: "Stage",
            dataIndex: "stageName",
        },
        {
            title: "Status",
            render: (pipeline: PipelineListItem) => {
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
        {
            title: "Operations",
            render: (pipeline: PipelineListItem) => (
                <Space>
                    <Popconfirm
                        title="Pipeline-ı başlatmaq istəyirsiniz?"
                        onConfirm={() => handleRun(pipeline.id)}
                        okText="Bəli"
                        cancelText="Xeyr"
                    >
                        <Button
                            type="primary"
                            icon={<PlayCircleOutlined />}
                            disabled={pipeline.status === PipelineStatus.Initializing
                                || pipeline.status === PipelineStatus.Activated
                                || pipeline.status === PipelineStatus.Completed}
                        >
                            Start
                        </Button>
                    </Popconfirm>

                    <Popconfirm
                        title="Pipeline-ı dayandırmaq istəyirsiniz?"
                        onConfirm={() => handleStop(pipeline.id)}
                        okText="Bəli"
                        cancelText="Xeyr"
                    >
                        <Button
                            danger
                            icon={<StopOutlined />}
                            disabled={pipeline.status === PipelineStatus.Completed || pipeline.status !== PipelineStatus.Activated}
                        >
                            Stop
                        </Button>
                    </Popconfirm>
                </Space>
            ),
        },
    ];

export default PipelineTableColumns;