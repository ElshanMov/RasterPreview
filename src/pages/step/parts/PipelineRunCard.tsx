import { Card, Tag, Progress, Space, Tooltip, Typography } from "antd";
import {
    UserOutlined,
    ClockCircleOutlined,
    EnvironmentOutlined,
    DatabaseOutlined,
    SyncOutlined,
    CheckCircleOutlined,
    CloseCircleOutlined,
    PauseCircleOutlined,
    HourglassOutlined,
    RightOutlined,
} from "@ant-design/icons";
import type { PipelineRun } from "../../../types/pipeline.run.type";
import PipelineTaskCard from "./PipelineTaskCard";

const { Text } = Typography;

interface PipelineRunCardProps {
    pipelineRun: PipelineRun;
}

const statusConfig: Record<number, { color: string; icon: React.ReactNode; bg: string }> = {
    0: { color: "default", icon: <HourglassOutlined />, bg: "#fafafa" },
    1: { color: "processing", icon: <SyncOutlined spin />, bg: "linear-gradient(135deg, #e6f4ff 0%, #fff 100%)" },
    2: { color: "success", icon: <CheckCircleOutlined />, bg: "linear-gradient(135deg, #f6ffed 0%, #fff 100%)" },
    3: { color: "error", icon: <CloseCircleOutlined />, bg: "linear-gradient(135deg, #fff2f0 0%, #fff 100%)" },
    4: { color: "warning", icon: <PauseCircleOutlined />, bg: "linear-gradient(135deg, #fffbe6 0%, #fff 100%)" },
};

const iconColors: Record<number, string> = {
    0: "#8c8c8c",
    1: "#1890ff",
    2: "#52c41a",
    3: "#ff4d4f",
    4: "#faad14",
};

const formatRelativeTime = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    if (diff < 60000) return "İndicə";
    if (diff < 3600000) return `${Math.floor(diff / 60000)} dəq əvvəl`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} saat əvvəl`;

    return date.toLocaleDateString("az-AZ", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
    });
};

export default function PipelineRunCard({ pipelineRun }: PipelineRunCardProps) {
    const status = statusConfig[pipelineRun.status] || statusConfig[0];
    const iconColor = iconColors[pipelineRun.status] || iconColors[0];

    const getProgressStatus = () => {
        if (pipelineRun.status === 3) return "exception";
        if (pipelineRun.status === 2) return "success";
        return "active";
    };

    return (
        <Card
            hoverable
            style={{
                borderRadius: 12,
                background: status.bg,
                border: pipelineRun.status === 1 ? "1px solid #1890ff30" : "1px solid #f0f0f0",
            }}
            styles={{ body: { padding: 16 } }}
        >
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div
                        style={{
                            width: 42,
                            height: 42,
                            borderRadius: 10,
                            background: `${iconColor}15`,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 20,
                            color: iconColor,
                        }}
                    >
                        {status.icon}
                    </div>
                    <div>
                        <Text strong style={{ fontSize: 15, display: "block", marginBottom: 2 }}>
                            {pipelineRun.name}
                        </Text>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                            {pipelineRun.sourceName}
                        </Text>
                    </div>
                </div>

                <Space size={6}>
                    <Tag color={status.color} style={{ margin: 0, borderRadius: 6 }}>
                        {pipelineRun.statusName}
                    </Tag>
                    <Tag style={{ margin: 0, borderRadius: 6, background: "#f5f5f5", border: "none", color: "#595959" }}>
                        {pipelineRun.executionModeName}
                    </Tag>
                </Space>
            </div>

            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    overflowX: "auto",
                    padding: "8px 0",
                    gap: "8px",
                }}
            >
                {pipelineRun.tasks.map((task, index) => (
                    <div key={task.id} style={{ display: "flex", alignItems: "center" }}>
                        <PipelineTaskCard task={task} />

                        {index < pipelineRun.tasks.length - 1 && (
                            <RightOutlined
                                style={{
                                    fontSize: 20,
                                    color: "#bfbfbf",
                                    margin: "0 4px",
                                }}
                            />
                        )}
                    </div>
                ))}
            </div>

            {/* Progress */}
            <div style={{ marginBottom: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>Progress</Text>
                    <Text strong style={{ fontSize: 12, color: iconColor }}>{pipelineRun.progress}%</Text>
                </div>
                <Progress
                    percent={pipelineRun.progress}
                    steps={99}
                    size="default"
                    status={getProgressStatus()}
                    showInfo={false}
                    strokeColor={pipelineRun.status === 1 ? { from: "#1890ff", to: "#52c41a" } : undefined}
                />
            </div>

            {/* Meta Info */}
            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    gap: 8,
                    padding: "10px 12px",
                    background: "rgba(0,0,0,0.02)",
                    borderRadius: 8,
                    fontSize: 12,
                    color: "#595959",
                }}
            >
                <Space size={12} split={<span style={{ color: "#e0e0e0" }}>·</span>}>
                    <Tooltip title="Geometriya tipi">
                        <span><EnvironmentOutlined style={{ color: "#1890ff", marginRight: 4 }} />{pipelineRun.geometryType}</span>
                    </Tooltip>
                    <Tooltip title="Koordinat sistemi">
                        <span><DatabaseOutlined style={{ color: "#722ed1", marginRight: 4 }} />SRID {pipelineRun.sourceSrid}</span>
                    </Tooltip>
                </Space>
                
                <Space size={12} split={<span style={{ color: "#e0e0e0" }}>·</span>}>
                    <Tooltip title="İstifadəçi">
                        <span><UserOutlined style={{ color: "#13c2c2", marginRight: 4 }} />{pipelineRun.user}</span>
                    </Tooltip>
                    <Tooltip title={new Date(pipelineRun.createdAt).toLocaleString("az-AZ")}>
                        <span><ClockCircleOutlined style={{ color: "#fa8c16", marginRight: 4 }} />{formatRelativeTime(pipelineRun.createdAt)}</span>
                    </Tooltip>
                </Space>
            </div>
        </Card>
    );
}