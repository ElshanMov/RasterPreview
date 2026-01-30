import React, { useState, useEffect } from 'react';
import { 
    Input, 
    Button, 
    DatePicker, 
    Select, 
    Slider, 
    Space, 
    Typography, 
    Divider,
    Card,
    Tag,
    Empty,
    Spin,
    Tooltip,
    Collapse,
    InputNumber,
    Badge,
    Segmented
} from 'antd';
import { 
    SearchOutlined, 
    ClearOutlined, 
    AimOutlined,
    CalendarOutlined,
    CloudOutlined,
    FolderOutlined,
    EnvironmentOutlined,
    CheckCircleOutlined,
    FilterOutlined,
    SortAscendingOutlined,
    ExpandAltOutlined,
    AppstoreOutlined,
    PictureOutlined,
    NodeIndexOutlined,
    EyeOutlined,
    LoadingOutlined
} from '@ant-design/icons';
import type { 
    RasterFilterParams, 
    BboxCoords, 
    StacItem, 
    StacCollection,
    SortBy,
    DataType
} from '../../types/raster.map.type';
import dayjs from 'dayjs';

// ============================================================================
// ✅ DÜZƏLDİLMİŞ TiTiler URL konfiqurasiyası
// ============================================================================
// Development: /titiler-api → Vite proxy → https://tiles.mmdev.az/tiles
// Production:  https://tiles.mmdev.az/tiles
const TITILER_BASE = import.meta.env.DEV ? '/titiler-api' : 'https://tiles.mmdev.az/tiles';

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

const SORT_OPTIONS = [
    { value: 'datetime:desc', label: 'Tarix (Yenidən köhnəyə)' },
    { value: 'datetime:asc', label: 'Tarix (Köhnədən yeniyə)' },
    { value: 'eo:cloud_cover:asc', label: 'Bulud (Az → Çox)' },
    { value: 'eo:cloud_cover:desc', label: 'Bulud (Çox → Az)' },
];

