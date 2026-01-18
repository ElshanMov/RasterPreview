import { useEffect, useState, useCallback } from 'react';
import { List, Card, Space, Tag, Button, Popconfirm, App, Spin, Empty } from 'antd';
import { DeleteOutlined, EyeOutlined, FileImageOutlined, GlobalOutlined, ColumnWidthOutlined } from '@ant-design/icons';
import { RasterService } from '../../services/raster.service';
import type { RasterListItem } from '../../types/raster.type';
import dayjs from 'dayjs';

export default function RasterList() {
    const { message } = App.useApp();
    const [items, setItems] = useState<RasterListItem[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchRasters = useCallback(async () => {
        try {
            setLoading(true);
            const response = await RasterService.getRasters();
            setItems(response.data || []);
        } catch (error) {
            message.error("Məlumatlar yüklənmədi");
        } finally {
            setLoading(false);
        }
    }, [message]);

    useEffect(() => {
        fetchRasters();
    }, [fetchRasters]);

    const handleDelete = useCallback(async (id: string) => {
        try {
            await RasterService.deleteRaster(id);
            message.success("Silindi");
            fetchRasters();
        } catch (error) {
            message.error("Silinmə xətası");
        }
    }, [fetchRasters, message]);

    if (loading) {
        return (
            <div style={{ textAlign: 'center', padding: 50 }}>
                <Spin size="large" tip="Yüklənir..." />
            </div>
        );
    }

    if (items.length === 0) {
        return (
            <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="Raster yoxdur"
            >
            </Empty>
        );
    }

    return (
        <List
            grid={{
                gutter: 16,
                xs: 1,
                sm: 2,
                md: 3,
                lg: 4,
                xl: 4,
                xxl: 5
            }}
            dataSource={items}
            renderItem={(item) => (
                <List.Item>
                    <Card
                        hoverable
                        cover={
                            <div style={{
                                height: 200,
                                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                position: 'relative'
                            }}>
                                <FileImageOutlined
                                    style={{
                                        fontSize: 64,
                                        color: 'rgba(255,255,255,0.3)'
                                    }}
                                />
                                <div style={{
                                    position: 'absolute',
                                    bottom: 8,
                                    right: 8,
                                    background: 'rgba(0,0,0,0.6)',
                                    color: 'white',
                                    padding: '4px 8px',
                                    borderRadius: 4,
                                    fontSize: 11,
                                    fontFamily: 'monospace'
                                }}>
                                    {item.width} × {item.height}
                                </div>
                            </div>
                        }
                        actions={[
                            <Button
                                type="link"
                                icon={<EyeOutlined />}
                                onClick={() => window.open(`/rasters/${item.id}`, '_blank')}
                            >
                                Bax
                            </Button>,
                            <Popconfirm
                                title="Silmək istəyirsiniz?"
                                onConfirm={() => handleDelete(item.id)}
                                okText="Bəli"
                                cancelText="Xeyr"
                            >
                                <Button
                                    type="link"
                                    danger
                                    icon={<DeleteOutlined />}
                                >
                                    Sil
                                </Button>
                            </Popconfirm>
                        ]}
                    >
                        <Card.Meta
                            title={
                                <div style={{
                                    fontSize: 14,
                                    fontWeight: 600,
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis'
                                }}>
                                    {item.name}
                                </div>
                            }
                            description={
                                <Space direction="vertical" size={4} style={{ width: '100%' }}>
                                    <Space size="small" wrap>
                                        <Tag
                                            icon={<ColumnWidthOutlined />}
                                            color="blue"
                                        >
                                            {item.bands} band
                                        </Tag>
                                        <Tag
                                            icon={<GlobalOutlined />}
                                            color="green"
                                        >
                                            EPSG:{item.srid}
                                        </Tag>
                                    </Space>
                                    <div style={{ fontSize: 11, color: '#999' }}>
                                        {dayjs(item.createdAt).format('DD.MM.YYYY HH:mm')}
                                    </div>
                                    {item.user && (
                                        <div style={{ fontSize: 11, color: '#666' }}>
                                            {item.user}
                                        </div>
                                    )}
                                </Space>
                            }
                        />
                    </Card>
                </List.Item>
            )}
        />
    );
}