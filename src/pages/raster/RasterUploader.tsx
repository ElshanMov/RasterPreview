import { useEffect, useState } from "react";
import { Form, App, Progress } from "antd";
import { useGlobalLoading } from "../../contexts/GlobalLoadingContext";
import type { OrganizationSelectItem } from "../../types/organization.type";
import { OrganizationService } from "../../services/organization.service";
import type { BranchSelectItem } from "../../types/branch.type";
import { BranchService } from "../../services/branch.service";
import { FileService } from "../../services/file.service";
import { MinIOService } from "../../services/minio.service";
import { useNavigate } from "react-router-dom";
import OrganizationStep from "./steps/OrganizationStep";
import FileStep from "./steps/FileStep";
import StepsIndicator from "../../components/shared/StepsIndicator";
import SummaryStep from "./steps/SummaryStep";
import { generateUuidFromFileName } from '../../utils/hash.util';

const STEPS = ["Təşkilat", "Fayl", "Təsdiq"];

export default function RasterUploader() {
    const { message } = App.useApp();
    const { setLoading } = useGlobalLoading();
    const navigate = useNavigate();

    const [form] = Form.useForm();
    const [currentStep, setCurrentStep] = useState(1);

    const [organizationName, setOrganizationName] = useState<string | undefined>('');
    const [branchName, setBranchName] = useState<string | undefined>('');
    const [organizations, setOrganizations] = useState<OrganizationSelectItem[]>([]);
    const [branches, setBranches] = useState<BranchSelectItem[]>([]);

    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploadStatus, setUploadStatus] = useState('');

    // ✅ CURRENT FILE STATE
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

    const calculatePixelSize = (width: number, height: number, bounds: number[]): string => {
        const [minX, minY, maxX, maxY] = bounds;

        const xSize = (maxX - minX) / width;
        const ySize = (maxY - minY) / height;

        const avgPixelSize = (xSize + ySize) / 2;

        return avgPixelSize.toFixed(6);
    };

    const handleSubmit = async (values: any) => {

        setLoading(true);
        setUploadProgress(0);

        try {
            if (!currentFile) {
                throw new Error('Fayl seçilməyib');
            }


            // Calculate pixel size
            const pixelSize = calculatePixelSize(
                values.width,
                values.height,
                values.bounds
            );


            // Get pre-signed URL
            setUploadStatus('Pre-signed URL alınır...');
            message.loading({ content: 'Pre-signed URL alınır...', key: 'upload' });

            const requestBody = {
                organizationName: "Azeriqaz",
                fileName: currentFile.name,
                pixelSize: pixelSize
            };


            const presignedResponse = await FileService.getRasterFilePresignedUrl(requestBody);


            const presignedUrl = presignedResponse.data;


            // Upload to MinIO with progress
            setUploadStatus('MinIO-ya yüklənir...');
            message.loading({ content: 'MinIO-ya yüklənir... 0%', key: 'upload' });

            await MinIOService.uploadRaster(presignedUrl, currentFile, (percent) => {
                setUploadProgress(percent);
                message.loading({
                    content: `MinIO-ya yüklənir... ${percent}%`,
                    key: 'upload'
                });
            });

            // ✅ Complete upload - Create STAC Item
            setUploadStatus('Metadata qeyd edilir...');
            message.loading({ content: 'Metadata qeyd edilir...', key: 'upload' });

            const stacItemId = await generateUuidFromFileName(currentFile.name);
            const now = new Date().toISOString();

            // ✅ 1. UTM bounds-dan WGS84-ə transform
            const [minX, minY, maxX, maxY] = values.bounds;
            const srid = values.srid; // "32639" məsələn


            // Transform to WGS84
            let wgs84MinX: number, wgs84MinY: number, wgs84MaxX: number, wgs84MaxY: number;

            if (srid.startsWith('326')) {
                // UTM zones - transform with proj4
                const proj4 = await import('proj4');
                const utmSrid = `EPSG:${srid}`;

                [wgs84MinX, wgs84MinY] = proj4.default(utmSrid, 'EPSG:4326', [minX, minY]);
                [wgs84MaxX, wgs84MaxY] = proj4.default(utmSrid, 'EPSG:4326', [maxX, maxY]);
            } else if (srid === '4326') {
                // Already WGS84
                [wgs84MinX, wgs84MinY, wgs84MaxX, wgs84MaxY] = [minX, minY, maxX, maxY];
            } else {
                throw new Error(`Dəstəklənməyən SRID: ${srid}`);
            }


            // ✅ 2. Create GeoJSON geometry (WGS84 coordinates)
            const geometry = {
                type: "Polygon",
                coordinates: [[
                    [wgs84MinX, wgs84MinY],
                    [wgs84MaxX, wgs84MinY],
                    [wgs84MaxX, wgs84MaxY],
                    [wgs84MinX, wgs84MaxY],
                    [wgs84MinX, wgs84MinY]
                ]]
            };


            // ✅ 3. Bbox (WGS84: [minLng, minLat, maxLng, maxLat])
            const bbox = [wgs84MinX, wgs84MinY, wgs84MaxX, wgs84MaxY];

            //todo : log stac item
            // ✅ 4. Create STAC Item
            const stacItem = {
                id: stacItemId,
                collection: "a12a0f2d-7b2c-42e7-a500-8aff2359b4f7_RTR",
                geometry: geometry,
                bbox: bbox,  // ✅ WGS84 coordinates
                properties: {
                    datetime: now,
                    organization_name: values.organizationId,
                    branch_name: values.branchId
                },
                assets: {
                    "data": {  // ✅ Generic key instead of filename
                        href: presignedUrl,  // ✅ S3 path from backend
                        type: "image/tiff; application=geotiff; profile=cloud-optimized",
                        title: currentFile.name,
                        roles: ["data"]
                    }
                },
                links: [
                    {
                        rel: "self",
                        href: `/api/v1/files/raster/${stacItemId}`
                    }
                ]
            };


            await FileService.completeRasterUpload(stacItem);


            message.success({ content: '✅ Raster uğurla yükləndi!', key: 'upload' });
            navigate('/rasters');

        } catch (error: any) {
            let errorMessage = 'Yükləmə xətası';

            if (error.status === 400 && error.data) {
                const validationErrors = Array.isArray(error.data)
                    ? error.data.map((e: any) => `${e.propertyName}: ${e.errorMessage}`).join('\n')
                    : error.data.message || JSON.stringify(error.data);

                errorMessage = `Validation xətası:\n${validationErrors}`;
            } else if (error.isNetworkError) {
                errorMessage = 'Server əlçatan deyil və ya CORS problemi var';
            } else if (error.message) {
                errorMessage = error.message;
            }

            message.error({
                content: `❌ ${errorMessage}`,
                key: 'upload',
                duration: 8
            });
        } finally {
            setLoading(false);
            setUploadProgress(0);
            setUploadStatus('');
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

            {uploadProgress > 0 && (
                <div style={{
                    marginBottom: 24,
                    padding: 20,
                    background: '#f6ffed',
                    border: '1px solid #b7eb8f',
                    borderRadius: 8
                }}>
                    <div style={{ marginBottom: 8, fontWeight: 500 }}>
                        {uploadStatus}
                    </div>
                    <Progress
                        percent={uploadProgress}
                        status="active"
                        strokeColor={{
                            '0%': '#108ee9',
                            '100%': '#52c41a',
                        }}
                    />
                    <div style={{ fontSize: 12, color: '#666', marginTop: 8 }}>
                        Böyük fayllar üçün bir neçə dəqiqə çəkə bilər. Zəhmət olmasa gözləyin...
                    </div>
                </div>
            )}

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