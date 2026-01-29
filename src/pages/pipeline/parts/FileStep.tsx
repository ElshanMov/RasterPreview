import React, { useState } from 'react';
import { Upload, Typography, Button, Card, App, Space, Row, Col, Input, Form } from 'antd';
import {
    InboxOutlined, DeleteOutlined, FileZipOutlined,
    GlobalOutlined, AimOutlined, TagOutlined, InfoCircleOutlined
} from '@ant-design/icons';
import type { UploadFile, UploadProps } from 'antd';
import ShapeMap from '../../../components/ShapeMap';
import { FileService } from '../../../services/file.service';
import { MinIOService } from '../../../services/minio.service';
import { analyzeShapefile } from '../../../utils/file.util';

const { Dragger } = Upload;
const { Text, Title } = Typography;

interface FileStepProps {
    organizationName?: string;
    setLoading: (val: boolean) => void;
    form: any;
    onNext: () => void;
    onPrev: () => void;
}

const FileStep: React.FC<FileStepProps> = ({
    organizationName,
    setLoading,
    form,
    onNext,
    onPrev
}) => {
    const { message } = App.useApp();

    const [fileList, setFileList] = useState<UploadFile[]>([]);
    const [analysisComplete, setAnalysisComplete] = useState(false);

    const handleFileChange: UploadProps["onChange"] = async ({ fileList: newList }) => {
        const latestFile = newList.slice(-1);
        setFileList(latestFile);

        const file = latestFile[0]?.originFileObj;
        if (!file) {
            setAnalysisComplete(false);
            return;
        }

        setLoading(true);
        setAnalysisComplete(false);

        try {
            const response = await FileService.getVectorFilePresignedUrl({
                organizationName: organizationName || "default",
                fileName: file.name
            });

            await MinIOService.upload(response.data.url, file);
            const analyze = await analyzeShapefile(file);

            form.setFieldsValue({
                name: 'AUTO',
                sourceName: analyze.sourceName,
                sourceSrid: analyze.sourceSrid,
                geometryType: analyze.geometryType,
                sourcePath: response.data.path,
                businessKeyColumns: analyze.businessKeyColumns,
                metadata: JSON.stringify({
                    description: "Geospatial data",
                    uploadedAt: new Date().toISOString()
                }),
                configVersion: '1.1',
                dataSteward: 'SetclappMM Team'
            });

            message.success(`✅ ${file.name} uğurla yükləndi və analiz edildi.`);
            setAnalysisComplete(true);
        } catch (error: any) {
            console.error("Upload/Analysis error:", error);
            message.error("❌ Xəta baş verdi: " + (error.message || "Fayl emal edilə bilmədi"));
            setFileList([]);
        } finally {
            setLoading(false);
        }
    };

    const removeFile = () => {
        setFileList([]);
        setAnalysisComplete(false);
        form.setFieldsValue({
            name: '',
            sourceName: '',
            sourceSrid: '',
            geometryType: '',
            sourcePath: '',
            businessKeyColumns: '',
            metadata: '',
            configVersion: '',
            dataSteward: ''
        });
    };

    return (
        <Card title={<span><InboxOutlined /> Yükləmə və Analiz</span>} className="step-card">

            {fileList.length === 0 && (
                <div style={{ padding: '20px 0' }}>
                    <Dragger
                        name="file"
                        multiple={false}
                        maxCount={1}
                        accept=".zip"
                        fileList={fileList}
                        onChange={handleFileChange}
                        beforeUpload={() => false}
                        showUploadList={false}
                    >
                        <p className="ant-upload-drag-icon">
                            <InboxOutlined style={{ fontSize: 54, color: "#1677ff" }} />
                        </p>
                        <Title level={4}>ZIP paketini bura atın</Title>
                        <Text type="secondary" style={{ fontSize: '14px' }}>
                            Paket daxilində .shp, .shx, .dbf və .prj fayllarının olması mütləqdir.
                        </Text>
                    </Dragger>
                </div>
            )}

            {fileList.length > 0 && analysisComplete && (
                <div style={{ animation: 'fadeIn 0.6s ease-in-out' }}>
                    <div style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '12px 20px', background: '#f6ffed', borderRadius: '8px',
                        border: '1px solid #b7eb8f', marginBottom: 20
                    }}>
                        <Space size="middle">
                            <FileZipOutlined style={{ color: '#52c41a', fontSize: '24px' }} />
                            <div>
                                <Text strong style={{ display: 'block' }}>{fileList[0].name}</Text>
                                <Text type="secondary" style={{ fontSize: '12px' }}>
                                    Ölçü: {(fileList[0].size! / 1024).toFixed(2)} KB
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

                    <Row gutter={[24, 24]}>
                        <Col xs={24} lg={14}>
                            <div style={{
                                height: '420px',
                                borderRadius: '12px',
                                overflow: 'hidden',
                                border: '1px solid #d9d9d9',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                            }}>
                                <ShapeMap
                                    key={fileList[0]?.uid}
                                    file={fileList[0]?.originFileObj}
                                    maxFeatures={1000}
                                    isFocus={true}
                                />
                            </div>
                        </Col>

                        <Col xs={24} lg={10}>
                            <Title level={5} style={{ marginBottom: 16 }}>
                                <InfoCircleOutlined /> Avtomatik Analiz Nəticəsi
                            </Title>

                            <Row gutter={[12, 0]}>
                                <Col span={24}>
                                    <Form.Item label="Mənbə" name="sourceName">
                                        <Input readOnly variant="filled" prefix={<TagOutlined style={{ color: '#bfbfbf' }} />} />
                                    </Form.Item>
                                </Col>

                                <Col span={12}>
                                    <Form.Item label="Koordinat Sistemi" name="sourceSrid">
                                        <Input readOnly variant="filled" prefix={<GlobalOutlined style={{ color: '#bfbfbf' }} />} />
                                    </Form.Item>
                                </Col>

                                <Col span={12}>
                                    <Form.Item label="Növ" name="geometryType">
                                        <Input readOnly variant="filled" prefix={<AimOutlined style={{ color: '#bfbfbf' }} />} />
                                    </Form.Item>
                                </Col>

                                <Col span={24}>
                                    <Form.Item label="Yüklənmə yeri" name="sourcePath">
                                        <Input.TextArea readOnly variant="filled" rows={3} style={{ fontSize: '11px', fontFamily: 'monospace' }} />
                                    </Form.Item>
                                </Col>

                                <Form.Item name="businessKeyColumns" hidden><Input /></Form.Item>
                                <Form.Item name="metadata" hidden><Input /></Form.Item>
                                <Form.Item name="configVersion" hidden><Input /></Form.Item>
                                <Form.Item name="dataSteward" hidden><Input /></Form.Item>
                                <Form.Item name="name" hidden><Input /></Form.Item>
                            </Row>
                        </Col>
                    </Row>
                </div>
            )}

            <div style={{
                display: "flex",
                justifyContent: "space-between",
                marginTop: 30,
                borderTop: '1px solid #f0f0f0',
                paddingTop: 20
            }}>
                <Button size="large" onClick={onPrev}>← Geri</Button>

                <Button
                    size="large"
                    type="primary"
                    onClick={onNext}
                    disabled={!analysisComplete}
                >
                    Növbəti →
                </Button>
            </div>

            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(15px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .ant-form-item-label { font-weight: 500; }
                .step-card { box-shadow: 0 4px 15px rgba(0,0,0,0.05); border-radius: 12px; }
            `}</style>
        </Card>
    );
};

export default FileStep;