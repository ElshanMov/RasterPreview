import React, { useState, useEffect } from 'react';
import { Button, Space, Card, Typography, Row, Col, Spin, Alert, Form } from 'antd';
import { Upload } from 'antd';
import { FileImageOutlined, DeleteOutlined } from '@ant-design/icons';
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
    onFileSelect: (file: File | null) => void;  // ✅ NEW
}

const FileStep: React.FC<FileStepProps> = ({ 
    form,
    organizationName,
    onNext, 
    onPrev,
    onFileSelect  // ✅ NEW
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

    const handleChange = (info: any) => {
        const file = info.fileList[0]?.originFileObj;
        if (!file) return;

        if (!file.name.match(/\.(tif|tiff)$/i)) {
            return;
        }

        setFileSelected(true);
        processFile(file);
        onFileSelect(file);  // ✅ Send file to parent
    };

    const removeFile = () => {
        setFileSelected(false);
        onFileSelect(null);  // ✅ Clear file in parent
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

    const canProceed = preview && metadata && currentFile;

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

                {loading && fileSelected && (
                    <div style={{ textAlign: 'center', padding: 50 }}>
                        <Spin size="large" />
                        <div style={{ marginTop: 16, fontSize: 16 }}>
                            {progress || 'Yüklənir...'}
                        </div>
                    </div>
                )}

                {fileSelected && currentFile && !loading && (
                    <>
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
                                        {currentFile.name}
                                    </Text>
                                    <Text type="secondary" style={{ fontSize: '12px' }}>
                                        Ölçü: {(currentFile.size / 1024 / 1024).toFixed(2)} MB
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

                        {preview && metadata && (
                            <Row gutter={[16, 16]}>
                                <Col span={16}>
                                    <Card title="Preview" size="small">
                                        <div style={{ 
                                            height: 400, 
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

                                <Col span={8}>
                                    <Card title="Fayl Məlumatları" size="small">
                                        <Space direction="vertical" size="small" style={{ width: '100%' }}>
                                            <div>
                                                <Text type="secondary">Dimensions:</Text>
                                                <div>{metadata.width} × {metadata.height}</div>
                                            </div>
                                            <div>
                                                <Text type="secondary">Bandlar:</Text>
                                                <div>{metadata.bands}</div>
                                            </div>
                                            <div>
                                                <Text type="secondary">CRS:</Text>
                                                <div>{metadata.crs}</div>
                                            </div>
                                            <div>
                                                <Text type="secondary">Overviews:</Text>
                                                <div>{metadata.overviews}</div>
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