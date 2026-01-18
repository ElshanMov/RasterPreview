import type { FC } from "react";

interface StatItemProps {
    label: string;
    value: number | string;
    color?: string;
    align?: "left" | "center" | "right";
}

const StatItem: FC<StatItemProps> = ({
    label,
    value,
    color = "#111827",
    align = "center",
}) => {
    return (
        <div style={{ textAlign: align }}>
            <div
                style={{
                    fontSize: 12,
                    color: "#6b7280",
                    marginBottom: 4,
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                }}
            >
                {label}
            </div>

            <div
                style={{
                    fontSize: 22,
                    fontWeight: 700,
                    color,
                }}
            >
                {value}
            </div>
        </div>
    );
};

export default StatItem;