import { Button } from "antd";
import { useNavigate } from "react-router-dom";
import { t } from 'i18next';

export default function NotFound() {
    const navigate = useNavigate();

    return (
        <div className="w-full h-full flex flex-col items-center justify-center text-center p-10">
            <h1 className="text-7xl font-extrabold text-blue-600">404</h1>
            <p className="text-2xl mt-4 opacity-80">{t("404-text")}</p>

            <Button
                type="primary"
                className="mt-8 px-8 py-5 rounded-xl text-lg"
                onClick={() => navigate("/")}
            >
                {t("return-home-page")}
            </Button>
        </div>
    );
}