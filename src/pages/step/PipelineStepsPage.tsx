import { Typography, Space } from "antd";
import DataTable from "../../components/DataTable";
import PipelineStepTableColumns from "./PipelineStepTableColumns";
import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import type { PipelineStepListItem, PipelineStepParamsType } from "../../types/pipeline.step.type";
import { defaultPage, defaultPageSize } from "../../utils/pagination.util";
import socket from "../../services/_socket";
import { PipelineStepService } from "../../services/pipeline.step.service";

const { Title } = Typography;

export default function PipelineStepsPage() {
    const { pipelineRunId } = useParams();

    const [items, setItems] = useState<PipelineStepListItem[]>([]);
    const [itemsCount, setItemsCount] = useState<number>(0);
    const [loading, setLoading] = useState(true);

    const [params, setParams] = useState<PipelineStepParamsType>({
            Page: defaultPage,
            PageSize: defaultPageSize,
        });

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
        getPipelineSteps(params);

        socket.onPipelineSynchronized(() => {
            getPipelineSteps(params);
        });

        return () => {
            socket.onPipelineSynchronized(() => {});
        };

    }, [params]);

    return (
        <div>
            <div>
                <Space style={{ marginBottom: 16, justifyContent: "space-between", width: "100%" }}>
                    <Title level={3}>📋 Pipelines / Runs / Steps</Title>
                </Space>
            </div>
            
            <DataTable
                columns={PipelineStepTableColumns()}
                data={items}
                loading={loading}
                totalCount={itemsCount}
                params={params}
                handleTableChange={handleTableChange}
            />
        </div>
    );
}