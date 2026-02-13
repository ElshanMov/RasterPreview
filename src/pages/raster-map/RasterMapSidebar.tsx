// src/pages/raster-map/RasterMapSidebar.tsx

import React from 'react';
import {
    Button,
    DatePicker,
    Select,
    Space,
    Typography,
    Divider,
    Card,
    Tag,
    Empty,
    Spin,
    Badge,
} from 'antd';
import {
    SearchOutlined,
    ClearOutlined,
    AimOutlined,
    CalendarOutlined,
    FolderOutlined,
    EnvironmentOutlined,
    FilterOutlined,
    PictureOutlined,
    NodeIndexOutlined,
} from '@ant-design/icons';
import type {
    RasterFilterParams,
    BboxCoords,
    StacItem,
    StacCollection,
} from '../../types/raster.map.type';
import RasterThumbnail from '../../components/RasterThumbnail';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

interface RasterMapSidebarProps {
    filters: RasterFilterParams;
    collections: StacCollection[];
    collectionsLoading: boolean;
    onFilterChange: (filters: Partial<RasterFilterParams>) => void;
    onSearch: () => void;
    onClear: () => void;
    onDrawBbox: () => void;
    isDrawingBbox: boolean;
    loading: boolean;
    results: StacItem[];
    totalMatched: number;
    onItemSelect: (item: StacItem) => void;
    selectedItem: StacItem | null;
}

