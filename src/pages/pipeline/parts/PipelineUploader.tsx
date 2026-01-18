import { useEffect, useState } from "react";
import { Form, App } from "antd";
import { useGlobalLoading } from "../../../contexts/GlobalLoadingContext";
import { PipelineService } from "../../../services/pipeline.service";
import type { OrganizationSelectItem } from "../../../types/organization.type";
import { OrganizationService } from "../../../services/organization.service";
import type { BranchSelectItem } from "../../../types/branch.type";
import { BranchService } from "../../../services/branch.service";
import { useNavigate } from "react-router-dom";
import FileStep from "./FileStep";
import OrganizationStep from "./OrganizationStep";
import SummaryStep from "./SummaryStep";
import StepsIndicator from "../../../components/shared/StepsIndicator";
const STEPS = ["Təşkilat", "Fayl", "Təsdiq"];

export default function PipelineUploader() {
    const { message } = App.useApp();
    const { setLoading } = useGlobalLoading();
    const navigate = useNavigate();

    const [form] = Form.useForm();
    const [currentStep, setCurrentStep] = useState(1);


    const [organizationName, setOrganizationName] = useState<string | undefined>('');
    const [branchName, setBranchName] = useState<string | undefined>('');
    const [organizations, setOrganizations] = useState<OrganizationSelectItem[]>([]);
    const [branches, setBranches] = useState<BranchSelectItem[]>([]);

    const nextStep = () => setCurrentStep((prev) => Math.min(prev + 1, 3));
    const prevStep = () => setCurrentStep((prev) => Math.max(prev - 1, 1));

    const validateStep1 = async () => {
        try {
            await form.validateFields(['organizationId', 'branchId', 'scheduleInterval', 'ingestionMode']);
            return true;
        } catch (error) {
            message.warning("📌 Zəhmət olmasa bütün sahələri doldurun!");
            return false;
        }
    };

    const handleOrgStepNext = async () => {
        const isValid = await validateStep1();
        if (isValid) nextStep();
    };

    const handleSubmit = async (values: any) => {
        setLoading(true);

        const payload = {
            organizationId: values.organizationId,
            branchId: values.branchId,
            geometryType: values.geometryType,
            sourceSrid: values.sourceSrid,
            sourceName: values.sourceName,
            sourcePath: values.sourcePath,
            scheduleInterval: values.scheduleInterval,
            ingestionMode: values.ingestionMode,
            executionMode: values.executionMode,
            businessKeyColumns: values.businessKeyColumns,
            metadata: values.metadata,
            configVersion: values.configVersion
        };

        console.log(payload)

        PipelineService.createPipeline(payload)
            .then(() => {
                message.success("✅ Pipeline uğurla yaradıldı!");
                navigate('/pipelines');
            })
            .catch((error) => {
                message.error("❌ Pipeline yaradılarkən xəta baş verdi.", error);
            })
            .finally(() => setLoading(false));
    };

    const getOrganizations = async () => {
        OrganizationService.getAllOrganizations().then((res) => setOrganizations(res.data));
    };

    const getBranches = async (organizationId: string | undefined) => {
        BranchService.getAllBranches(organizationId).then((res) => setBranches(res.data));
    };

    useEffect(() => { getOrganizations(); }, []);

    return (
        <div style={{ maxWidth: 1000, margin: "0 auto", padding: "20px" }}>
            {/* Step Indicators */}
            <StepsIndicator
                steps={STEPS}
                currentStep={currentStep}
            />

            <Form
                form={form}
                preserve={true}
                layout="vertical"
                onFinish={handleSubmit}
                initialValues={{
                    executionMode: 0,
                    scheduleInterval: "@daily",
                    ingestionMode: "FULL"
                }}
            >
                {/* Step 1: Təşkilat Məlumatları */}
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

                {/* Step 2: Fayl Yükləmə və Analiz */}
                <div hidden={currentStep !== 2}>
                    <FileStep
                        form={form}
                        organizationName={organizationName}
                        setLoading={setLoading}
                        onNext={nextStep}
                        onPrev={prevStep}
                    />
                </div>

                {/* Step 3: Xülasə & Təsdiq */}
                <div hidden={currentStep !== 3}>
                    <>
                        <SummaryStep
                            form={form}
                            organizationName={organizationName}
                            branchName={branchName}
                            onPrev={prevStep}
                        />
                    </>
                </div>
            </Form>
        </div>
    );
}