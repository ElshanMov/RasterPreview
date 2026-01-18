import { Typography, Space } from "antd";
import DataTable from "../../components/DataTable";
import PipelineRunTableColumns from "./PipelineRunTableColumns";
import { useNavigate, useParams } from "react-router-dom";
import { useCallback, useEffect, useState } from "react";
import type { PipelineRunListItem, PipelineRunParamsType } from "../../types/pipeline.run.type";
import { defaultPage, defaultPageSize } from "../../utils/pagination.util";
import socket from "../../services/_socket";
import { PipelineRunService } from "../../services/pipeline.run.service";

const { Title } = Typography;

export default function PipelineRunsPage() {
    const navigate = useNavigate();
    const { pipelineId } = useParams();

    const [items, setItems] = useState<PipelineRunListItem[]>([]);
    const [itemsCount, setItemsCount] = useState<number>(0);
    const [loading, setLoading] = useState(true);

    const [params, setParams] = useState<PipelineRunParamsType>({
        Page: defaultPage,
        PageSize: defaultPageSize,
    });

    const getPipelineRuns = async (params: PipelineRunParamsType) => {
        setLoading(true);

        PipelineRunService.getPipelineRuns(pipelineId, params)
            .then((response) => {
                const { items, itemsCount } = response.data;
                setItems(items);
                setItemsCount(itemsCount)
                setLoading(false);
            }).catch(() => {
                setLoading(false);
            });
    }

    const handleNavigate = useCallback((id: string) => {
        navigate(`/pipelines/runs/${id}/steps`)
    }, []);

    const handleTableChange = (page: number, pageSize: number) => {
        setParams((prevState) => ({
            ...prevState,
            Page: page,
            PageSize: pageSize,
        }));
    };

    useEffect(() => {
        getPipelineRuns(params);

        socket.onPipelineSynchronized(() => {
            getPipelineRuns(params);
        });

        return () => {
            socket.onPipelineSynchronized(() => {});
        };

    }, [params]);

    return (
        <div>
            <div>
                <Space style={{ marginBottom: 16, justifyContent: "space-between", width: "100%" }}>
                    <Title level={3}>📋 Pipelines / Runs</Title>
                </Space>
            </div>

            <DataTable
                columns={PipelineRunTableColumns({handleNavigate})}
                data={items}
                loading={loading}
                totalCount={itemsCount}
                params={params}
                handleTableChange={handleTableChange}
            />
        </div>
    );
}