const RasterMapSidebar: React.FC<RasterMapSidebarProps> = ({
    filters,
    collections,
    collectionsLoading,
    onFilterChange,
    onSearch,
    onClear,
    onDrawBbox,
    isDrawingBbox,
    loading,
    results,
    totalMatched,
    onItemSelect,
    selectedItem,
}) => {
    const formatBbox = (bbox: BboxCoords | null): string => {
        if (!bbox) return 'Seçilməyib';
        return `${bbox.minLng.toFixed(4)}, ${bbox.minLat.toFixed(4)} → ${bbox.maxLng.toFixed(4)}, ${bbox.maxLat.toFixed(4)}`;
    };

    const activeFilterCount = [
        filters.bbox,
        filters.dateRange,
        filters.collections.length > 0,
    ].filter(Boolean).length;

    return (
        <div style={{ padding: 16, height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <div style={{ marginBottom: 16 }}>
                <Title level={5} style={{ margin: 0, marginBottom: 4 }}>
                    <FilterOutlined /> STAC Axtarış
                </Title>
                <Text type="secondary" style={{ fontSize: 12 }}>
                    Bbox çəkin — avtomatik axtarış başlayacaq
                </Text>
            </div>

            {/* Filters */}
            <div style={{ flex: 1, overflow: 'auto', marginBottom: 16 }}>

                {/* Bbox */}
                <div style={{ marginBottom: 16 }}>
                    <Text strong style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>
                        <EnvironmentOutlined /> Ərazi (Bbox)
                    </Text>
                    <Button
                        icon={<AimOutlined />}
                        onClick={onDrawBbox}
                        block
                        type={isDrawingBbox ? 'primary' : 'default'}
                        danger={isDrawingBbox}
                    >
                        {isDrawingBbox ? '🎯 Çəkmə modunda — xəritədə çəkin' : 'Xəritədə ərazi seçin'}
                    </Button>
                    {filters.bbox && (
                        <div style={{ marginTop: 8 }}>
                            <Tag
                                color="blue"
                                closable
                                onClose={() => onFilterChange({ bbox: null })}
                            >
                                📍 {formatBbox(filters.bbox)}
                            </Tag>
                        </div>
                    )}
                </div>

                {/* Date Range */}
                <div style={{ marginBottom: 16 }}>
                    <Text strong style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>
                        <CalendarOutlined /> Tarix aralığı
                    </Text>
                    <RangePicker
                        style={{ width: '100%' }}
                        value={filters.dateRange ? [
                            dayjs(filters.dateRange[0]),
                            dayjs(filters.dateRange[1])
                        ] : null}
                        onChange={(dates) => {
                            if (dates && dates[0] && dates[1]) {
                                onFilterChange({ 
                                    dateRange: [
                                        dates[0].toISOString(),
                                        dates[1].toISOString()
                                    ]
                                });
                            } else {
                                onFilterChange({ dateRange: null });
                            }
                        }}
                        placeholder={['Başlanğıc', 'Son']}
                    />
                </div>

                {/* Collection */}
                <div style={{ marginBottom: 16 }}>
                    <Text strong style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>
                        <FolderOutlined /> Kolleksiya
                    </Text>
                    <Select
                        mode="multiple"
                        style={{ width: '100%' }}
                        placeholder="Kolleksiya seçin"
                        value={filters.collections}
                        onChange={(value) => onFilterChange({ collections: value })}
                        loading={collectionsLoading}
                        allowClear
                        maxTagCount={2}
                        options={collections.map(c => ({
                            label: c.title || c.id,
                            value: c.id,
                        }))}
                    />
                </div>
            </div>

            {/* Action buttons */}
            <Space direction="vertical" style={{ width: '100%' }}>
                <Button
                    type="primary"
                    icon={<SearchOutlined />}
                    onClick={onSearch}
                    loading={loading}
                    block
                    size="large"
                    disabled={!filters.bbox}
                >
                    Yenidən Axtar
                    {activeFilterCount > 0 && (
                        <Badge
                            count={activeFilterCount}
                            style={{ marginLeft: 8, backgroundColor: '#52c41a' }}
                        />
                    )}
                </Button>
                <Button
                    icon={<ClearOutlined />}
                    onClick={onClear}
                    block
                >
                    Filterləri təmizlə
                </Button>
            </Space>

            <Divider style={{ margin: '16px 0' }} />

            {/* Results */}
            <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <Title level={5} style={{ margin: 0 }}>
                        Nəticələr
                    </Title>
                    {totalMatched > 0 && (
                        <Tag color="blue">{results.length} / {totalMatched}</Tag>
                    )}
                </div>

                {loading ? (
                    <div style={{ textAlign: 'center', padding: 40 }}>
                        <Spin />
                    </div>
                ) : results.length === 0 ? (
                    <Empty
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        description={
                            filters.bbox
                                ? 'Nəticə tapılmadı'
                                : 'Axtarış üçün xəritədə ərazi seçin'
                        }
                    />
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {results.map((item) => {
                            const isRaster = item.properties.data_type === 'Raster';
                            const isSelected = selectedItem?.id === item.id;

                            if (isRaster) {
                                return (
                                    <Card
                                        key={item.id}
                                        size="small"
                                        hoverable
                                        style={{
                                            border: isSelected
                                                ? '2px solid #1677ff'
                                                : '1px solid #f0f0f0',
                                            background: isSelected ? '#e6f4ff' : undefined,
                                            overflow: 'hidden',
                                        }}
                                        styles={{ body: { padding: 0 } }}
                                    >
                                        <RasterThumbnail
                                            item={item}
                                            isSelected={isSelected}
                                            onClick={() => onItemSelect(item)}
                                        />
                                        <div style={{ padding: '10px 12px' }}>
                                            <div style={{ fontSize: 11, color: '#666', marginBottom: 6 }}>
                                                <CalendarOutlined /> {dayjs(item.properties.datetime).format('DD.MM.YYYY HH:mm')}
                                            </div>
                                            <Space size={4} wrap>
                                                <Tag color="blue" style={{ fontSize: 10, margin: 0 }}>
                                                    <PictureOutlined /> Raster
                                                </Tag>
                                                {item.collection && (
                                                    <Tag style={{ fontSize: 10, margin: 0 }}>
                                                        {item.collection.length > 15
                                                            ? item.collection.substring(0, 15) + '...'
                                                            : item.collection}
                                                    </Tag>
                                                )}
                                            </Space>
                                        </div>
                                    </Card>
                                );
                            }

                            // Vector / digər
                            return (
                                <Card
                                    key={item.id}
                                    size="small"
                                    hoverable
                                    onClick={() => onItemSelect(item)}
                                    style={{
                                        border: isSelected
                                            ? '2px solid #1677ff'
                                            : '1px solid #f0f0f0',
                                        background: isSelected ? '#e6f4ff' : undefined,
                                    }}
                                >
                                    <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 4 }}>
                                        {item.properties.title || item.id}
                                    </div>
                                    <div style={{ fontSize: 11, color: '#666', marginBottom: 6 }}>
                                        <CalendarOutlined /> {dayjs(item.properties.datetime).format('DD.MM.YYYY HH:mm')}
                                    </div>
                                    <Space size={4} wrap>
                                        <Tag color="purple" style={{ fontSize: 10, margin: 0 }}>
                                            <NodeIndexOutlined /> {item.properties.data_type || 'Unknown'}
                                        </Tag>
                                        {item.collection && (
                                            <Tag style={{ fontSize: 10, margin: 0 }}>{item.collection}</Tag>
                                        )}
                                        {item.properties.feature_count && (
                                            <Tag style={{ fontSize: 10, margin: 0 }}>
                                                {item.properties.feature_count.toLocaleString()} features
                                            </Tag>
                                        )}
                                    </Space>
                                </Card>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default RasterMapSidebar;