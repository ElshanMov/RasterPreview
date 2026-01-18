import { useCallback, useEffect, useState } from 'react';
import 'antd/dist/reset.css';
import { BranchService } from '../../services/branch.service';
import type { BranchListItem, BranchParamsType } from '../../types/branch.type';
import DataTable from '../../components/DataTable';
import { defaultPage, defaultPageSize } from '../../utils/pagination.util';
import BranchTableColumns from './BranchTableColumns';
import { useNavigate, useParams } from 'react-router-dom';
import { Breadcrumb } from 'antd';

export default function Branchs() {
    const { organizationId } = useParams();
    const navigate = useNavigate();

    const [items, setItems] = useState<BranchListItem[]>([]);
    const [itemsCount, setItemsCount] = useState<number>(0);
    const [loading, setLoading] = useState(true);

    const [params, setParams] = useState<BranchParamsType>({
        Name: "",
        Code: "",
        Page: defaultPage,
        PageSize: defaultPageSize,
    });

    const getBranchs = async (organizationId: string | undefined, params: BranchParamsType) => {
        setLoading(true);

        BranchService.getBranches(organizationId, params)
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
        navigate(`/organizations/${organizationId}/branches/${id}/pipelines`)
    }, []);

    const handleTableChange = (page: number, pageSize: number) => {
        setParams((prevState) => ({
            ...prevState,
            Page: page,
            PageSize: pageSize,
        }));
    };

    useEffect(() => {
        getBranchs(organizationId, params);
    }, []);

    return (
        <div>
            <div>
                <Breadcrumb
                    className="font-poppins font-semibold text-[26px] leading-[38px]"
                    items={[
                        {
                            title: 'Organizations > Branches',
                        },
                    ]}
                />
                <br />
            </div>

            <DataTable
                columns={BranchTableColumns({
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