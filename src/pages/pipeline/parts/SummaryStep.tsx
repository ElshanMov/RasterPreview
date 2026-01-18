import React from 'react';
import { Card, Typography, Divider, Row, Col, Space, Tag, Button, type FormInstance } from 'antd';
import { FileTextOutlined, GlobalOutlined, ArrowLeftOutlined, RocketOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

interface SummaryStepProps {
    form: FormInstance;
    organizationName?: string;
    branchName?: string;
    onPrev: () => void;
}

const SummaryStep: React.FC<SummaryStepProps> = ({ form, organizationName, branchName, onPrev }) => {
    const values = form.getFieldsValue();

    return (
        <Card>
            <Title level={5}><FileTextOutlined /> Yekun Təsdiq</Title>
            <Divider />

            <div style={{
                background: "#f8f9fa",
                padding: 24,
                borderRadius: 12,
                border: "1px solid #eee",
                marginBottom: 20
            }}>

                <Row gutter={[24, 20]}>
                    <Col span={12}>
                        <Space direction="vertical">
                            <Text type="secondary">Təşkilat</Text>
                            <Text strong>{organizationName} / {branchName}</Text>
                        </Space>
                    </Col>

                    <Col span={12}>
                        <Space direction="vertical">
                            <Text type="secondary">Növ</Text>
                            <Text strong>{values.geometryType}</Text>
                        </Space>
                    </Col>

                    <Col span={12}>
                        <Space direction="vertical">
                            <Text type="secondary">Koordinat Sistemi</Text>
                            <Tag color="blue" icon={<GlobalOutlined />}>EPSG: {values.sourceSrid}</Tag>
                        </Space>
                    </Col>

                    <Col span={12}>
                        <Space direction="vertical">
                            <Text type="secondary">İcra Periodu</Text>
                            <Tag color="orange">{values.scheduleInterval}</Tag>
                        </Space>
                    </Col>

                    <Col span={12}>
                        <Space direction="vertical">
                            <Text type="secondary">Ingestion Mode</Text>
                            <Tag color="orange">{values.ingestionMode}</Tag>
                        </Space>
                    </Col>

                    <Col span={12}>
                        <Space direction="vertical">
                            <Text type="secondary">Execution Mode</Text>
                            <Tag color="orange">{values.executionMode === 0 ? 'AUTO' : 'STEP-BY-STEP'}</Tag>
                        </Space>
                    </Col>

                    <Col span={12}>
                        <Space direction="vertical">
                            <Text type="secondary">Mənbə</Text>
                            <Text strong style={{ fontSize: '12px', color: '#666' }}>{values.sourceName}</Text>
                        </Space>
                    </Col>

                    <Col span={12}>
                        <Space direction="vertical">
                            <Text type="secondary">Yol</Text>
                            <Text code style={{ fontSize: '11px' }}>{values.sourcePath}</Text>
                        </Space>
                    </Col>
                </Row>
            </div>

            <div style={{
                display: "flex",
                justifyContent: "space-between",
                borderTop: "1px solid #f0f0f0",
                paddingTop: 20
            }}>

                <Button size="large" icon={<ArrowLeftOutlined />} onClick={onPrev}>
                    Geri
                </Button>

                <Button
                    type="primary"
                    size="large"
                    icon={<RocketOutlined />}
                    onClick={() => form.submit()}
                >
                    Təsdiq et
                </Button>
            </div>
        </Card>
    );
};

export default SummaryStep;