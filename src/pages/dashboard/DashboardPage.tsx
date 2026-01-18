import { Card, Col, Row, Statistic, Typography } from "antd";
import type { PipelineLatest, PipelinesDashboard } from "../../types/pipeline.type";
import { useEffect, useState } from "react";
import { PipelineService } from "../../services/pipeline.service";
import socket from "../../services/_socket";
import StatItem from "../../components/StatItem";
import RecentPipelinesTableColumns from "./RecentPipelinesTableColumns";
import DataTable from "../../components/DataTable";

const { Title } = Typography;

export default function DashboardPage() {
    const [loading, setLoading] = useState(true);
    const [latestPipelinesLimit] = useState(5);

    const [dashboard, setDashboard] = useState<PipelinesDashboard>({
        totalPipelinesCount: 0,
        initialisedPipelinesCount: 0,
        activatedPipelinesCount: 0,
        completedPipelinesCount: 0,
        failedPipelinesCount: 0,
        stoppedPipelinesCount: 0,
        pipelinesRate: 0
    });

    const [latestPipelines, setLatestPipelines] = useState<PipelineLatest[]>([]);

    const getPipelinesDashboard = async () => {
        setLoading(true);

        PipelineService.getPipelinesDashboard()
            .then((response) => {
                setDashboard(response.data);
                setLoading(false);
            }).catch(() => {
                setLoading(false);
            });
    }

    const getLatestPipelines = async () => {
        setLoading(true);

        PipelineService.getLatestPipelines(latestPipelinesLimit)
            .then((response) => {
                setLatestPipelines(response.data);
                setLoading(false);
            }).catch(() => {
                setLoading(false);
            });
    }

    useEffect(() => {
        getPipelinesDashboard();
        getLatestPipelines();

        socket.onPipelineSynchronized(() => {
            getPipelinesDashboard();
            getLatestPipelines();
        });

        return () => {
            socket.onPipelineSynchronized(() => {});
        };

    }, []);

    return (
        <div style={{ padding: 24 }}>
            <Title level={2}>Dashboard</Title>

            {/* Stats */}
            <Row gutter={[24, 24]} style={{ marginBottom: 32 }}>

                {/* Pipeline Lifecycle */}
                <Col xs={24} lg={8}>
                    <Card
                        hoverable
                        title="Pipeline Lifecycle"
                        style={{
                            height: "100%",
                            borderRadius: 12,
                            boxShadow: "0 8px 24px rgba(0,0,0,0.06)",
                        }}
                    >
                        <Row justify="space-around" align="middle">
                            <StatItem
                                label="Total"
                                value={dashboard.totalPipelinesCount}
                                color="#6b7280"
                            />
                            <StatItem
                                label="New"
                                value={dashboard.initialisedPipelinesCount}
                                color="#0ea5e9"
                            />
                            <StatItem
                                label="Active"
                                value={dashboard.activatedPipelinesCount}
                                color="#2563eb"
                            />
                        </Row>
                    </Card>
                </Col>

                {/* Result Status */}
                <Col xs={24} lg={8}>
                    <Card
                        hoverable
                        title="Result Status"
                        style={{
                            height: "100%",
                            borderRadius: 12,
                            boxShadow: "0 8px 24px rgba(0,0,0,0.06)",
                        }}
                    >
                        <Row justify="space-around" align="middle">
                            <StatItem
                                label="Completed"
                                value={dashboard.completedPipelinesCount}
                                color="#16a34a"
                            />
                            <StatItem
                                label="Failed"
                                value={dashboard.failedPipelinesCount}
                                color="#dc2626"
                            />
                            <StatItem
                                label="Stopped"
                                value={dashboard.stoppedPipelinesCount}
                                color="#f97316"
                            />
                        </Row>
                    </Card>
                </Col>

                {/* Success Rate */}
                <Col xs={24} lg={8}>
                    <Card
                        hoverable
                        title="Success Rate"
                        style={{
                            height: "100%",
                            borderRadius: 12,
                            boxShadow: "0 8px 24px rgba(0,0,0,0.06)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                        }}
                    >
                        <Statistic
                            value={Math.round(dashboard.pipelinesRate)}
                            suffix="%"
                            valueStyle={{
                                color: "#0ea5e9",
                                fontSize: 48,
                                fontWeight: 800,
                            }}
                        />
                    </Card>
                </Col>

            </Row>

            {/* Recent Pipelines */}
            <Title level={2}>Recent Pipelines</Title>
            <DataTable
            title="test"
                columns={RecentPipelinesTableColumns()}
                data={latestPipelines}
                loading={loading}
                totalCount={latestPipelinesLimit}
            />
        </div>
    );
}