import { Card, Tag } from "antd";
import type { PipelineTask } from "../../../types/pipeline.run.type";

interface PipelineTaskCardProps {
    task: PipelineTask;
}

const getStageColor = (stageName: string): string => {
    const colors: Record<string, string> = {
        "Initialization": "#722ed1",
        "Bronze": "#cd7f32",
        "Silver": "#8c8c8c",
        "Spatial analysis": "#52c41a",
        "Gold": "#faad14",
    };
    return colors[stageName] || "#1890ff";
};

const getStageIcon = (stageName: string): string => {
    const icons: Record<string, string> = {
        "Initialization": "⚙️",
        "Bronze": "🥉",
        "Silver": "🥈",
        "Spatial analysis": "🗺️",
        "Gold": "🥇",
    };
    return icons[stageName] || "📋";
};

const formatDate = (date: string | null): string => {
    return date ? new Date(date).toLocaleString("az-AZ") : "—";
};

export default function PipelineTaskCard({ task }: PipelineTaskCardProps) {
    const stageColor = getStageColor(task.stageName);

    return (
        <Card
            size="small"
            style={{
                minWidth: 240,
                borderTop: `3px solid ${stageColor}`,
                borderRadius: 8,
            }}
            hoverable
        >
            <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 24, marginBottom: 8 }}>
                    {getStageIcon(task.stageName)}
                </div>

                <Tag color={stageColor} style={{ marginBottom: 8 }}>
                    {task.stageName}
                </Tag>

                <div
                    style={{
                        fontSize: 12,
                        color: "#666",
                        minHeight: 36,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                    }}
                >
                    {task.details}
                </div>

                <div
                    style={{
                        marginTop: 8,
                        fontSize: 11,
                        color: "#999",
                        borderTop: "1px solid #f0f0f0",
                        paddingTop: 8,
                    }}
                >
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                        <span>Başlama:</span>
                        <span style={{ color: task.startDate ? "#52c41a" : "#999" }}>
                            {formatDate(task.startDate)}
                        </span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span>Bitmə:</span>
                        <span style={{ color: task.endDate ? "#1890ff" : "#999" }}>
                            {formatDate(task.endDate)}
                        </span>
                    </div>
                </div>
            </div>
        </Card>
    );
}