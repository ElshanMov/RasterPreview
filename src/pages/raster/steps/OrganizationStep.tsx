import React from 'react';
import { Form, Select, Button, Space, Card, Typography } from 'antd';
import { BankOutlined, ApartmentOutlined } from '@ant-design/icons';
import type { OrganizationSelectItem } from '../../../types/organization.type';
import type { BranchSelectItem } from '../../../types/branch.type';

const { Title, Text } = Typography;

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
    const form = Form.useFormInstance();

    const handleOrganizationChange = (value: string) => {
        const selectedOrg = organizations.find(org => org.id === value);
        setOrganizationName(selectedOrg?.value);

        // Reset branch
        form.setFieldsValue({ branchId: undefined });
        setBranchName(undefined);

        // Fetch branches
        getBranches(value);
    };

    const handleBranchChange = (value: string) => {
        const selectedBranch = branches.find(branch => branch.id === value);
        setBranchName(selectedBranch?.name);
    };

    return (
        <Card>
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
                <div style={{ textAlign: 'center' }}>
                    <BankOutlined style={{ fontSize: 48, color: '#1677ff', marginBottom: 16 }} />
                    <Title level={3}>Təşkilat və Filial Seçin</Title>
                    <Text type="secondary">
                        Raster faylın hansı təşkilat və filiala aid olduğunu seçin
                    </Text>
                </div>

                <Form.Item
                    name="organizationId"
                    label={<><BankOutlined /> Təşkilat</>}
                    rules={[{ required: true, message: 'Təşkilat seçin!' }]}
                >
                    <Select
                        size="large"
                        placeholder="Təşkilat seçin"
                        showSearch
                        optionFilterProp="children"
                        onChange={handleOrganizationChange}
                        filterOption={(input, option) =>
                            (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                        }
                        options={organizations.map(org => ({
                            label: org.value,
                            value: org.id
                        }))}
                    />
                </Form.Item>

                <Form.Item
                    name="branchId"
                    label={<><ApartmentOutlined /> Filial</>}
                    rules={[{ required: true, message: 'Filial seçin!' }]}
                >
                    <Select
                        size="large"
                        placeholder="Filial seçin"
                        showSearch
                        disabled={!branches.length}
                        optionFilterProp="children"
                        onChange={handleBranchChange}
                        filterOption={(input, option) =>
                            (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                        }
                        options={branches.map(branch => ({
                            label: branch.name,
                            value: branch.id
                        }))}
                    />
                </Form.Item>

                <div style={{ textAlign: 'right', marginTop: 24 }}>
                    <Button type="primary" size="large" onClick={onNext}>
                        Növbəti
                    </Button>
                </div>
            </Space>
        </Card>
    );
};

export default OrganizationStep;