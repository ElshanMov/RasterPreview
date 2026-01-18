import { Table, Pagination } from 'antd';
import { pageSizes } from '../utils/pagination.util';
import { t } from 'i18next';

const DataTable = ({
    columns,
    data,
    loading,
    totalCount,
    params,
    handleTableChange,
    onRowDoubleClick,
    tableSize,
    tableHeightSize,
    rowSelection,
    expandable,
}: any) => {
    const handleRowDoubleClick = (record: any) => {
        if (onRowDoubleClick) {
            onRowDoubleClick(record);
        }
    };

    const modifiedColumns = [
        {
            title: (
                <span className="font-poppins font-semibold text-[12px] leading-[16px]">
                    №
                </span>
            ),
            dataIndex: "rowNumber",
            render: (_text: any, _record: any, index: number) => {
                return params ? (params?.Page - 1) * params?.PageSize + index + 1 + "." : index + 1 + ".";
            },
            width: 50,
            align: "center",
        },
        ...columns.map((col: any) => ({
            ...col,
            title: (
                <span className="font-poppins font-semibold text-[12px] leading-[16px]">
                    {col.title}
                </span>
            ),
        })),
    ];

    return (
        <>
            <div className="relative flex flex-col">
                <div
                    className="flex-1 min-h-[165px] overflow-y-auto border-t border-l border-r border-[#C3C9D2] rounded-t-2xl"
                    style={{
                        minHeight: tableHeightSize || data.length === 0 ? undefined : 450,
                        maxHeight: 450,
                    }}
                >
                    <Table
                        loading={loading}
                        columns={modifiedColumns}
                        dataSource={data}
                        rowKey={(record) => record.id}
                        pagination={false}
                        rowSelection={rowSelection}
                        expandable={expandable}
                        onRow={(record) => ({
                            onDoubleClick: () => handleRowDoubleClick(record),
                        })}
                        locale={{
                            emptyText: t("no-data"),
                        }}
                        size={tableSize}
                        scroll={{ x: "max-content" }}
                        rowClassName={(_, index) =>
                            `${index % 2 === 0 ? "table-row-light" : "table-row-dark"
                            } font-poppins font-normal text-[12px] leading-[16px] text-[#525967]`
                        }
                    />
                </div>

                {handleTableChange && (
                    <div className="flex justify-between items-center border-t rounded-b-2xl p-3 bg-[#d7dde6]">
                        <div className="text-base">
                            <span className='font-poppins text-[14px] text-black font-medium leading-[16px]'>
                                {Math.ceil(totalCount / params.PageSize)} {t('page')}
                            </span>
                        </div>

                        <Pagination
                            total={totalCount}
                            current={params.Page}
                            pageSize={params.PageSize}
                            pageSizeOptions={pageSizes}
                            onChange={(page, pageSize) =>
                                handleTableChange(page, pageSize)
                            }
                            itemRender={(page, type, originalElement) => {
                                if (type === "page") {
                                    const isActive = page === params.Page;
                                    return (
                                        <div
                                            style={{
                                                borderRadius: isActive ? "50%" : "none",
                                                backgroundColor: isActive ? "#0072DB" : "transparent",
                                                color: isActive ? "white" : "black",
                                                fontSize: isActive ? 14 : 14,
                                                fontWeight: "bold",
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                            }}
                                        >
                                            {page}
                                        </div>
                                    );
                                }
                                if (type === "prev" || type === "next") {
                                    return null;
                                }
                                return originalElement;
                            }}
                        />

                    </div>
                )}
            </div>
        </>
    );
};


export default DataTable;