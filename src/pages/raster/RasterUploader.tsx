import { useEffect, useState } from "react";
import { Form, App } from "antd";
import { useGlobalLoading } from "../../contexts/GlobalLoadingContext";
import type { OrganizationSelectItem } from "../../types/organization.type";
import { OrganizationService } from "../../services/organization.service";
import type { BranchSelectItem } from "../../types/branch.type";
import { BranchService } from "../../services/branch.service";
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
import OrganizationStep from "./steps/OrganizationStep";
import FileStep from "./steps/FileStep";
import StepsIndicator from "../../components/shared/StepsIndicator";
import SummaryStep from "./steps/SummaryStep";

const STEPS = ["Təşkilat", "Fayl", "Təsdiq"];

export default function RasterUploader() {
    const { message } = App.useApp();
    const { setLoading } = useGlobalLoading();
    const navigate = useNavigate();
    const dispatch = useAppDispatch();

    const [form] = Form.useForm();
    const [currentStep, setCurrentStep] = useState(1);

    const [organizationName, setOrganizationName] = useState<string | undefined>('');
    const [branchName, setBranchName] = useState<string | undefined>('');
    const [organizations, setOrganizations] = useState<OrganizationSelectItem[]>([]);
    const [branches, setBranches] = useState<BranchSelectItem[]>([]);

    const [currentFile, setCurrentFile] = useState<File | null>(null);

    const nextStep = () => setCurrentStep((prev) => Math.min(prev + 1, 3));
    const prevStep = () => setCurrentStep((prev) => Math.max(prev - 1, 1));

    const validateStep1 = async () => {
        try {
            await form.validateFields(['organizationId', 'branchId']);
            return true;
        } catch (error) {
            message.warning("📌 Zəhmət olmasa təşkilat və filial seçin!");
            return false;
        }
    };

    const handleOrgStepNext = async () => {
        const isValid = await validateStep1();
        if (isValid) nextStep();
    };

    const calculatePixelSize = (
        width: number,
        height: number,
        bounds: number[],
        srid: string
    ): string => {
        const [minX, minY, maxX, maxY] = bounds;
        let xSizeMeters: number;
        let ySizeMeters: number;

        if (srid.startsWith('326')) {
            xSizeMeters = (maxX - minX) / width;
            ySizeMeters = (maxY - minY) / height;
        } else if (srid === '4326') {
            const avgLat = (minY + maxY) / 2;
            const latRadians = avgLat * (Math.PI / 180);
            const metersPerDegreeLat = 111320;
            const metersPerDegreeLng = 111320 * Math.cos(latRadians);
            xSizeMeters = ((maxX - minX) / width) * metersPerDegreeLng;
            ySizeMeters = ((maxY - minY) / height) * metersPerDegreeLat;
        } else {
            xSizeMeters = (maxX - minX) / width;
            ySizeMeters = (maxY - minY) / height;
        }

        return `${xSizeMeters.toFixed(2)}x${ySizeMeters.toFixed(2)}`;
    };

    // ═══════════════════════════════════════════════════════════
    // EVENT-BASED UPLOAD FLOW
    // ═══════════════════════════════════════════════════════════
    const handleSubmit = async (values: any) => {
        if (!currentFile) {
            message.error('Fayl seçilməyib');
            return;
        }

        const pixelSize = calculatePixelSize(
            values.width,
            values.height,
            values.bounds,
            values.srid
        );

        let correlationId: string | null = null;

        try {
            setLoading(true);

            // ── Step 1: Pre-signed URL al ────────────────────────────
            const presignedResponse = await FileService.getRasterFilePresignedUrl({
                organizationName: organizationName!,
                fileName: currentFile.name,
                pixelSize: pixelSize,
            });
            debugger;
            const presignedUrl = presignedResponse.data.url;
            const rawPath = presignedResponse.data.path;

            // ── Step 2: DB-də upload rekord yarat → correlationId al ─
            const fileExtension = currentFile.name.substring(
                currentFile.name.lastIndexOf('.')
            );

            const createResponse = await RasterUploadService.createUpload({
                organizationId: values.organizationId,
                branchId: values.branchId,
                originalFileName: currentFile.name,
                rawPath: rawPath,
                cogPath: '',
                fileLength: currentFile.size,
                fileExtension: fileExtension,
            });

            correlationId = createResponse.data.correlationId;

            if (!correlationId) {
                throw new Error('Server correlationId qaytarmadı');
            }

            // ── Step 3: Redux store-a upload əlavə et ───────────────
            dispatch(addUpload({
                correlationId,
                fileName: currentFile.name,
                fileSize: currentFile.size,
                originalPath: rawPath,
            }));

            // ── Step 4: İstifadəçini /rasters-a yönləndir ──────────
            setLoading(false);
            message.info('Yükləmə başladı — prosesi Rasters səhifəsində izləyə bilərsiniz.');
            navigate('/rasters');

            // ── Step 5: MinIO-ya yüklə (plain, header-siz) ──────────
            await MinIOService.uploadRaster(
                presignedUrl,
                currentFile,
                (percent) => {
                    dispatch(updateUploadProgress({
                        correlationId: correlationId!,
                        progress: percent,
                    }));
                }
            );

            // ── Step 6: MinIO object-ə correlationId metadata yaz ───
            //    Upload bitdikdən sonra ayrıca endpoint ilə metadata set olunur.
            //    Bu metadata Kafka ObjectCreated eventində worker-ə ötürüləcək.
            await RasterUploadService.setMetadata({
                path: rawPath,
                correlationId: correlationId,
            });

            // ── Step 7: Statusu Uploaded et ─────────────────────────
            dispatch(markAsUploaded(correlationId));

            await RasterUploadService.updateStatus(correlationId, {
                status: RasterUploadStatus.Uploaded,
            });

            // Bundan sonra:
            // → MinIO ObjectCreated eventi Kafka-ya düşür (metadata-da correlationId var)
            // → KEDA worker pod-u qalxır, COG çevirir, statistika hesablayır
            // → Worker WebSocket ilə UI-a progress göndərir
            // → Redux store _socket.ts listener vasitəsilə avtomatik yenilənir

        } catch (error: any) {
            let errorMessage = 'Yükləmə xətası';

            if (error.status === 400 && error.data) {
                const validationErrors = Array.isArray(error.data)
                    ? error.data.map((e: any) => `${e.propertyName}: ${e.errorMessage}`).join('\n')
                    : error.data.message || JSON.stringify(error.data);
                errorMessage = `Validation xətası: ${validationErrors}`;
            } else if (error.message) {
                errorMessage = error.message;
            }

            if (correlationId) {
                dispatch(markAsFailed({
                    correlationId,
                    errorMessage,
                }));
            }

            message.error({
                content: `❌ ${errorMessage}`,
                duration: 6,
            });
        } finally {
            setLoading(false);
        }
    };

    const getOrganizations = async () => {
        OrganizationService.getAllOrganizations().then((res) => setOrganizations(res.data));
    };

    const getBranches = async (organizationId: string | undefined) => {
        BranchService.getAllBranches(organizationId).then((res) => setBranches(res.data));
    };

    useEffect(() => {
        getOrganizations();
    }, []);

    return (
        <div style={{ maxWidth: 1000, margin: "0 auto", padding: "20px" }}>
            <StepsIndicator
                steps={STEPS}
                currentStep={currentStep}
            />

            <Form
                form={form}
                preserve={true}
                layout="vertical"
                onFinish={handleSubmit}
            >
                {/* Step 1: Təşkilat */}
                <div hidden={currentStep !== 1}>
                    <OrganizationStep
                        organizations={organizations}
                        branches={branches}
                        getBranches={getBranches}
                        setOrganizationName={setOrganizationName}
                        setBranchName={setBranchName}
                        onNext={handleOrgStepNext}
                    />
                </div>

                {/* Step 2: Fayl Yükləmə */}
                <div hidden={currentStep !== 2}>
                    <FileStep
                        form={form}
                        organizationName={organizationName}
                        onNext={nextStep}
                        onPrev={prevStep}
                        onFileSelect={setCurrentFile}
                    />
                </div>

                {/* Step 3: Xülasə & Təsdiq */}
                <div hidden={currentStep !== 3}>
                    <SummaryStep
                        form={form}
                        organizationName={organizationName}
                        branchName={branchName}
                        onPrev={prevStep}
                    />
                </div>
            </Form>
        </div>
    );
}