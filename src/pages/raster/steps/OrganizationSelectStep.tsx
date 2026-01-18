import React from 'react';
import { Select, Space, Typography } from 'antd';
import { BankOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

interface Organization {
    id: string;
    name: string;
}

interface OrganizationSelectStepProps {
    organizations: Organization[];
    selectedOrgId: string | null;
    onSelect: (orgId: string) => void;
    loading?: boolean;
}

const OrganizationSelectStep: React.FC<OrganizationSelectStepProps> = ({
    organizations,
    selectedOrgId,
    onSelect,
    loading = false
}) => {
    return (
        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <Space direction="vertical" size="large" style={{ width: '100%', maxWidth: 500, margin: '0 auto' }}>
                <div>
                    <BankOutlined style={{ fontSize: 64, color: '#1677ff', marginBottom: 16 }} />
                    <Title level={3}>Təşkilat Seçin</Title>
                    <Text type="secondary">
                        Raster faylın hansı təşkilata aid olduğunu seçin
                    </Text>
                </div>

                <Select
                    size="large"
                    style={{ width: '100%' }}
                    placeholder="Təşkilat seçin"
                    value={selectedOrgId}
                    onChange={onSelect}
                    loading={loading}
                    showSearch
                    optionFilterProp="children"
                    filterOption={(input, option) =>
                        (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                    }
                    options={organizations.map(org => ({
                        label: org.name,
                        value: org.id
                    }))}
                />
            </Space>
        </div>
    );
};

export default OrganizationSelectStep;