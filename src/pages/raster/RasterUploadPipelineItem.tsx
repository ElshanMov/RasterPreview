import React, { useMemo } from 'react';
import { Progress, Tag, Button, Space, Tooltip, Typography } from 'antd';
import {
    ClockCircleOutlined,
    CloudUploadOutlined,
    CheckCircleOutlined,
    CloseCircleOutlined,
    SyncOutlined,
    ExperimentOutlined,
    WarningOutlined,
    ReloadOutlined,
    DeleteOutlined,
    FileImageOutlined,
} from '@ant-design/icons';
import { RasterUploadStatus } from '../../types/raster-upload.type';
import type { RasterUploadItem } from '../../types/raster-upload.type';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

const { Text } = Typography;

// ─── Status Konfiqurasiyası ───────────────────────────────────

interface StatusConfig {
    color: string;
    icon: React.ReactNode;
    label: string;
    tagColor: string;
}

const STATUS_CONFIG: Record<RasterUploadStatus, StatusConfig> = {
    [RasterUploadStatus.Pending]: {
        color: '#8c8c8c',
        icon: <ClockCircleOutlined spin />,
        label: 'Gözlənilir',
        tagColor: 'default',
    },
    [RasterUploadStatus.Uploading]: {
        color: '#1677ff',
        icon: <CloudUploadOutlined />,
        label: 'Yüklənir',
        tagColor: 'processing',
    },
    [RasterUploadStatus.Uploaded]: {
        color: '#722ed1',
        icon: <CheckCircleOutlined />,
        label: 'Yükləndi',
        tagColor: 'purple',
    },
    [RasterUploadStatus.Processing]: {
        color: '#fa8c16',
        icon: <SyncOutlined spin />,
        label: 'Emal olunur',
        tagColor: 'orange',
    },
    [RasterUploadStatus.CogConverting]: {
        color: '#13c2c2',
        icon: <SyncOutlined spin />,
        label: 'COG çevrilir',
        tagColor: 'cyan',
    },
    [RasterUploadStatus.Analyzing]: {
        color: '#2f54eb',
        icon: <ExperimentOutlined />,
        label: 'Analiz edilir',
        tagColor: 'geekblue',
    },
    [RasterUploadStatus.Success]: {
        color: '#52c41a',
        icon: <CheckCircleOutlined />,
        label: 'Tamamlandı',
        tagColor: 'success',
    },
    [RasterUploadStatus.PartialSuccess]: {
        color: '#faad14',
        icon: <WarningOutlined />,
        label: 'Qismən uğurlu',
        tagColor: 'warning',
    },
    [RasterUploadStatus.Failed]: {
        color: '#ff4d4f',
        icon: <CloseCircleOutlined />,
        label: 'Uğursuz',
        tagColor: 'error',
    },
    [RasterUploadStatus.Stale]: {
        color: '#8c8c8c',
        icon: <WarningOutlined />,
        label: 'Timeout',
        tagColor: 'default',
    },
};

// ─── Pipeline Step Tracker ────────────────────────────────────

const PIPELINE_STEPS: { key: RasterUploadStatus[]; label: string }[] = [
    { key: [RasterUploadStatus.Pending, RasterUploadStatus.Uploading], label: 'Yüklə' },
    { key: [RasterUploadStatus.Uploaded, RasterUploadStatus.Processing], label: 'Emal' },
    { key: [RasterUploadStatus.CogConverting], label: 'COG' },
    { key: [RasterUploadStatus.Analyzing], label: 'Analiz' },
    { key: [RasterUploadStatus.Success, RasterUploadStatus.PartialSuccess], label: 'Hazır' },
];

const STATUS_ORDER: RasterUploadStatus[] = [
    RasterUploadStatus.Pending,
    RasterUploadStatus.Uploading,
    RasterUploadStatus.Uploaded,
    RasterUploadStatus.Processing,
    RasterUploadStatus.CogConverting,
    RasterUploadStatus.Analyzing,
    RasterUploadStatus.Success,
];

// ─── Helpers ──────────────────────────────────────────────────

const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
};

const isFailed = (status: RasterUploadStatus): boolean =>
    status === RasterUploadStatus.Failed || status === RasterUploadStatus.Stale;

// ─── Component ────────────────────────────────────────────────

interface Props {
    item: RasterUploadItem;
    onRetry: (correlationId: string) => void;
    onRemove: (correlationId: string) => void;
}

