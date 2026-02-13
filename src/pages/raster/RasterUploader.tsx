/**
 * RasterUploader — Sadələşdirilmiş
 * 
 * FAYL YOLU: src/pages/raster/RasterUploader.tsx
 * 
 * Köhnə: 3 step (Təşkilat → Fayl+Preview → Xülasə)
 * Yeni:   1 səhifə (Təşkilat + Branch + Fayl → Yüklə)
 * 
 * ✅ Preview yoxdur — Web Worker yüklənmir
 * ✅ Step-lər yoxdur — hər şey bir kartda
 * ✅ Yüklə basıldıqdan sonra pipeline progress göstərilir
 * ✅ Fayl seçildikdən sonra yüklə düyməsi aktiv olur
 */

import { useState, useCallback } from "react";
import {
    Form, App, Card, Typography, Upload, Button, Space
} from "antd";
import {
    FileImageOutlined, CloudUploadOutlined,
    CheckCircleOutlined, DeleteOutlined
} from "@ant-design/icons";
import { useGlobalLoading } from "../../contexts/GlobalLoadingContext";
import { FileService } from "../../services/file.service";
import { MinIOService } from "../../services/minio.service";
import { RasterUploadService } from "../../services/raster-upload.service";
import { useNavigate } from "react-router-dom";
import { useAppDispatch } from "../../store/hooks";
import {
    addUpload,
    updateUploadProgress,
    markAsUploaded,
    markAsFailed,
} from "../../store/slices/rasterUploadSlice";
import { RasterUploadStatus } from "../../types/raster-upload.type";

const { Dragger } = Upload;
const { Title, Text } = Typography;

// ─── Default Təşkilat & Filial ────────────────────────────────
const DEFAULT_ORG_ID = "019b26d3-9d03-7b6b-856f-970168770cc0";       // Azəriqaz
const DEFAULT_BRANCH_ID = "019b26e8-1b30-7da1-baae-72280221b27c";   // Sabunçu
const DEFAULT_ORG_NAME = "azeriqaz";

// ─── Helpers ──────────────────────────────────────────────────

const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

// ─── Component ────────────────────────────────────────────────

