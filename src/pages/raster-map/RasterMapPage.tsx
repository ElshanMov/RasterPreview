import { useState, useEffect, useCallback } from 'react';
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

// ✅ dataType: 'all' əlavə edildi
const defaultFilters: RasterFilterParams = {
    bbox: null,
    dateRange: null,
    collections: [],
    ids: '',
    searchText: '',
    dataType: 'all',  // ✅ YENİ
    cloudCover: null,
    resolution: null,
    limit: 10,
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

    const handleBboxDrawn = useCallback((bbox: BboxCoords) => {
        setFilters(prev => ({ ...prev, bbox }));
        setIsDrawingBbox(false);
        message.success('Ərazi seçildi');
    }, []);

    const handleSearch = useCallback(async () => {
        setLoading(true);
        setSelectedItem(null);
        
        try {
            // Smart search - avtomatik GET/POST seçir
            const response = await StacService.search(filters);
            
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
    }, [filters]);

    const handleClearFilters = useCallback(() => {
        setFilters(defaultFilters);
        setResults([]);
        setSelectedItem(null);
        setTotalMatched(0);
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
                    />
                </Layout.Content>
            </Layout>
        </Layout>
    );
}