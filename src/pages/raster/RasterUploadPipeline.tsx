import React, { useCallback } from 'react';
import { Card, Badge, Button, Space, Typography, Empty, Tooltip, Tag } from 'antd';
import {
    CloudUploadOutlined,
    UpOutlined,
    DownOutlined,
    ClearOutlined,
} from '@ant-design/icons';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import {
    selectAllUploads,
    selectActiveUploadCount,
    selectPanelVisible,
    selectHasUploads,
    selectUnseenCount,
    togglePanel,
    removeUpload,
    retryUpload,
    clearCompleted,
} from '../../store/slices/rasterUploadSlice';
import RasterUploadPipelineItem from './RasterUploadPipelineItem';

const { Text } = Typography;

const RasterUploadPipeline: React.FC = () => {
    const dispatch = useAppDispatch();

    const uploads = useAppSelector(selectAllUploads);
    const activeCount = useAppSelector(selectActiveUploadCount);
    const panelVisible = useAppSelector(selectPanelVisible);
    const hasUploads = useAppSelector(selectHasUploads);
    const unseenCount = useAppSelector(selectUnseenCount);

    const handleToggle = useCallback(() => {
        dispatch(togglePanel());
    }, [dispatch]);

    const handleRetry = useCallback((correlationId: string) => {
        dispatch(retryUpload(correlationId));
        // TODO: Actual retry logic — re-upload trigger
    }, [dispatch]);

    const handleRemove = useCallback((correlationId: string) => {
        dispatch(removeUpload(correlationId));
    }, [dispatch]);

    const handleClearCompleted = useCallback(() => {
        dispatch(clearCompleted());
    }, [dispatch]);

    // Heç upload yoxdursa heç nə göstərmə
    if (!hasUploads) return null;

    const completedCount = uploads.length - activeCount;

    return (
        <Card
            size="small"
            style={{
                marginBottom: 16,
                borderRadius: 8,
                border: activeCount > 0 ? '1px solid #91caff' : '1px solid #d9d9d9',
                overflow: 'hidden',
            }}
            styles={{ body: { padding: 0 } }}
        >
            {/* Panel Header */}
            <div
                onClick={handleToggle}
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '10px 16px',
                    cursor: 'pointer',
                    background: activeCount > 0 ? '#e6f4ff' : '#fafafa',
                    borderBottom: panelVisible ? '1px solid #f0f0f0' : 'none',
                    transition: 'background 0.3s',
                    userSelect: 'none',
                }}
            >
                <Space size={8} align="center">
                    <Badge count={unseenCount} size="small" offset={[-2, 2]}>
                        <CloudUploadOutlined
                            style={{
                                fontSize: 18,
                                color: activeCount > 0 ? '#1677ff' : '#8c8c8c',
                            }}
                        />
                    </Badge>
                    <Text strong>Upload Pipeline</Text>
                    {activeCount > 0 && (
                        <Tag
                            color="processing"
                            style={{ margin: 0, fontSize: 11 }}
                        >
                            {activeCount} aktiv
                        </Tag>
                    )}
                    {completedCount > 0 && (
                        <Text type="secondary" style={{ fontSize: 12 }}>
                            {completedCount} tamamlanıb
                        </Text>
                    )}
                </Space>

                <Space size={4}>
                    {completedCount > 0 && panelVisible && (
                        <Tooltip title="Tamamlanmışları təmizlə">
                            <Button
                                type="text"
                                size="small"
                                icon={<ClearOutlined />}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleClearCompleted();
                                }}
                            />
                        </Tooltip>
                    )}
                    {panelVisible ? <UpOutlined /> : <DownOutlined />}
                </Space>
            </div>

            {/* Upload Items List */}
            {panelVisible && (
                <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                    {uploads.length === 0 ? (
                        <Empty
                            image={Empty.PRESENTED_IMAGE_SIMPLE}
                            description="Upload yoxdur"
                            style={{ padding: 24 }}
                        />
                    ) : (
                        uploads.map((item) => (
                            <RasterUploadPipelineItem
                                key={item.correlationId}
                                item={item}
                                onRetry={handleRetry}
                                onRemove={handleRemove}
                            />
                        ))
                    )}
                </div>
            )}
        </Card>
    );
};

export default RasterUploadPipeline;