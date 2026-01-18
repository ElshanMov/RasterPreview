import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, Space, Typography, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';

import { PipelineService } from '../../services/pipeline.service';
import type { PipelineListItem, PipelineParamsType } from '../../types/pipeline.type';
import DataTable from '../../components/DataTable';
import { defaultPage, defaultPageSize } from '../../utils/pagination.util';
import PipelineTableColumns from '../pipeline/PipelineTableColumns';
import socket from '../../services/_socket';

const { Title } = Typography;

export default function Pipelines() {
  const navigate = useNavigate();
  const { organizationId, branchId } = useParams();

  const [items, setItems] = useState<PipelineListItem[]>([]);
  const [itemsCount, setItemsCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  const [params, setParams] = useState<PipelineParamsType>({
    OrganizationId: organizationId,
    BranchId: branchId,
    PipelineName: null,
    Page: defaultPage,
    PageSize: defaultPageSize,
  });

  const fetchPipelines = useCallback(async (currentParams: PipelineParamsType) => {
    try {
      setLoading(true);
      const response = await PipelineService.getPipelines(currentParams);
      const { items, itemsCount } = response.data;
      setItems(items);
      setItemsCount(itemsCount);
    } catch (error) {
      message.error("Məlumatlar yüklənərkən xəta baş verdi.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPipelines(params);
  }, [params, fetchPipelines]);

  useEffect(() => {
    socket.onPipelineSynchronized(() => {
      fetchPipelines(params);
    });

    return () => {
      socket.onPipelineSynchronized(() => {});
    };
  }, [params, fetchPipelines]);

  const handleRun = useCallback(async (id: string) => {
    try {
      await PipelineService.runPipeline(id);
      message.success("Pipeline başladıldı");
    } catch (error) {
      message.error("Xəta baş verdi");
    }
  }, []);

  const handleStop = useCallback(async (id: string) => {
    try {
      await PipelineService.stopPipeline(id);
      message.info("Pipeline dayandırıldı");
    } catch (error) {
      message.error("Xəta baş verdi");
    }
  }, []);

  const handleNavigate = useCallback((id: string) => {
    navigate(`/pipelines/${id}/runs`);
  }, [navigate]);

  const handleTableChange = useCallback((page: number, pageSize: number) => {
    setParams((prev) => ({
      ...prev,
      Page: page,
      PageSize: pageSize,
    }));
  }, []);

  return (
    <div>
      <Space 
        style={{ marginBottom: 16, justifyContent: "space-between", width: "100%" }}
        align="center"
      >
        <Title level={3} style={{ margin: 0 }}>📋 Pipelines</Title>
        <Button 
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => navigate(`/pipelines/new`)}
        >
          Upload
        </Button>
      </Space>

      <DataTable
        columns={PipelineTableColumns({
          handleRun,
          handleStop,
          handleNavigate
        })}
        data={items}
        loading={loading}
        totalCount={itemsCount}
        params={params}
        handleTableChange={handleTableChange}
      />
    </div>
  );
}