export default function RasterUploader() {
    const { message } = App.useApp();
    const { setLoading } = useGlobalLoading();
    const navigate = useNavigate();
    const dispatch = useAppDispatch();

    const [form] = Form.useForm();

    // Data
    const [currentFile, setCurrentFile] = useState<File | null>(null);

    // State
    const [uploading, setUploading] = useState(false);

    // ─── File handling ────────────────────────────────────────

    const handleFileChange = useCallback((info: any) => {
        const file = info.fileList[0]?.originFileObj;
        if (!file) return;

        if (!file.name.match(/\.(tif|tiff)$/i)) {
            message.error("Yalnız .tif/.tiff faylları dəstəklənir");
            return;
        }

        setCurrentFile(file);
        form.setFieldValue("fileName", file.name);
    }, [form]);

    const handleRemoveFile = useCallback(() => {
        setCurrentFile(null);
        form.setFieldValue("fileName", undefined);
    }, [form]);

    // ─── Upload ───────────────────────────────────────────────

    const handleUpload = async () => {
        if (!currentFile) {
            message.warning("Fayl seçin");
            return;
        }

        let correlationId: string | null = null;

        try {
            setUploading(true);
            setLoading(true);

            // ── 1. Pre-signed URL ────────────────────────────────
            const presignedResponse = await FileService.getRasterFilePresignedUrl({
                organizationName: DEFAULT_ORG_NAME,
                fileName: currentFile.name,
                pixelSize: "0.00x0.00",
            });

            const presignedUrl = presignedResponse.data.url;
            const rawPath = presignedResponse.data.path;

            // ── 2. DB-də upload rekord yarat ─────────────────────
            const fileExtension = currentFile.name.substring(
                currentFile.name.lastIndexOf(".")
            );

            const createResponse = await RasterUploadService.createUpload({
                organizationId: DEFAULT_ORG_ID,
                branchId: DEFAULT_BRANCH_ID,
                originalFileName: currentFile.name,
                rawPath,
                cogPath: "",
                fileLength: currentFile.size,
                fileExtension,
            });

            correlationId = createResponse.data.correlationId;
            if (!correlationId) throw new Error("Server correlationId qaytarmadı");

            // ── 3. Redux store-a əlavə et ────────────────────────
            dispatch(
                addUpload({
                    correlationId,
                    fileName: currentFile.name,
                    fileSize: currentFile.size,
                    originalPath: rawPath,
                })
            );

            // ── 4. İstifadəçini /rasters-a yönləndir ────────────
            setLoading(false);
            setUploading(false);
            message.info("Yükləmə başladı — prosesi Rasters səhifəsində izləyə bilərsiniz.");
            navigate("/rasters");

            // ── 5. MinIO-ya yüklə (arxa fonda) ──────────────────
            await MinIOService.uploadRaster(presignedUrl, currentFile, (percent) => {
                dispatch(
                    updateUploadProgress({
                        correlationId: correlationId!,
                        progress: percent,
                    })
                );
            });

            // ── 6. Metadata yaz ──────────────────────────────────
            await RasterUploadService.setMetadata({
                path: rawPath,
                correlationId,
            });

            // ── 7. Status → Uploaded ─────────────────────────────
            dispatch(markAsUploaded(correlationId));
            await RasterUploadService.updateStatus(correlationId, {
                status: RasterUploadStatus.Uploaded,
            });

        } catch (error: any) {
            let errorMessage = "Yükləmə xətası";

            if (error.status === 400 && error.data) {
                const validationErrors = Array.isArray(error.data)
                    ? error.data.map((e: any) => `${e.propertyName}: ${e.errorMessage}`).join("\n")
                    : error.data.message || JSON.stringify(error.data);
                errorMessage = `Validation xətası: ${validationErrors}`;
            } else if (error.message) {
                errorMessage = error.message;
            }

            if (correlationId) {
                dispatch(markAsFailed({ correlationId, errorMessage }));
            }

            message.error({ content: `❌ ${errorMessage}`, duration: 6 });
        } finally {
            setLoading(false);
            setUploading(false);
        }
    };

    // ─── Render ───────────────────────────────────────────────

    const isReady = !!currentFile;

    return (
        <div style={{ maxWidth: 700, margin: "0 auto", padding: "24px 16px" }}>
            <Title level={3} style={{ marginBottom: 24, textAlign: "center" }}>
                <CloudUploadOutlined /> Raster Fayl Yüklə
            </Title>

            <Form form={form} layout="vertical" disabled={uploading}>
                {/* ── Fayl seçimi ──────────────────────────────── */}
                <Card
                    size="small"
                    title={<><FileImageOutlined /> Fayl</>}
                    style={{ marginBottom: 16 }}
                >
                    {!currentFile ? (
                        <Dragger
                            name="file"
                            multiple={false}
                            maxCount={1}
                            accept=".tif,.tiff"
                            beforeUpload={() => false}
                            onChange={handleFileChange}
                            showUploadList={false}
                        >
                            <p className="ant-upload-drag-icon">
                                <FileImageOutlined style={{ fontSize: 48, color: "#1677ff" }} />
                            </p>
                            <p className="ant-upload-text" style={{ fontSize: 16, fontWeight: 600 }}>
                                Raster faylını seçin və ya sürükləyin
                            </p>
                            <p className="ant-upload-hint">
                                Dəstəklənən formatlar: .tif, .tiff
                            </p>
                        </Dragger>
                    ) : (
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                padding: "12px 16px",
                                background: "#f6ffed",
                                borderRadius: 8,
                                border: "1px solid #b7eb8f",
                            }}
                        >
                            <Space>
                                <CheckCircleOutlined style={{ color: "#52c41a", fontSize: 20 }} />
                                <div>
                                    <Text strong>{currentFile.name}</Text>
                                    <br />
                                    <Text type="secondary" style={{ fontSize: 12 }}>
                                        {formatFileSize(currentFile.size)}
                                    </Text>
                                </div>
                            </Space>
                            <Button
                                type="text"
                                danger
                                icon={<DeleteOutlined />}
                                onClick={handleRemoveFile}
                            >
                                Sil
                            </Button>
                        </div>
                    )}

                    <Form.Item name="fileName" hidden>
                        <input />
                    </Form.Item>
                </Card>

                {/* ── Yüklə düyməsi ───────────────────────────── */}
                <Button
                    type="primary"
                    size="large"
                    block
                    icon={<CloudUploadOutlined />}
                    loading={uploading}
                    disabled={!isReady}
                    onClick={handleUpload}
                >
                    {uploading ? "Yüklənir..." : "Yüklə"}
                </Button>

                {!isReady && !uploading && (
                    <Text
                        type="secondary"
                        style={{ display: "block", textAlign: "center", marginTop: 8, fontSize: 12 }}
                    >
                        Fayl əlavə edin
                    </Text>
                )}
            </Form>
        </div>
    );
}