const RasterUploadPipelineItem: React.FC<Props> = ({ item, onRetry, onRemove }) => {
    const config = STATUS_CONFIG[item.status] || STATUS_CONFIG[RasterUploadStatus.Pending];
    const failed = isFailed(item.status);
    const isActive = !failed &&
        item.status !== RasterUploadStatus.Success &&
        item.status !== RasterUploadStatus.PartialSuccess;

    // Hansı step-dəyik
    const currentStepIndex = useMemo(() => {
        const orderIndex = STATUS_ORDER.indexOf(item.status);
        if (orderIndex === -1) return -1;

        let stepIdx = 0;
        for (let i = 0; i < PIPELINE_STEPS.length; i++) {
            if (PIPELINE_STEPS[i].key.includes(item.status)) {
                stepIdx = i;
                break;
            }
        }
        return stepIdx;
    }, [item.status]);

    // Upload progress bar — yalnız Uploading statusunda
    const showUploadProgress = item.status === RasterUploadStatus.Uploading;

    return (
        <div
            style={{
                padding: '12px 16px',
                borderBottom: '1px solid #f0f0f0',
                background: failed ? '#fff2f0' : isActive ? '#f6ffed' : '#fff',
                transition: 'background 0.3s',
            }}
        >
            {/* Header: File info + Actions */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <Space size={8} align="center">
                        <FileImageOutlined style={{ color: '#8c8c8c', fontSize: 16 }} />
                        <Text strong ellipsis style={{ maxWidth: 200 }}>
                            {item.fileName}
                        </Text>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                            {formatFileSize(item.fileSize)}
                        </Text>
                    </Space>
                </div>

                <Space size={4}>
                    <Tag
                        color={config.tagColor}
                        icon={config.icon}
                        style={{ margin: 0 }}
                    >
                        {config.label}
                    </Tag>
                    {failed && (
                        <Tooltip title="Yenidən cəhd et">
                            <Button
                                type="text"
                                size="small"
                                icon={<ReloadOutlined />}
                                onClick={() => onRetry(item.correlationId)}
                            />
                        </Tooltip>
                    )}
                    {!isActive && (
                        <Tooltip title="Siyahıdan sil">
                            <Button
                                type="text"
                                size="small"
                                danger
                                icon={<DeleteOutlined />}
                                onClick={() => onRemove(item.correlationId)}
                            />
                        </Tooltip>
                    )}
                </Space>
            </div>

            {/* Upload Progress Bar */}
            {showUploadProgress && (
                <Progress
                    percent={item.uploadProgress}
                    size="small"
                    strokeColor="#1677ff"
                    style={{ marginBottom: 8 }}
                />
            )}

            {/* Pipeline Steps Mini-Tracker */}
            {!failed && (
                <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
                    {PIPELINE_STEPS.map((step, idx) => {
                        const isCompleted = idx < currentStepIndex;
                        const isCurrent = idx === currentStepIndex;
                        const isPending = idx > currentStepIndex;

                        return (
                            <div
                                key={idx}
                                style={{
                                    flex: 1,
                                    height: 4,
                                    borderRadius: 2,
                                    background: isCompleted
                                        ? '#52c41a'
                                        : isCurrent
                                            ? config.color
                                            : '#f0f0f0',
                                    transition: 'background 0.4s',
                                    opacity: isPending ? 0.5 : 1,
                                }}
                                title={step.label}
                            />
                        );
                    })}
                </div>
            )}

            {/* Step Labels */}
            {!failed && (
                <div style={{ display: 'flex', gap: 4 }}>
                    {PIPELINE_STEPS.map((step, idx) => {
                        const isCurrent = idx === currentStepIndex;
                        return (
                            <div
                                key={idx}
                                style={{
                                    flex: 1,
                                    textAlign: 'center',
                                    fontSize: 10,
                                    color: isCurrent ? config.color : '#bfbfbf',
                                    fontWeight: isCurrent ? 600 : 400,
                                    transition: 'color 0.3s',
                                }}
                            >
                                {step.label}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Status Message */}
            <Text
                type="secondary"
                style={{ fontSize: 12, display: 'block', marginTop: 4 }}
            >
                {item.statusMessage}
            </Text>

            {/* Error Message */}
            {item.errorMessage && (
                <Text
                    type="danger"
                    style={{ fontSize: 12, display: 'block', marginTop: 2 }}
                >
                    {item.errorMessage}
                </Text>
            )}

            {/* Timestamp */}
            <Text
                type="secondary"
                style={{ fontSize: 10, display: 'block', marginTop: 4 }}
            >
                {dayjs(item.startedAt).fromNow()}
                {item.retryCount > 0 && ` · ${item.retryCount} retry`}
            </Text>
        </div>
    );
};

export default RasterUploadPipelineItem;