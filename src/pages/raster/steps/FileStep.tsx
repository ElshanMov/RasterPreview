import React, { useState, useEffect } from 'react';
import { Button, Space, Card, Typography, Row, Col, Spin, Alert, Form, Switch, Tooltip } from 'antd';
import { Upload } from 'antd';
import { FileImageOutlined, DeleteOutlined, EyeOutlined, EyeInvisibleOutlined } from '@ant-design/icons';
import type { FormInstance } from 'antd';
import RasterPreview from '../UploadRasterPreview';
import { useRasterPreview } from '../../../hooks/useRasterPreview';

const { Dragger } = Upload;
const { Text } = Typography;

interface FileStepProps {
    form: FormInstance;
    organizationName?: string;
    onNext: () => void;
    onPrev: () => void;
    onFileSelect: (file: File | null) => void;
    onPreviewToggle?: (enabled: boolean) => void;  // ✅ Parent-ə bildiriş
}

const FileStep: React.FC<FileStepProps> = ({ 
    form,
    organizationName,
    onNext, 
    onPrev,
    onFileSelect,
    onPreviewToggle,
}) => {
    const {
        loading,
        progress,
        error,
        currentFile,
        metadata,
        statistics,
        preview,
        processFile
    } = useRasterPreview();

    const [fileSelected, setFileSelected] = useState(false);
    const [previewEnabled, setPreviewEnabled] = useState(true);
    const [rawFile, setRawFile] = useState<File | null>(null);

    const handlePreviewToggle = (checked: boolean) => {
        setPreviewEnabled(checked);
        onPreviewToggle?.(checked);

        // Toggle açıldıqda və fayl artıq seçilibsə — preview-u işə sal
        if (checked && rawFile && !metadata) {
            processFile(rawFile);
        }
    };

    const handleChange = (info: any) => {
        const file = info.fileList[0]?.originFileObj;
        if (!file) return;

        if (!file.name.match(/\.(tif|tiff)$/i)) {
            return;
        }

        setFileSelected(true);
        setRawFile(file);
        onFileSelect(file);

        if (previewEnabled) {
            processFile(file);
        } else {
            // Preview olmadan — yalnız fileName və fileSize yazılır
            form.setFieldsValue({
                fileName: file.name,
                fileSize: file.size,
                width: undefined,
                height: undefined,
                bands: undefined,
                srid: undefined,
                bounds: undefined,
                overviews: undefined,
            });
        }
    };

    const removeFile = () => {
        setFileSelected(false);
        setRawFile(null);
        onFileSelect(null);
        form.setFieldsValue({
            fileName: undefined,
            fileSize: undefined,
            width: undefined,
            height: undefined,
            bands: undefined,
            srid: undefined,
            bounds: undefined,
            overviews: undefined
        });
    };

    useEffect(() => {
        if (metadata && currentFile) {
            console.log('📝 Setting form values:', {
                fileName: currentFile.name,
                fileSize: currentFile.size,
                width: metadata.width,
                height: metadata.height,
                bands: metadata.bands,
                srid: metadata.crs.replace('EPSG:', ''),
                bounds: metadata.bounds,
            });

            form.setFieldsValue({
                fileName: currentFile.name,
                fileSize: currentFile.size,
                width: metadata.width,
                height: metadata.height,
                bands: metadata.bands,
                srid: metadata.crs.replace('EPSG:', ''),
                bounds: metadata.bounds,
                overviews: metadata.overviews
            });
        }
    }, [metadata, currentFile, form]);

    // Preview ON  → preview + metadata + file lazımdır
    // Preview OFF → yalnız file lazımdır
    const canProceed = previewEnabled
        ? !!(preview && metadata && currentFile)
        : !!(fileSelected && rawFile);

    return (
        <Card>
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
                
                {error && (
                    <Alert
                        message="Xəta"
                        description={error}
                        type="error"
                        showIcon
                        closable
                    />
                )}

                {/* ✅ Preview Toggle */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    alignItems: 'center',
                    gap: 8,
                    padding: '8px 12px',
                    background: previewEnabled ? '#f0f5ff' : '#f5f5f5',
                    borderRadius: 8,
                    border: `1px solid ${previewEnabled ? '#adc6ff' : '#d9d9d9'}`,
                    transition: 'all 0.3s',
                }}>
                    <Tooltip title={
                        previewEnabled
                            ? 'Fayl seçildikdə önbaxış göstəriləcək (GeoTIFF analiz edilir)'
                            : 'Önbaxış olmadan birbaşa yükləməyə keçin (daha sürətli)'
                    }>
                        <Space size="small">
                            {previewEnabled
                                ? <EyeOutlined style={{ color: '#1677ff' }} />
                                : <EyeInvisibleOutlined style={{ color: '#8c8c8c' }} />
                            }
                            <Text style={{
                                fontSize: 13,
                                color: previewEnabled ? '#1677ff' : '#8c8c8c',
                                fontWeight: 500,
                            }}>
                                Önbaxış
                            </Text>
                            <Switch
                                checked={previewEnabled}
                                onChange={handlePreviewToggle}
                                size="small"
                            />
                        </Space>
                    </Tooltip>
                </div>

                <div style={{ display: 'none' }}>
                    <Form.Item name="fileName"><input /></Form.Item>
                    <Form.Item name="fileSize"><input /></Form.Item>
                    <Form.Item name="width"><input /></Form.Item>
                    <Form.Item name="height"><input /></Form.Item>
                    <Form.Item name="bands"><input /></Form.Item>
                    <Form.Item name="srid"><input /></Form.Item>
                    <Form.Item name="bounds"><input /></Form.Item>
                    <Form.Item name="overviews"><input /></Form.Item>
                </div>

                {!fileSelected && (
                    <Dragger
                        name="file"
                        multiple={false}
                        maxCount={1}
                        accept=".tif,.tiff"
                        beforeUpload={() => false}
                        onChange={handleChange}
                        showUploadList={false}
                    >
                        <p className="ant-upload-drag-icon">
                            <FileImageOutlined style={{ fontSize: 54, color: "#1677ff" }} />
                        </p>
                         <Text type="secondary">
                        {organizationName} təşkilatı üçün raster fayl seçin
                    </Text>
                        <p className="ant-upload-text" style={{ fontSize: 18, fontWeight: 600 }}>
                            Raster faylını seçin və ya buraya sürükləyin
                        </p>
                    </Dragger>
                )}

                {/* Preview ON + loading */}
                {previewEnabled && loading && fileSelected && (
                    <div style={{ textAlign: 'center', padding: 50 }}>
                        <Spin size="large" />
                        <div style={{ marginTop: 16, fontSize: 16 }}>
                            {progress || 'Yüklənir...'}
                        </div>
                    </div>
                )}

                {fileSelected && (currentFile || rawFile) && !(previewEnabled && loading) && (
                    <>
                        {/* Fayl info bar */}
                        <div style={{
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'center',
                            padding: '12px 20px', 
                            background: '#f6ffed', 
                            borderRadius: '8px',
                            border: '1px solid #b7eb8f', 
                            marginBottom: 20
                        }}>
                            <Space size="middle">
                                <FileImageOutlined style={{ color: '#52c41a', fontSize: '24px' }} />
                                <div>
                                    <Text strong style={{ display: 'block' }}>
                                        {(currentFile || rawFile)!.name}
                                    </Text>
                                    <Text type="secondary" style={{ fontSize: '12px' }}>
                                        Ölçü: {((currentFile || rawFile)!.size / 1024 / 1024).toFixed(2)} MB
                                    </Text>
                                </div>
                            </Space>
                            <Button
                                danger
                                type="primary"
                                ghost
                                icon={<DeleteOutlined />}
                                onClick={removeFile}
                            >
                                Faylı dəyiş
                            </Button>
                        </div>

                        {/* Preview ON → metadata + preview göstər */}
                        {previewEnabled && preview && metadata && (
                            <Row gutter={[16, 16]}>
                                <Col span={16}>
                                    <Card title="Preview" size="small">
                                        <RasterPreview
                                            imageUrl={preview.imageUrl}
                                            bounds={preview.bounds}
                                        />
                                    </Card>
                                </Col>
                                <Col span={8}>
                                    <Card title="Metadata" size="small">
                                        <Space direction="vertical" size={4} style={{ width: '100%' }}>
                                            <div>
                                                <Text type="secondary">Ölçü:</Text> {metadata.width} × {metadata.height}
                                            </div>
                                            <div>
                                                <Text type="secondary">Bandlar:</Text> {metadata.bands}
                                            </div>
                                            <div>
                                                <Text type="secondary">CRS:</Text> {metadata.crs}
                                            </div>
                                            <div>
                                                <Text type="secondary">Overviews:</Text> {metadata.overviews}
                                            </div>
                                            {statistics && statistics[0] && (
                                                <>
                                                    <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid #f0f0f0' }}>
                                                        <Text type="secondary" strong>Statistika (Band 1):</Text>
                                                    </div>
                                                    <div>
                                                        <Text type="secondary">Min:</Text> {statistics[0].min.toFixed(2)}
                                                    </div>
                                                    <div>
                                                        <Text type="secondary">Max:</Text> {statistics[0].max.toFixed(2)}
                                                    </div>
                                                </>
                                            )}
                                        </Space>
                                    </Card>
                                </Col>
                            </Row>
                        )}

                        {/* Preview OFF → sadə məlumat */}
                        {!previewEnabled && (
                            <Alert
                                message="Önbaxış deaktivdir"
                                description="Fayl önbaxış olmadan birbaşa yüklənəcək. Metadata və statistika serverdə hesablanacaq."
                                type="info"
                                showIcon
                                icon={<EyeInvisibleOutlined />}
                            />
                        )}
                    </>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24 }}>
                    <Button size="large" onClick={onPrev}>
                        Geri
                    </Button>
                    <Button 
                        type="primary" 
                        size="large" 
                        onClick={onNext}
                        disabled={!canProceed}
                    >
                        Növbəti
                    </Button>
                </div>
            </Space>
        </Card>
    );
};

export default FileStep;