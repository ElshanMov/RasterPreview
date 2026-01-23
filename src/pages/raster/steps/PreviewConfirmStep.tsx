import React from 'react';
import { Row, Col, Card, Space, Slider, Select, Button, Alert, Progress } from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';
import RasterPreview from '../UploadRasterPreview';

interface PreviewConfirmStepProps {
    preview: {
        imageUrl: string;
        bounds: [[number, number], [number, number]];
    };
    metadata: {
        width: number;
        height: number;
        bands: number;
        crs: string;
        bounds: number[];
        overviews: number;
        hasGeospatialInfo?: boolean;
    };
    statistics: any[] | null;
    currentFile: File | null;
    stretchMode: 'percentile' | 'minmax';
    gamma: number;
    uploading: boolean;
    uploadProgress: number;
    onStretchModeChange: (mode: 'percentile' | 'minmax') => void;
    onGammaChange: (gamma: number) => void;
    onRerender: () => void;
    warning?: string | null;
}

const PreviewConfirmStep: React.FC<PreviewConfirmStepProps> = ({
    preview,
    metadata,
    statistics,
    currentFile,
    stretchMode,
    gamma,
    uploading,
    uploadProgress,
    onStretchModeChange,
    onGammaChange,
    onRerender,
    warning
}) => {
    return (
        <div>
            {warning && (
                <Alert
                    message="Xəbərdarlıq"
                    description={warning}
                    type="warning"
                    closable
                    showIcon
                    style={{ marginBottom: 16 }}
                />
            )}

            {uploading && (
                <Alert
                    message="Yüklənir..."
                    description={
                        <Progress percent={uploadProgress} status="active" />
                    }
                    type="info"
                    showIcon
                    style={{ marginBottom: 16 }}
                />
            )}

            <Row gutter={[16, 16]}>
                {/* Left: Map Preview */}
                <Col span={16}>
                    <Card
                        title="Preview"
                        extra={
                            <Space>
                                <Select
                                    value={stretchMode}
                                    onChange={onStretchModeChange}
                                    style={{ width: 120 }}
                                    size="small"
                                >
                                    <Select.Option value="percentile">Percentile</Select.Option>
                                    <Select.Option value="minmax">Min-Max</Select.Option>
                                </Select>
                                <Button size="small" onClick={onRerender}>
                                    Yenilə
                                </Button>
                            </Space>
                        }
                    >
                        <div style={{
                            height: 500,
                            border: '1px solid #d9d9d9',
                            borderRadius: 8,
                            overflow: 'hidden'
                        }}>
                            <RasterPreview
                                imageUrl={preview.imageUrl}
                                bounds={preview.bounds}
                            />
                        </div>
                    </Card>
                </Col>

                {/* Right: Metadata */}
                <Col span={8}>
                    <Card title={<Space><InfoCircleOutlined /> Məlumat</Space>}>
                        {/* File Info */}
                        <div style={{ marginBottom: 16 }}>
                            <div style={{ fontSize: 12, color: '#999', marginBottom: 4 }}>
                                Fayl
                            </div>
                            <div style={{ fontSize: 14, fontWeight: 500, wordBreak: 'break-all' }}>
                                {currentFile?.name}
                            </div>
                            <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>
                                {currentFile && (currentFile.size / 1024 / 1024).toFixed(2)} MB
                            </div>
                        </div>

                        {/* Metadata */}
                        <div style={{ marginBottom: 12 }}>
                            <div style={{ fontSize: 12, color: '#999' }}>Ölçü</div>
                            <div style={{ fontSize: 14 }}>
                                {metadata.width} × {metadata.height}
                            </div>
                        </div>

                        <div style={{ marginBottom: 12 }}>
                            <div style={{ fontSize: 12, color: '#999' }}>Bandlar</div>
                            <div style={{ fontSize: 14 }}>
                                {metadata.bands}
                            </div>
                        </div>

                        <div style={{ marginBottom: 12 }}>
                            <div style={{ fontSize: 12, color: '#999' }}>CRS</div>
                            <div style={{ fontSize: 14 }}>
                                {metadata.crs}
                            </div>
                        </div>

                        <div style={{ marginBottom: 12 }}>
                            <div style={{ fontSize: 12, color: '#999' }}>Overviews</div>
                            <div style={{ fontSize: 14 }}>
                                {metadata.overviews} səviyyə
                            </div>
                        </div>

                        <div style={{ marginBottom: 12 }}>
                            <div style={{ fontSize: 12, color: '#999' }}>Bounds</div>
                            <div style={{ fontSize: 11, fontFamily: 'monospace', wordBreak: 'break-all' }}>
                                {metadata.bounds.map(b => b.toFixed(2)).join(', ')}
                            </div>
                        </div>

                        {/* Statistics */}
                        {statistics && statistics.length > 0 && statistics[0] && (
                            <>
                                <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #f0f0f0' }}>
                                    <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>
                                        Statistika (Band 1)
                                    </div>
                                    <div style={{ fontSize: 11, marginBottom: 4 }}>
                                        Min: {statistics[0].min.toFixed(2)}
                                    </div>
                                    <div style={{ fontSize: 11, marginBottom: 4 }}>
                                        Max: {statistics[0].max.toFixed(2)}
                                    </div>
                                    <div style={{ fontSize: 11, marginBottom: 4 }}>
                                        Mean: {statistics[0].mean.toFixed(2)}
                                    </div>
                                    <div style={{ fontSize: 11 }}>
                                        StdDev: {statistics[0].stdDev.toFixed(2)}
                                    </div>
                                </div>
                            </>
                        )}

                        {/* Gamma Control */}
                        <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #f0f0f0' }}>
                            <div style={{ fontSize: 12, marginBottom: 8 }}>
                                Gamma: {gamma.toFixed(2)}
                            </div>
                            <Slider
                                min={0.1}
                                max={3.0}
                                step={0.1}
                                value={gamma}
                                onChange={onGammaChange}
                                onAfterChange={onRerender}
                            />
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#999' }}>
                                <span>Açıq</span>
                                <span>Normal</span>
                                <span>Qaranlıq</span>
                            </div>
                        </div>
                    </Card>
                </Col>
            </Row>
        </div>
    );
};

export default PreviewConfirmStep;