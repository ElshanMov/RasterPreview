import React from 'react';
import { Button, Card, Space, Typography, Row, Col } from 'antd';
import { CheckCircleOutlined } from '@ant-design/icons';
import type { FormInstance } from 'antd';

const { Title, Text } = Typography;

interface SummaryStepProps {
    form: FormInstance;
    organizationName?: string;
    branchName?: string;
    onPrev: () => void;
}

const SummaryStep: React.FC<SummaryStepProps> = ({
    form,
    organizationName,
    branchName,
    onPrev
}) => {
    const values = form.getFieldsValue();

    

    const InfoRow = ({ label, value }: { label: string; value: any }) => (
        <Row style={{ marginBottom: 16 }}>
            <Col span={8}>
                <Text strong>{label}:</Text>
            </Col>
            <Col span={16}>
                <Text>{value || '-'}</Text>
            </Col>
        </Row>
    );

    return (
        <Card>
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
                <div style={{ textAlign: 'center' }}>
                    <CheckCircleOutlined style={{ fontSize: 48, color: '#52c41a', marginBottom: 16 }} />
                    <Title level={3}>Məlumatları Yoxlayın</Title>
                    <Text type="secondary">
                        Aşağıdakı məlumatları təsdiq edin və yükləməyə başlayın
                    </Text>
                </div>

                <Card
                    title="Ümumi Məlumat"
                    size="small"
                    style={{ background: '#fafafa' }}
                >
                    <InfoRow
                        label="Təşkilat"
                        value={organizationName && branchName ? `${organizationName} / ${branchName}` : '-'}
                    />
                    <InfoRow
                        label="Fayl adı"
                        value={values.fileName || '-'}
                    />
                    <InfoRow
                        label="Fayl ölçüsü"
                        value={values.fileSize ? `${(values.fileSize / 1024 / 1024).toFixed(2)} MB` : '-'}
                    />
                    <InfoRow
                        label="CRS (Koordinat Sistemi)"
                        value={values.srid ? `EPSG:${values.srid}` : '-'}
                    />
                    <InfoRow
                        label="Bandlar"
                        value={values.bands || '-'}
                    />
                </Card>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24 }}>
                    <Button size="large" onClick={onPrev}>
                        Geri
                    </Button>
                    <Button type="primary" size="large" htmlType="submit">
                        Yüklə
                    </Button>
                </div>
            </Space>
        </Card>
    );
};

export default SummaryStep;