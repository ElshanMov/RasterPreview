import React from 'react';
import { Card, Typography, Divider, Row, Col, Form, Select, Button } from 'antd';
import { BankOutlined } from '@ant-design/icons';
import type { OrganizationSelectItem } from '../../../types/organization.type';
import type { BranchSelectItem } from '../../../types/branch.type';

const { Title } = Typography;

interface OrganizationStepProps {
    organizations: OrganizationSelectItem[];
    branches: BranchSelectItem[];
    getBranches: (organizationId: string | undefined) => void;
    setOrganizationName: (name: string | undefined) => void;
    setBranchName: (name: string | undefined) => void;
    onNext: () => void;
}

const OrganizationStep: React.FC<OrganizationStepProps> = ({
    organizations,
    branches,
    getBranches,
    setOrganizationName,
    setBranchName,
    onNext
}) => {
    return (
        <Card className="step-card">
            <Title level={5}><BankOutlined /> Təşkilat və Period Məlumatları</Title>
            <Divider />
            <Row gutter={[12, 16]}>

                <Col span={12}>
                    <Form.Item
                        label="Organization"
                        name="organizationId"
                        rules={[{ required: true, message: 'Təşkilat seçilməlidir!' }]}>

                        <Select
                            placeholder="Təşkilat seçin"
                            size="large"
                            showSearch
                            onChange={(val, opt: any) => {
                                setOrganizationName(opt?.label);
                                getBranches(val);
                            }}
                            options={organizations.map(org => ({ value: org.id, label: org.value }))}
                        />
                    </Form.Item>
                </Col>

                <Col span={12}>
                    <Form.Item
                        label="Branch"
                        name="branchId"
                        rules={[{ required: true, message: 'Filial seçilməlidir!' }]}>
                        <Select
                            placeholder="Filial seçin"
                            size="large"
                            showSearch
                            onChange={(_, opt: any) => setBranchName(opt?.label)}
                            options={branches.map(b => ({ value: b.id, label: b.name }))}
                        />
                    </Form.Item>
                </Col>

                <Col span={12}>
                    <Form.Item
                        name="executionMode"
                        label="İcra rejimi">

                        <Select
                            size="large"
                            options={[
                                { label: "AUTO", value: 0 },
                                { label: "STEP-BY-STEP", value: 1 }
                            ]} />
                    </Form.Item>
                </Col>

                <Col span={12}>
                    <Form.Item
                        name="scheduleInterval"
                        label="İcra Periodu">

                        <Select
                            size="large"
                            options={[
                                { label: "Günlük", value: "@daily" },
                                { label: "Aylıq", value: "@monthly" },
                                { label: "İllik", value: "@yearly" },
                            ]} />
                    </Form.Item>
                </Col>

                <Col span={12}>
                    <Form.Item
                        name="ingestionMode"
                        label="Ingestion Mode">

                        <Select
                            size="large"
                            options={[{ label: "FULL", value: "FULL" }]}
                        />
                    </Form.Item>
                </Col>
            </Row>

            <div style={{
                display: "flex",
                justifyContent: "flex-end",
                marginTop: 24,
                borderTop: '1px solid #f0f0f0',
                paddingTop: 20
            }}>
                <Button type="primary" size="large" onClick={onNext}>
                    Növbəti →
                </Button>
            </div>
        </Card>
    );
};

export default OrganizationStep;