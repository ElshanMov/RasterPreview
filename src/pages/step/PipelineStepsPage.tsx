import { Typography, Space } from "antd";
import DataTable from "../../components/DataTable";
import PipelineStepTableColumns from "./PipelineStepTableColumns";
import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import type { PipelineStepListItem, PipelineStepParamsType } from "../../types/pipeline.step.type";
import { defaultPage, defaultPageSize } from "../../utils/pagination.util";
import socket from "../../services/_socket";
import { PipelineStepService } from "../../services/pipeline.step.service";
import { PipelineRunService } from "../../services/pipeline.run.service";
import type { PipelineRun } from "../../types/pipeline.run.type";
import PipelineRunCard from "./parts/PipelineRunCard";

const { Title } = Typography;

export default function PipelineStepsPage() {
    const { pipelineRunId } = useParams();

    const [pipelineRun, setPipelineRun] = useState<PipelineRun | null>(null);
    const [items, setItems] = useState<PipelineStepListItem[]>([]);
    const [itemsCount, setItemsCount] = useState<number>(0);
    const [loading, setLoading] = useState(true);

    const [params, setParams] = useState<PipelineStepParamsType>({
        Page: defaultPage,
        PageSize: defaultPageSize,
    });

    const getPipelineRun = async (id: string | undefined) => {
        setLoading(true);

        PipelineRunService.getPipelineRun(id)
            .then((response) => {
                setPipelineRun(response.data);
                setLoading(false);
                console.log(pipelineRun)
            }).catch(() => {
                setLoading(false);
            });
    }

    const getPipelineSteps = async (params: PipelineStepParamsType) => {
        setLoading(true);

        PipelineStepService.getPipelineSteps(pipelineRunId, params)
            .then((response) => {
                const { items, itemsCount } = response.data;
                setItems(items);
                setItemsCount(itemsCount)
                setLoading(false);
            }).catch(() => {
                setLoading(false);
            });
    }

    const handleTableChange = (page: number, pageSize: number) => {
        setParams((prevState) => ({
            ...prevState,
            Page: page,
            PageSize: pageSize,
        }));
    };

    useEffect(() => {
        getPipelineRun(pipelineRunId)
        .then(() => {
            getPipelineSteps(params);
        });


        socket.onPipelineSynchronized(() => {
            getPipelineRun(pipelineRunId);
            getPipelineSteps(params);
        });

        return () => {
            socket.onPipelineSynchronized(() => { });
        };

    }, [pipelineRunId, params]);

    return (
        <div>
            <Space direction="vertical" size="middle" style={{ width: "100%", display: "flex" }}>
                <Title level={3}>📋 Pipelines / Runs / Steps</Title>

                {pipelineRun && (
                    <PipelineRunCard pipelineRun={pipelineRun} />
                )}

                <DataTable
                    columns={PipelineStepTableColumns()}
                    data={items}
                    loading={loading}
                    totalCount={itemsCount}
                    params={params}
                    handleTableChange={handleTableChange}
                />

            </Space>
        </div>
    );
}