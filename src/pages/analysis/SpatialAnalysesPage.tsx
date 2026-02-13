import { useCallback, useEffect, useState } from 'react';
import 'antd/dist/reset.css';
import { SpatialAnalysisService } from '../../services/analysis.service';
import type { SpatialAnalysisListItem, SpatialAnalysisParamsType } from '../../types/analysis.type';
import DataTable from '../../components/DataTable';
import { defaultPage, defaultPageSize } from '../../utils/pagination.util';
import SpatialAnalysisTableColumns from './SpatialAnalysisTableColumns';
import { useNavigate } from 'react-router-dom';
import { Breadcrumb } from 'antd';

export default function SpatialAnalyses() {
    //const { organizationId } = useParams();
    const navigate = useNavigate();

    const [items, setItems] = useState<SpatialAnalysisListItem[]>([]);
    const [itemsCount, setItemsCount] = useState<number>(0);
    const [loading, setLoading] = useState(true);

    const [params, setParams] = useState<SpatialAnalysisParamsType>({
        Name: null,
        Type: null,
        Description: null,
        Page: defaultPage,
        PageSize: defaultPageSize,
    });

    const getSpatialAnalyses = async (params: SpatialAnalysisParamsType) => {
        setLoading(true);

        SpatialAnalysisService.getSpatialAnalyses(params)
            .then((response) => {
                const { items, itemsCount } = response.data;
                setItems(items);
                setItemsCount(itemsCount)
                setLoading(false);
            }).catch(() => {
                setLoading(false);
            });
    }

    const handleView = useCallback((id: string) => {
        navigate(`/spatial-analyses/${id}/details`)
    }, []);

    const handleTableChange = (page: number, pageSize: number) => {
        setParams((prevState) => ({
            ...prevState,
            Page: page,
            PageSize: pageSize,
        }));
    };

    useEffect(() => {
        getSpatialAnalyses(params);
    }, []);

    return (
        <div>
            <div>
                <Breadcrumb
                    className="font-poppins font-semibold text-[26px] leading-[38px]"
                    items={[
                        {
                            title: 'Organizations > SpatialAnalysises',
                        },
                    ]}
                />
                <br />
            </div>

            <DataTable
                columns={SpatialAnalysisTableColumns({
                    handleView,
                })}
                data={items}
                loading={loading}
                totalCount={itemsCount}
                params={params}
                handleTableChange={handleTableChange}
            />
        </div>
    );
};