import { useState, useEffect, useCallback, useRef } from 'react';
import { Layout, Typography, App } from 'antd';
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
const { Title } = Typography;

const defaultFilters: RasterFilterParams = {
    bbox: null,
    dateRange: null,
    collections: [],
    ids: '',
    searchText: '',
    dataType: 'all',
    cloudCover: null,
    resolution: null,
    limit: 50,
    sortBy: { field: 'datetime', direction: 'desc' },
    token: null
};

export default function RasterMapPage() {
    const { message } = App.useApp();
    
    const [collapsed, setCollapsed] = useState(false);
    const [filters, setFilters] = useState<RasterFilterParams>(defaultFilters);
    const [isDrawingBbox, setIsDrawingBbox] = useState(false);
    
    // Data states
    const [collections, setCollections] = useState<StacCollection[]>([]);
    const [results, setResults] = useState<StacItem[]>([]);
    const [selectedItem, setSelectedItem] = useState<StacItem | null>(null);
    
    // Loading states
    const [loading, setLoading] = useState(false);
    const [collectionsLoading, setCollectionsLoading] = useState(false);
    
    // Stats
    const [totalMatched, setTotalMatched] = useState(0);

    // Debounce ref for auto search
    const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Fetch collections on mount
    useEffect(() => {
        const fetchCollections = async () => {
            setCollectionsLoading(true);
            try {
                const data = await StacService.getCollections();
                setCollections(data);
            } catch (error) {
                message.error('Kolleksiyalar yüklənmədi');
            } finally {
                setCollectionsLoading(false);
            }
        };
        fetchCollections();
    }, []);

    const handleFilterChange = useCallback((newFilters: Partial<RasterFilterParams>) => {
        setFilters(prev => ({ ...prev, ...newFilters }));
    }, []);

    // Search function
    const performSearch = useCallback(async (searchFilters: RasterFilterParams) => {
        // Bbox olmadan axtarış etmə
        if (!searchFilters.bbox) {
            return;
        }

        setLoading(true);
        setSelectedItem(null);
        
        try {
            console.log('🔍 Searching with filters:', searchFilters);
            const response = await StacService.search(searchFilters);
            
            setResults(response.features);
            setTotalMatched(response.numberMatched || response.features.length);
            
            if (response.features.length === 0) {
                message.info('Nəticə tapılmadı');
            } else {
                message.success(`${response.features.length} nəticə tapıldı`);
            }
        } catch (error) {
            message.error('Axtarış xətası baş verdi');
            console.error('Search error:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    // Handle bbox drawn - avtomatik axtarış
    const handleBboxDrawn = useCallback((bbox: BboxCoords) => {
        console.log('📍 Bbox drawn:', bbox);
        
        const newFilters = { ...filters, bbox };
        setFilters(newFilters);
        setIsDrawingBbox(false);
        
        message.success('Ərazi seçildi, axtarış başladılır...');
        
        // Avtomatik axtarış - kiçik delay ilə
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }
        
        searchTimeoutRef.current = setTimeout(() => {
            performSearch(newFilters);
        }, 300);
    }, [filters, performSearch]);

    // Manual search button
    const handleSearch = useCallback(async () => {
        await performSearch(filters);
    }, [filters, performSearch]);

    const handleClearFilters = useCallback(() => {
        setFilters(defaultFilters);
        setResults([]);
        setSelectedItem(null);
        setTotalMatched(0);
    }, []);

    const handleItemSelect = useCallback((item: StacItem) => {
        console.log('📄 Item selected:', item.id, item.properties.data_type);
        setSelectedItem(item);
        
        // Raster seçildiyində mesaj göstər
        if (item.properties.data_type === 'Raster') {
            message.info('Raster xəritəyə yüklənir...');
        }
    }, []);

    const handleCancelDraw = useCallback(() => {
        setIsDrawingBbox(false);
    }, []);

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (searchTimeoutRef.current) {
                clearTimeout(searchTimeoutRef.current);
            }
        };
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
                    🗺️ Raster & Vector Explorer
                </Title>
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
                        loading={loading}
                    />
                </Layout.Content>
            </Layout>
        </Layout>
    );
}