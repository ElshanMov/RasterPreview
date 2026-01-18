import { useState } from 'react';
import { Button, Space, Typography } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import RasterList from './RasterList';

const { Title } = Typography;

export default function RastersPage() {
    const navigate = useNavigate();
    const [refreshKey] = useState(0);

    return (
        <div>
            <Space
                style={{ marginBottom: 16, justifyContent: "space-between", width: "100%" }}
                align="center"
            >
                <Title level={3} style={{ margin: 0 }}>
                    🗺️ Rasters
                </Title>
                <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => navigate('/rasters/new')}
                >
                    Upload
                </Button>
            </Space>

            <RasterList key={refreshKey} />
        </div>
    );
}