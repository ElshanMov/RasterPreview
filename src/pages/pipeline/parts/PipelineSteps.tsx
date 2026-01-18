import React from 'react';
import { Typography } from 'antd';

const { Text } = Typography;

interface PipelineStepsProps {
    steps: string[];
    currentStep: number;
}

const PipelineSteps: React.FC<PipelineStepsProps> = ({ steps, currentStep }) => {
    return (
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 32, gap: 16 }}>
            {steps.map((label, idx) => {
                const step = idx + 1;
                const isActive = currentStep === step;
                const isComplete = step < currentStep;

                return (
                    <div key={step} style={{ textAlign: "center", flex: 1 }}>
                        <div style={{
                            width: 40,
                            height: 40,
                            borderRadius: "50%",
                            lineHeight: "40px",
                            margin: "0 auto",
                            background: isActive ? "#1677ff" : isComplete ? "#52c41a" : "#f0f0f0",
                            color: isActive || isComplete ? "#fff" : "#999",
                            fontWeight: 700,
                            transition: "all 0.3s",
                            border: isActive ? "2px solid #bae7ff" : "none"
                        }}>
                            {isComplete ? "✓" : step}
                        </div>
                        <Text 
                            strong={isActive} 
                            style={{ 
                                fontSize: 12, 
                                color: isActive ? "#1677ff" : "#999",
                                display: "block",
                                marginTop: 8
                            }}
                        >
                            {label}
                        </Text>
                    </div>
                );
            })}
        </div>
    );
};

export default PipelineSteps;