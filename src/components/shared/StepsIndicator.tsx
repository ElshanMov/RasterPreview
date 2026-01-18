import React from 'react';
import { Typography } from 'antd';

const { Text } = Typography;

interface StepsIndicatorProps {
    steps: string[];
    currentStep: number;
    // ✅ Optional customization
    size?: 'small' | 'default' | 'large';
    showCheckIcon?: boolean;
    colorScheme?: {
        active: string;
        complete: string;
        wait: string;
    };
}

const StepsIndicator: React.FC<StepsIndicatorProps> = ({
    steps,
    currentStep,
    size = 'default',
    showCheckIcon = true,
    colorScheme = {
        active: '#1677ff',
        complete: '#52c41a',
        wait: '#f0f0f0'
    }
}) => {
    const sizes = {
        small: 32,
        default: 40,
        large: 48
    };

    return (
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 32, gap: 16 }}>
            {steps.map((label, idx) => {
                const step = idx + 1;
                const isActive = currentStep === step;
                const isComplete = step < currentStep;

                return (
                    <div key={step} style={{ textAlign: "center", flex: 1 }}>
                        <div style={{
                            width: sizes[size],
                            height: sizes[size],
                            borderRadius: "50%",
                            lineHeight: `${sizes[size]}px`,
                            margin: "0 auto",
                            background: isActive ? colorScheme.active : isComplete ? colorScheme.complete : colorScheme.wait,
                            color: isActive || isComplete ? "#fff" : "#999",
                            fontWeight: 700,
                            transition: "all 0.3s",
                            border: isActive ? "2px solid #bae7ff" : "none"
                        }}>
                            {isComplete && showCheckIcon ? "✓" : step}
                        </div>
                        <Text
                            strong={isActive}
                            style={{
                                fontSize: size === 'small' ? 11 : size === 'large' ? 14 : 12,
                                color: isActive ? colorScheme.active : "#999",
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
export default StepsIndicator;