const DATA_TYPE_OPTIONS = [
    { value: 'all', label: 'Hamısı', icon: <AppstoreOutlined /> },
    { value: 'raster', label: 'Raster', icon: <PictureOutlined /> },
    { value: 'vector', label: 'Vector', icon: <NodeIndexOutlined /> }
];

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
    selectedItem
}) => {
    const formatBbox = (bbox: BboxCoords | null): string => {
        if (!bbox) return 'Seçilməyib';
        return `${bbox.minLng.toFixed(4)}, ${bbox.minLat.toFixed(4)} → ${bbox.maxLng.toFixed(4)}, ${bbox.maxLat.toFixed(4)}`;
    };

    const handleSortChange = (value: string) => {
        const [field, direction] = value.split(':');
        onFilterChange({ 
            sortBy: { field, direction: direction as 'asc' | 'desc' } 
        });
    };

    const getSortValue = (sortBy: SortBy | null): string => {
        if (!sortBy) return 'datetime:desc';
        return `${sortBy.field}:${sortBy.direction}`;
    };

    const activeFilterCount = [
        filters.bbox,
        filters.dateRange,
        filters.collections.length > 0,
        filters.ids,
        filters.dataType !== 'all',
        filters.cloudCover !== null,
        filters.resolution !== null
    ].filter(Boolean).length;

    // S3 URL-dən fayl adını çıxar (backend böyük hərflə qaytarır: Href)
    const getAssetFileName = (item: StacItem): string | null => {
        const dataAsset = item.assets?.data;
        const href = dataAsset?.Href || dataAsset?.href || 
                    item.assets?.image?.Href || item.assets?.image?.href;
        if (!href) return null;
        const parts = href.split('/');
        return parts[parts.length - 1] || null;
    };

    // COG URL əldə et
    const getCogUrl = (item: StacItem): string | null => {
        const dataAsset = item.assets?.data;
        return dataAsset?.Href || dataAsset?.href || 
               item.assets?.image?.Href || item.assets?.image?.href || null;
    };

    // ========================================================================
    // ✅ DÜZƏLDİLMİŞ Raster Thumbnail komponenti
    // ========================================================================
    const RasterThumbnail: React.FC<{ 
        item: StacItem; 
        isSelected: boolean;
        onClick: () => void;
    }> = ({ item, isSelected, onClick }) => {
        const [imageLoading, setImageLoading] = useState(true);
        const [imageError, setImageError] = useState(false);
        const [previewUrl, setPreviewUrl] = useState<string | null>(null);
        
        const cogUrl = getCogUrl(item);

        // Preview URL-ni statistics ilə yarat
        useEffect(() => {
            if (!cogUrl) {
                setImageError(true);
                return;
            }

            const loadPreview = async () => {
                setImageLoading(true);
                setImageError(false);
                
                try {
                    // ✅ DÜZƏLDİLMİŞ URL: /titiler-api/cog/statistics
                    const statsUrl = `${TITILER_BASE}/cog/statistics?url=${encodeURIComponent(cogUrl)}`;
                    console.log('📊 Preview statistics URL:', statsUrl);
                    
                    const statsResponse = await fetch(statsUrl);
                    
                    if (!statsResponse.ok) {
                        throw new Error(`Statistics error: ${statsResponse.status}`);
                    }
                    
                    const stats = await statsResponse.json();
                    console.log('✅ Statistics loaded for preview:', item.id);
                    
                    // Preview URL yarat rescale ilə
                    const params = new URLSearchParams();
                    params.append('url', cogUrl);
                    params.append('max_size', '256');
                    
                    // İlk 3 band və onların rescale dəyərləri
                    const bands = ['b1', 'b2', 'b3'];
                    bands.forEach((band, index) => {
                        params.append('bidx', String(index + 1));
                        if (stats[band]) {
                            const low = Math.floor(stats[band].percentile_2 || 0);
                            const high = Math.ceil(stats[band].percentile_98 || 255);
                            params.append('rescale', `${low},${high}`);
                        } else {
                            params.append('rescale', '0,255');
                        }
                    });
                    
                    // ✅ DÜZƏLDİLMİŞ URL: /titiler-api/cog/preview.png
                    const url = `${TITILER_BASE}/cog/preview.png?${params.toString()}`;
                    console.log('🖼️ Preview URL:', url);
                    setPreviewUrl(url);
                    
                } catch (error) {
                    console.warn('Statistics yüklənmədi, fallback istifadə edilir:', error);
                    
                    // Fallback - default rescale ilə
                    const params = new URLSearchParams();
                    params.append('url', cogUrl);
                    params.append('max_size', '256');
                    params.append('bidx', '1');
                    params.append('bidx', '2');
                    params.append('bidx', '3');
                    params.append('rescale', '0,500');
                    params.append('rescale', '0,700');
                    params.append('rescale', '0,800');
                    
                    // ✅ DÜZƏLDİLMİŞ URL
                    setPreviewUrl(`${TITILER_BASE}/cog/preview.png?${params.toString()}`);
                }
            };

            loadPreview();
        }, [cogUrl, item.id]);

        return (
            <div 
                onClick={onClick}
                style={{ 
                    cursor: 'pointer',
                    position: 'relative',
                    width: '100%',
                    height: 120,
                    borderRadius: 8,
                    overflow: 'hidden',
                    background: '#f5f5f5',
                    border: isSelected ? '3px solid #1677ff' : '1px solid #e8e8e8',
                    transition: 'all 0.2s ease'
                }}
            >
                {previewUrl && !imageError ? (
                    <>
                        {imageLoading && (
                            <div style={{
                                position: 'absolute',
                                inset: 0,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                            }}>
                                <LoadingOutlined style={{ fontSize: 24, color: 'white' }} />
                            </div>
                        )}
                        <img
                            src={previewUrl}
                            alt={item.properties.title || item.id}
                            style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                                display: imageLoading ? 'none' : 'block'
                            }}
                            onLoad={() => setImageLoading(false)}
                            onError={() => {
                                console.error('Preview image load error for:', item.id);
                                setImageLoading(false);
                                setImageError(true);
                            }}
                        />
                    </>
                ) : !previewUrl && !imageError ? (
                    <div style={{
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                    }}>
                        <LoadingOutlined style={{ fontSize: 24, color: 'white' }} />
                    </div>
                ) : (
                    <div style={{
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                    }}>
                        <PictureOutlined style={{ fontSize: 32, color: 'rgba(255,255,255,0.5)' }} />
                    </div>
                )}

                {/* Overlay with title */}
                <div style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    padding: '8px',
                    background: 'linear-gradient(transparent, rgba(0,0,0,0.7))',
                    color: 'white'
                }}>
                    <div style={{ 
                        fontSize: 11, 
                        fontWeight: 600,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                    }}>
                        {item.properties.title || getAssetFileName(item) || item.id}
                    </div>
                </div>

                {/* Selected indicator */}
                {isSelected && (
                    <div style={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        background: '#1677ff',
                        borderRadius: '50%',
                        width: 24,
                        height: 24,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <EyeOutlined style={{ color: 'white', fontSize: 12 }} />
                    </div>
                )}
            </div>
        );
    };

    return (
        <div style={{ padding: 16, height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <div style={{ marginBottom: 16 }}>
                <Title level={5} style={{ margin: 0, marginBottom: 4 }}>
                    <FilterOutlined /> STAC Axtarış
                </Title>
                <Text type="secondary" style={{ fontSize: 12 }}>
                    Bbox çəkin - avtomatik axtarış başlayacaq
                </Text>
            </div>

            {/* Filters */}
            <div style={{ flex: 1, overflow: 'auto', marginBottom: 16 }}>
                
                {/* Data Type Filter */}
                <div style={{ marginBottom: 16 }}>
                    <Text strong style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>
                        <AppstoreOutlined /> Data Növü
                    </Text>
                    <Segmented
                        block
                        value={filters.dataType}
                        onChange={(value) => onFilterChange({ dataType: value as DataType })}
                        options={DATA_TYPE_OPTIONS.map(opt => ({
                            value: opt.value,
                            label: (
                                <Space size={4}>
                                    {opt.icon}
                                    <span>{opt.label}</span>
                                </Space>
                            )
                        }))}
                        style={{ width: '100%' }}
                    />
                    {filters.dataType !== 'all' && (
                        <div style={{ marginTop: 8 }}>
                            <Tag 
                                color={filters.dataType === 'raster' ? 'blue' : 'purple'}
                                closable
                                onClose={() => onFilterChange({ dataType: 'all' })}
                            >
                                {filters.dataType === 'raster' ? (
                                    <><PictureOutlined /> Yalnız Raster</>
                                ) : (
                                    <><NodeIndexOutlined /> Yalnız Vector</>
                                )}
                            </Tag>
                        </div>
                    )}
                </div>

                {/* IDs Search */}
                <div style={{ marginBottom: 16 }}>
                    <Text strong style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>
                        <SearchOutlined /> ID ilə axtarış
                    </Text>
                    <Input
                        placeholder="ID-ləri vergüllə ayırın..."
                        value={filters.ids}
                        onChange={(e) => onFilterChange({ ids: e.target.value })}
                        allowClear
                    />
                </div>

                {/* Bbox */}
                <div style={{ marginBottom: 16 }}>
                    <Text strong style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>
                        <EnvironmentOutlined /> Ərazi (Bbox) - Avtomatik axtarış
                    </Text>
                    <div style={{ 
                        padding: 12, 
                        background: filters.bbox ? '#f6ffed' : '#fafafa', 
                        borderRadius: 8,
                        border: `1px solid ${filters.bbox ? '#b7eb8f' : '#d9d9d9'}`
                    }}>
                        <div style={{ 
                            fontSize: 11, 
                            fontFamily: 'monospace', 
                            marginBottom: 8,
                            color: filters.bbox ? '#52c41a' : '#999'
                        }}>
                            {formatBbox(filters.bbox)}
                        </div>
                        <Space>
                            <Button 
                                size="small"
                                type={isDrawingBbox ? 'primary' : 'default'}
                                icon={<AimOutlined />}
                                onClick={onDrawBbox}
                                danger={isDrawingBbox}
                            >
                                {isDrawingBbox ? 'Çəkmə rejimi...' : 'Xəritədə seç'}
                            </Button>
                            {filters.bbox && (
                                <Button 
                                    size="small"
                                    danger
                                    onClick={() => onFilterChange({ bbox: null })}
                                >
                                    Təmizlə
                                </Button>
                            )}
                        </Space>
                        {filters.bbox && (
                            <div style={{ marginTop: 8, fontSize: 11, color: '#52c41a' }}>
                                ✓ Bbox seçildi - axtarış avtomatik başladı
                            </div>
                        )}
                    </div>
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

                {/* Collections */}
                <div style={{ marginBottom: 16 }}>
                    <Text strong style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>
                        <FolderOutlined /> Kolleksiyalar
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
                            value: c.id
                        }))}
                    />
                </div>

                {/* Advanced Filters */}
                <Collapse 
                    ghost
                    items={[
                        {
                            key: 'advanced',
                            label: (
                                <Text strong style={{ fontSize: 12 }}>
                                    <ExpandAltOutlined /> Əlavə filterlər
                                </Text>
                            ),
                            children: (
                                <>
                                    {/* Cloud Cover */}
                                    <div style={{ marginBottom: 16 }}>
                                        <Text style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>
                                            <CloudOutlined /> Bulud örtüyü (maks %)
                                            {filters.dataType === 'vector' && (
                                                <Tag color="orange" style={{ marginLeft: 8, fontSize: 10 }}>
                                                    Vector üçün keçərli deyil
                                                </Tag>
                                            )}
                                        </Text>
                                        <Slider
                                            min={0}
                                            max={100}
                                            value={filters.cloudCover ?? 100}
                                            onChange={(value) => onFilterChange({ cloudCover: value })}
                                            marks={{ 0: '0%', 50: '50%', 100: '100%' }}
                                            disabled={filters.dataType === 'vector'}
                                        />
                                    </div>

                                    {/* Resolution */}
                                    <div style={{ marginBottom: 16 }}>
                                        <Text style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>
                                            Rezolyusiya (GSD, metr)
                                        </Text>
                                        <Space>
                                            <InputNumber
                                                size="small"
                                                placeholder="Min"
                                                min={0}
                                                value={filters.resolution?.[0]}
                                                onChange={(val) => onFilterChange({ 
                                                    resolution: [val || 0, filters.resolution?.[1] || 100] 
                                                })}
                                                style={{ width: 80 }}
                                            />
                                            <span>-</span>
                                            <InputNumber
                                                size="small"
                                                placeholder="Max"
                                                min={0}
                                                value={filters.resolution?.[1]}
                                                onChange={(val) => onFilterChange({ 
                                                    resolution: [filters.resolution?.[0] || 0, val || 100] 
                                                })}
                                                style={{ width: 80 }}
                                            />
                                        </Space>
                                    </div>

                                    {/* Limit */}
                                    <div style={{ marginBottom: 16 }}>
                                        <Text style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>
                                            Nəticə limiti
                                        </Text>
                                        <Select
                                            style={{ width: '100%' }}
                                            value={filters.limit}
                                            onChange={(value) => onFilterChange({ limit: value })}
                                            options={[
                                                { value: 10, label: '10 nəticə' },
                                                { value: 25, label: '25 nəticə' },
                                                { value: 50, label: '50 nəticə' },
                                                { value: 100, label: '100 nəticə' },
                                            ]}
                                        />
                                    </div>

                                    {/* Sort */}
                                    <div>
                                        <Text style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>
                                            <SortAscendingOutlined /> Sıralama
                                        </Text>
                                        <Select
                                            style={{ width: '100%' }}
                                            value={getSortValue(filters.sortBy)}
                                            onChange={handleSortChange}
                                            options={SORT_OPTIONS}
                                        />
                                    </div>
                                </>
                            )
                        }
                    ]}
                />

                <Divider style={{ margin: '16px 0' }} />

                {/* Action Buttons */}
                <Space style={{ width: '100%' }} direction="vertical">
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
                                    ? "Nəticə tapılmadı" 
                                    : "Axtarış üçün xəritədə ərazi seçin"
                            }
                        />
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {results.map((item) => {
                                const isRaster = item.properties.data_type === 'raster';
                                const isSelected = selectedItem?.id === item.id;

                                // Raster üçün thumbnail card
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
                                                overflow: 'hidden'
                                            }}
                                            styles={{ body: { padding: 0 } }}
                                        >
                                            {/* Thumbnail */}
                                            <RasterThumbnail
                                                item={item}
                                                isSelected={isSelected}
                                                onClick={() => onItemSelect(item)}
                                            />
                                            
                                            {/* Info */}
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
                                                                ? item.collection.substring(0, 12) + '...' 
                                                                : item.collection}
                                                        </Tag>
                                                    )}
                                                </Space>

                                                {isSelected && (
                                                    <div style={{ 
                                                        marginTop: 8, 
                                                        padding: '4px 8px', 
                                                        background: '#e6f4ff',
                                                        borderRadius: 4,
                                                        fontSize: 11,
                                                        color: '#1677ff',
                                                        textAlign: 'center'
                                                    }}>
                                                        <EyeOutlined /> Xəritədə göstərilir
                                                    </div>
                                                )}
                                            </div>
                                        </Card>
                                    );
                                }

                                // Vector üçün sadə card
                                return (
                                    <Card
                                        key={item.id}
                                        size="small"
                                        hoverable
                                        style={{ 
                                            border: isSelected 
                                                ? '2px solid #722ed1' 
                                                : '1px solid #f0f0f0',
                                            background: isSelected ? '#f9f0ff' : undefined
                                        }}
                                        onClick={() => onItemSelect(item)}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <div style={{
                                                width: 40,
                                                height: 40,
                                                borderRadius: 8,
                                                background: 'linear-gradient(135deg, #722ed1 0%, #9254de 100%)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center'
                                            }}>
                                                <NodeIndexOutlined style={{ color: 'white', fontSize: 18 }} />
                                            </div>
                                            
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <Text strong style={{ 
                                                    fontSize: 12,
                                                    display: 'block',
                                                    whiteSpace: 'nowrap',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis'
                                                }}>
                                                    {item.properties.title || item.id}
                                                </Text>
                                                <div style={{ fontSize: 11, color: '#999' }}>
                                                    <CalendarOutlined /> {dayjs(item.properties.datetime).format('DD.MM.YYYY')}
                                                </div>
                                            </div>

                                            {isSelected && (
                                                <CheckCircleOutlined style={{ color: '#722ed1', fontSize: 16 }} />
                                            )}
                                        </div>

                                        <div style={{ marginTop: 8 }}>
                                            <Space size={4} wrap>
                                                <Tag color="purple" style={{ fontSize: 10, margin: 0 }}>
                                                    <NodeIndexOutlined /> Vector
                                                </Tag>
                                                {item.properties.feature_count && (
                                                    <Tag style={{ fontSize: 10, margin: 0 }}>
                                                        {item.properties.feature_count.toLocaleString()} features
                                                    </Tag>
                                                )}
                                            </Space>
                                        </div>
                                    </Card>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default RasterMapSidebar;