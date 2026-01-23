import { useState, useEffect, useCallback, useRef } from 'react';
import { Layout, Typography, App, Switch, Space } from 'antd';
import RasterMapSidebar from './RasterMapSidebar';
import RasterMapView from './RasterMapView';
import { StacService } from '../../services/stac.service';
import type { 
    RasterFilterParams, 
    BboxCoords, 
    StacItem, 
    StacCollection 
} from '../../types/raster.map.type';

const { Header } = Layout;
const { Title, Text } = Typography;

const defaultFilters: RasterFilterParams = {
    bbox: null,
    dateRange: null,
    collections: [],
    ids: '',
    searchText: '',
    cloudCover: null,
    resolution: null,
    limit: 50,  // Xəritə üçün daha çox nəticə
    sortBy: { field: 'datetime', direction: 'desc' },
    token: null
};

export default function RasterMapPage() {
    const { message } = App.useApp();
    
    const [collapsed, setCollapsed] = useState(false);
    const [filters, setFilters] = useState<RasterFilterParams>(defaultFilters);
    const [isDrawingBbox, setIsDrawingBbox] = useState(false);
    
    // Auto-search toggle
    const [autoSearchEnabled, setAutoSearchEnabled] = useState(false);
    
    // Data states
    const [collections, setCollections] = useState<StacCollection[]>([]);
    const [results, setResults] = useState<StacItem[]>([]);
    const [selectedItem, setSelectedItem] = useState<StacItem | null>(null);
    
    // Loading states
    const [loading, setLoading] = useState(false);
    const [collectionsLoading, setCollectionsLoading] = useState(false);
    
    // Stats
    const [totalMatched, setTotalMatched] = useState(0);
    
    // Debounce ref
    const debounceRef = useRef<NodeJS.Timeout | null>(null);
    const lastBboxRef = useRef<string | null>(null);

    // Fetch collections on mount
    useEffect(() => {
        const fetchCollections = async () => {
            setCollectionsLoading(true);
            try {
                const data = await StacService.getCollections();
                setCollections(data);
            } catch (error) {
                console.error('Collections fetch error:', error);
                message.warning('Kolleksiyalar yüklənmədi - API əlçatan olmaya bilər');
            } finally {
                setCollectionsLoading(false);
            }
        };
        fetchCollections();
    }, [message]);

    const handleFilterChange = useCallback((newFilters: Partial<RasterFilterParams>) => {
        setFilters(prev => ({ ...prev, ...newFilters }));
    }, []);

    const handleBboxDrawn = useCallback((bbox: BboxCoords) => {
        setFilters(prev => ({ ...prev, bbox }));
        setIsDrawingBbox(false);
        message.success('Ərazi seçildi');
    }, [message]);

    // Manual search (button click)
    const handleSearch = useCallback(async () => {
        setLoading(true);
        setSelectedItem(null);
        
        try {
            const response = await StacService.search(filters);
            
            setResults(response.features);
            setTotalMatched(response.numberMatched || response.features.length);
            
            if (response.features.length === 0) {
                message.info('Nəticə tapılmadı');
            } else {
                message.success(`${response.features.length} nəticə tapıldı`);
            }
        } catch (error: any) {
            console.error('Search error:', error);
            
            if (error.code === 'ERR_NETWORK') {
                message.error('API əlçatan deyil - CORS və ya network problemi');
            } else {
                message.error('Axtarış xətası baş verdi');
            }
        } finally {
            setLoading(false);
        }
    }, [filters, message]);

    // Auto-search when map moves (with debounce)
    const handleMapMove = useCallback((bbox: BboxCoords) => {
        if (!autoSearchEnabled) return;
        
        // Eyni bbox üçün təkrar sorğu göndərmə
        const bboxKey = `${bbox.minLng.toFixed(4)},${bbox.minLat.toFixed(4)},${bbox.maxLng.toFixed(4)},${bbox.maxLat.toFixed(4)}`;
        if (lastBboxRef.current === bboxKey) return;
        lastBboxRef.current = bboxKey;
        
        // Əvvəlki debounce-u ləğv et
        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
        }
        
        // 500ms sonra axtarış et
        debounceRef.current = setTimeout(async () => {
            console.log('🔄 Auto-searching for bbox:', bbox);
            setLoading(true);
            
            try {
                // Filters-i cari bbox ilə yenilə və axtarış et
                const searchFilters: RasterFilterParams = {
                    ...filters,
                    bbox: bbox
                };
                
                const response = await StacService.search(searchFilters);
                
                setResults(response.features);
                setTotalMatched(response.numberMatched || response.features.length);
                
                // Filteri də yenilə
                setFilters(prev => ({ ...prev, bbox }));
                
                console.log(`✅ Found ${response.features.length} items`);
            } catch (error: any) {
                console.error('Auto-search error:', error);
                // Auto-search-də error message göstərmə - çox annoying olar
            } finally {
                setLoading(false);
            }
        }, 500);
    }, [autoSearchEnabled, filters]);

    // Cleanup debounce on unmount
    useEffect(() => {
        return () => {
            if (debounceRef.current) {
                clearTimeout(debounceRef.current);
            }
        };
    }, []);

    const handleClearFilters = useCallback(() => {
        setFilters(defaultFilters);
        setResults([]);
        setSelectedItem(null);
        setTotalMatched(0);
        lastBboxRef.current = null;
    }, []);

    const handleItemSelect = useCallback((item: StacItem) => {
        setSelectedItem(item);
    }, []);

    const handleCancelDraw = useCallback(() => {
        setIsDrawingBbox(false);
    }, []);

    return (
        <Layout style={{ height: 'calc(100vh - 64px - 48px)' }}>
            <Header style={{ 
                background: '#fff', 
                padding: '0 16px', 
                borderBottom: '1px solid #f0f0f0',
                height: 48,
                lineHeight: '48px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
            }}>
                <Title level={4} style={{ margin: 0 }}>
                    🗺️ Raster Map Explorer
                </Title>
                
                <Space>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                        Avtomatik axtarış:
                    </Text>
                    <Switch 
                        checked={autoSearchEnabled}
                        onChange={setAutoSearchEnabled}
                        size="small"
                    />
                </Space>
            </Header>

            <Layout>
                <Layout.Sider
                    width={360}
                    collapsedWidth={0}
                    collapsed={collapsed}
                    onCollapse={setCollapsed}
                    style={{ 
                        background: '#fff',
                        borderRight: '1px solid #f0f0f0',
                        overflow: 'auto'
                    }}
                    collapsible
                    trigger={null}
                >
                    <RasterMapSidebar
                        filters={filters}
                        collections={collections}
                        collectionsLoading={collectionsLoading}
                        onFilterChange={handleFilterChange}
                        onSearch={handleSearch}
                        onClear={handleClearFilters}
                        onDrawBbox={() => setIsDrawingBbox(true)}
                        isDrawingBbox={isDrawingBbox}
                        loading={loading}
                        results={results}
                        totalMatched={totalMatched}
                        onItemSelect={handleItemSelect}
                        selectedItem={selectedItem}
                    />
                </Layout.Sider>

                <Layout.Content style={{ position: 'relative' }}>
                    <RasterMapView
                        isDrawingBbox={isDrawingBbox}
                        onBboxDrawn={handleBboxDrawn}
                        onCancelDraw={handleCancelDraw}
                        bbox={filters.bbox}
                        results={results}
                        selectedItem={selectedItem}
                        onItemSelect={handleItemSelect}
                        collapsed={collapsed}
                        onToggleSidebar={() => setCollapsed(!collapsed)}
                        // onMapMove={handleMapMove}
                        loading={loading}
                    />
                </Layout.Content>
            </Layout>
        </Layout>
    );
}