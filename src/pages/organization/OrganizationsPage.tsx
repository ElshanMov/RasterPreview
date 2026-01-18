import { useCallback, useEffect, useState } from 'react';
import 'antd/dist/reset.css';
import { OrganizationService } from '../../services/organization.service';
import type { OrganizationListItem, OrganizationParamsType } from '../../types/organization.type';
import DataTable from '../../components/DataTable';
import { defaultPage, defaultPageSize } from '../../utils/pagination.util';
import OrganizationTableColumns from './OrganizationTableColumns';
import { useNavigate } from 'react-router-dom';
import { Breadcrumb } from 'antd';

export default function Organizations() {
    const navigate = useNavigate();

    const [items, setItems] = useState<OrganizationListItem[]>([]);
    const [itemsCount, setItemsCount] = useState<number>(0);
    const [loading, setLoading] = useState(true);

    const [params, setParams] = useState<OrganizationParamsType>({
        Name: "",
        Code: "",
        Page: defaultPage,
        PageSize: defaultPageSize,
    });

    const getOrganizations = async (params: OrganizationParamsType) => {
        setLoading(true);

        OrganizationService.getOrganizations(params)
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
        navigate(`/organizations/${id}/branches`)
    }, []);

    const handleTableChange = (page: number, pageSize: number) => {
        setParams((prevState) => ({
            ...prevState,
            Page: page,
            PageSize: pageSize,
        }));
    };

    useEffect(() => {
        getOrganizations(params);
    }, []);

    return (
        <div>
            <div>
                <Breadcrumb
                    className="font-poppins font-semibold text-[26px] leading-[38px]"
                    items={[
                        {
                            title: 'Organizations',
                        },
                    ]}
                />
                <br />
            </div>

            <DataTable
                columns={OrganizationTableColumns({
                    handleView,
                })}
                data={items}
                loading={loading}
                totalCount={itemsCount}
                params={params}
                handleTableChange={handleTableChange}
            />
        </div>);
};