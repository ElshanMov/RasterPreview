import React, { useState, useCallback, useEffect } from 'react';
import { MapContainer, TileLayer, Rectangle, Polygon, useMapEvents, useMap, LayersControl, Popup } from 'react-leaflet';
import { Button, Space, Typography, Alert, Tag, Switch, Tooltip } from 'antd';
import { 
    MenuFoldOutlined, 
    MenuUnfoldOutlined,
    FullscreenOutlined,
    FullscreenExitOutlined,
    LoadingOutlined,
    EnvironmentOutlined
} from '@ant-design/icons';
import type { BboxCoords, StacItem } from '../../types/raster.map.type';
import VectorPointsLayer from '../../components/map/VectorPointsLayer';
import RasterTileLayer from '../../components/map/RasterTileLayer';  // ✅ ƏLAVƏ EDİLDİ
import dayjs from 'dayjs';
import 'leaflet/dist/leaflet.css';

const { BaseLayer } = LayersControl;
const { Text } = Typography;

interface RasterMapViewProps {
    isDrawingBbox: boolean;
    onBboxDrawn: (bbox: BboxCoords) => void;
    onCancelDraw: () => void;
    bbox: BboxCoords | null;
    results: StacItem[];
    selectedItem: StacItem | null;
    onItemSelect: (item: StacItem) => void;
    collapsed: boolean;
    onToggleSidebar: () => void;
    loading?: boolean;
}

// ==========================================
// Map Drag Controller - bbox çəkəndə xəritə sürüşməsini söndürür
// ==========================================
const MapDragController: React.FC<{ isDrawing: boolean }> = ({ isDrawing }) => {
    const map = useMap();

    useEffect(() => {
        if (isDrawing) {
            map.dragging.disable();
            map.doubleClickZoom.disable();
        } else {
            map.dragging.enable();
            map.doubleClickZoom.enable();
        }

        return () => {
            map.dragging.enable();
            map.doubleClickZoom.enable();
        };
    }, [isDrawing, map]);

    return null;
};

// ==========================================
// Bbox Drawing Component
// ==========================================
const BboxDrawer: React.FC<{
    isDrawing: boolean;
    onBboxDrawn: (bbox: BboxCoords) => void;
}> = ({ isDrawing, onBboxDrawn }) => {
    const [startPoint, setStartPoint] = useState<[number, number] | null>(null);
    const [currentBbox, setCurrentBbox] = useState<BboxCoords | null>(null);

    // Reset state when drawing mode changes
    useEffect(() => {
        if (!isDrawing) {
            setStartPoint(null);
            setCurrentBbox(null);
        }
    }, [isDrawing]);

    useMapEvents({
        mousedown: (e) => {
            if (!isDrawing) return;
            e.originalEvent.preventDefault();
            e.originalEvent.stopPropagation();
            setStartPoint([e.latlng.lat, e.latlng.lng]);
            setCurrentBbox(null);
        },
        mousemove: (e) => {
            if (!isDrawing || !startPoint) return;
            const bbox: BboxCoords = {
                minLat: Math.min(startPoint[0], e.latlng.lat),
                maxLat: Math.max(startPoint[0], e.latlng.lat),
                minLng: Math.min(startPoint[1], e.latlng.lng),
                maxLng: Math.max(startPoint[1], e.latlng.lng)
            };
            setCurrentBbox(bbox);
        },
        mouseup: (e) => {
            if (!isDrawing || !startPoint) return;
            e.originalEvent.preventDefault();
            e.originalEvent.stopPropagation();
            
            const bbox: BboxCoords = {
                minLat: Math.min(startPoint[0], e.latlng.lat),
                maxLat: Math.max(startPoint[0], e.latlng.lat),
                minLng: Math.min(startPoint[1], e.latlng.lng),
                maxLng: Math.max(startPoint[1], e.latlng.lng)
            };

            // Minimum ölçü yoxlaması - çox kiçik bbox-lar üçün
            const minSize = 0.001;
            if (Math.abs(bbox.maxLat - bbox.minLat) > minSize && 
                Math.abs(bbox.maxLng - bbox.minLng) > minSize) {
                onBboxDrawn(bbox);
            }

            setStartPoint(null);
            setCurrentBbox(null);
        }
    });

    if (!currentBbox) return null;

    return (
        <Rectangle
            bounds={[
                [currentBbox.minLat, currentBbox.minLng],
                [currentBbox.maxLat, currentBbox.maxLng]
            ]}
            pathOptions={{
                color: '#1677ff',
                weight: 2,
                fillColor: '#1677ff',
                fillOpacity: 0.2,
                dashArray: '5, 5'
            }}
        />
    );
};

// ==========================================
// Item Footprint Component
// ==========================================

// Property label mapping - gözəl adlar üçün
const PROPERTY_LABELS: Record<string, string> = {
    title: 'Başlıq',
    description: 'Təsvir',
    datetime: 'Tarix',
    created: 'Yaradılıb',
    updated: 'Yenilənib',
    start_datetime: 'Başlanğıc',
    end_datetime: 'Son',
    platform: 'Platform',
    pipeline_type: 'Pipeline növü',
    feature_count: 'Feature sayı',
    source_table: 'Mənbə cədvəl',
    organization_id: 'Təşkilat ID',
    'processing:level': 'Emal səviyyəsi',
    geometry_strategy: 'Geometry strategiya',
    'eo:cloud_cover': 'Bulud örtüyü',
    'proj:epsg': 'EPSG',
    gsd: 'Rezolyusiya (GSD)',
};

// Format value based on key
const formatPropertyValue = (key: string, value: any): string => {
    if (value === null || value === undefined) return '-';
    
    // Date fields
    if (key.includes('datetime') || key === 'created' || key === 'updated') {
        return dayjs(value).format('DD.MM.YYYY HH:mm');
    }
    
    // Numbers with formatting
    if (key === 'feature_count' && typeof value === 'number') {
        return value.toLocaleString();
    }
    
    // Cloud cover percentage
    if (key === 'eo:cloud_cover') {
        return `${value}%`;
    }
    
    // GSD with unit
    if (key === 'gsd') {
        return `${value}m`;
    }
    
    // Truncate long IDs
    if (key.includes('_id') && typeof value === 'string' && value.length > 20) {
        return `${value.substring(0, 8)}...${value.substring(value.length - 4)}`;
    }
    
    return String(value);
};

// Get tag color for specific properties
const getTagColor = (key: string, value: any): string | undefined => {
    if (key === 'pipeline_type') return 'blue';
    if (key === 'processing:level') return 'purple';
    if (key === 'geometry_strategy') return 'cyan';
    if (key === 'platform') return 'geekblue';
    if (key === 'eo:cloud_cover') {
        if (value < 20) return 'green';
        if (value < 50) return 'orange';
        return 'red';
    }
    return undefined;
};

const ItemFootprint: React.FC<{
    item: StacItem;
    isSelected: boolean;
    onSelect: () => void;
}> = ({ item, isSelected, onSelect }) => {
    // ✅ Geometry validation
    if (!item.geometry || !item.geometry.type || !item.geometry.coordinates) {
        console.warn('Invalid geometry for item:', item.id);
        return null;
    }

    // ✅ Only support Polygon type
    if (item.geometry.type !== 'Polygon') {
        console.warn('Unsupported geometry type:', item.geometry.type, 'for item:', item.id);
        return null;
    }

    // ✅ Safe coordinates access
    const coordinates = item.geometry.coordinates[0];
    if (!coordinates || !Array.isArray(coordinates) || coordinates.length < 3) {
        console.warn('Invalid coordinates for item:', item.id);
        return null;
    }

    const positions = coordinates.map(
        (coord: [number, number]) => [coord[1], coord[0]] as [number, number]
    );

    const props = item.properties;
    
    // Title və description ayrıca göstəriləcək
    const title = props.title || item.id;
    const description = props.description;
    
    // Qalan properties - title və description xaric
    const otherProps = Object.entries(props).filter(
        ([key]) => key !== 'title' && key !== 'description'
    );

    return (
        <Polygon
            positions={positions}
            pathOptions={{
                color: isSelected ? '#1677ff' : '#52c41a',
                weight: isSelected ? 3 : 2,
                fillColor: isSelected ? '#1677ff' : '#52c41a',
                fillOpacity: isSelected ? 0.3 : 0.1
            }}
            eventHandlers={{
                click: onSelect
            }}
        >
            <Popup maxWidth={400} minWidth={300}>
                <div style={{ padding: 4, maxHeight: 400, overflowY: 'auto' }}>
                    {/* Title */}
                    <div style={{ 
                        fontWeight: 600, 
                        fontSize: 14, 
                        marginBottom: 8,
                        color: '#1677ff'
                    }}>
                        {title}
                    </div>
                    
                    {/* Description */}
                    {description && (
                        <div style={{ 
                            fontSize: 12, 
                            color: '#666', 
                            marginBottom: 12,
                            padding: 8,
                            background: '#f5f5f5',
                            borderRadius: 4,
                            fontStyle: 'italic'
                        }}>
                            {description}
                        </div>
                    )}

                    {/* Collection */}
                    {item.collection && (
                        <div style={{ marginBottom: 12 }}>
                            <Tag color="green">{item.collection}</Tag>
                        </div>
                    )}

                    {/* All Properties */}
                    <div style={{ 
                        fontSize: 12,
                        borderTop: '1px solid #f0f0f0',
                        paddingTop: 8
                    }}>
                        {otherProps.map(([key, value]) => {
                            const label = PROPERTY_LABELS[key] || key;
                            const formattedValue = formatPropertyValue(key, value);
                            const tagColor = getTagColor(key, value);
                            
                            return (
                                <div 
                                    key={key} 
                                    style={{ 
                                        display: 'flex', 
                                        marginBottom: 6,
                                        alignItems: 'flex-start'
                                    }}
                                >
                                    <span style={{ 
                                        color: '#999', 
                                        minWidth: 120,
                                        flexShrink: 0,
                                        fontSize: 11
                                    }}>
                                        {label}:
                                    </span>
                                    <span style={{ 
                                        fontWeight: 500,
                                        wordBreak: 'break-word',
                                        fontSize: 11
                                    }}>
                                        {tagColor ? (
                                            <Tag color={tagColor} style={{ margin: 0, fontSize: 11 }}>
                                                {formattedValue}
                                            </Tag>
                                        ) : (
                                            formattedValue
                                        )}
                                    </span>
                                </div>
                            );
                        })}
                    </div>

                    {/* Assets section */}
                    {item.assets && Object.keys(item.assets).length > 0 && (
                        <div style={{ 
                            marginTop: 12, 
                            paddingTop: 8, 
                            borderTop: '1px solid #f0f0f0' 
                        }}>
                            <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 6 }}>
                                Assets:
                            </div>
                            {Object.entries(item.assets).map(([key, asset]) => (
                                <div key={key} style={{ marginBottom: 4 }}>
                                    <Tag color="geekblue" style={{ fontSize: 10 }}>
                                        {key}
                                    </Tag>
                                    <span style={{ fontSize: 10, color: '#999', marginLeft: 4 }}>
                                        {asset.title}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Item ID */}
                    <div style={{ 
                        marginTop: 12, 
                        paddingTop: 8, 
                        borderTop: '1px solid #f0f0f0',
                        fontSize: 10,
                        color: '#999',
                        fontFamily: 'monospace'
                    }}>
                        ID: {item.id}
                    </div>
                </div>
            </Popup>
        </Polygon>
    );
};

// ==========================================
// Main Component
// ==========================================
const RasterMapView: React.FC<RasterMapViewProps> = ({
    isDrawingBbox,
    onBboxDrawn,
    onCancelDraw,
    bbox,
    results,
    selectedItem,
    onItemSelect,
    collapsed,
    onToggleSidebar,
    loading = false
}) => {
    const [isFullscreen, setIsFullscreen] = useState(false);
    // ✅ YENİ: Vector points state
    const [showVectorPoints, setShowVectorPoints] = useState(false);
    // ✅ YENİ: Raster tile layer visibility
    const [showRasterTiles, setShowRasterTiles] = useState(true);
    // ✅ YENİ: Raster loading state
    const [rasterLoading, setRasterLoading] = useState(false);

    const toggleFullscreen = useCallback(() => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
            setIsFullscreen(true);
        } else {
            document.exitFullscreen();
            setIsFullscreen(false);
        }
    }, []);

    // ESC ilə drawing rejimini ləğv etmək
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isDrawingBbox) {
                onCancelDraw();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isDrawingBbox, onCancelDraw]);

    // ✅ Seçilmiş item raster tipindədirsə yoxla
    const isRasterItem = selectedItem?.properties?.data_type === 'Raster' || 
                         Object.values(selectedItem?.assets || {}).some(
                             (asset: any) => asset.type?.includes('geotiff')
                         );

    return (
        <div style={{ 
            height: '100%', 
            position: 'relative',
            cursor: isDrawingBbox ? 'crosshair' : 'grab'
        }}>
            {/* Drawing Mode Alert */}
            {isDrawingBbox && (
                <Alert
                    message="Bbox çəkmə rejimi aktiv"
                    description={
                        <span>
                            Sol klik basıb sürükləyərək ərazi seçin. 
                            <br />
                            <Text keyboard>ESC</Text> ilə ləğv edə bilərsiniz.
                        </span>
                    }
                    type="info"
                    showIcon
                    style={{
                        position: 'absolute',
                        top: 10,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        zIndex: 1000,
                        maxWidth: 350
                    }}
                    action={
                        <Button size="small" onClick={onCancelDraw}>
                            Ləğv et
                        </Button>
                    }
                />
            )}

            {/* Map Controls */}
            <div style={{
                position: 'absolute',
                top: 10,
                left: 10,
                zIndex: 1000
            }}>
                <Space direction="vertical">
                    <Button
                        type="primary"
                        icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                        onClick={onToggleSidebar}
                    />
                    <Button
                        icon={isFullscreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
                        onClick={toggleFullscreen}
                    />
                </Space>
            </div>

            {/* ✅ YENİ: Vector Points Toggle */}
            <div style={{
                position: 'absolute',
                top: 10,
                left: 60,
                zIndex: 1000,
                background: 'rgba(255,255,255,0.95)',
                padding: '8px 12px',
                borderRadius: 8,
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
            }}>
                <Tooltip title="Vektor nöqtələrini göstər/gizlət (PyGeoAPI)">
                    <Space>
                        <EnvironmentOutlined style={{ color: showVectorPoints ? '#1677ff' : '#999' }} />
                        <Switch
                            size="small"
                            checked={showVectorPoints}
                            onChange={setShowVectorPoints}
                        />
                        <Text style={{ fontSize: 12 }}>Nöqtələr</Text>
                    </Space>
                </Tooltip>
            </div>

            {/* ✅ YENİ: Raster Loading Indicator */}
            {rasterLoading && (
                <div style={{
                    position: 'absolute',
                    top: 60,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    zIndex: 1000,
                    background: 'rgba(255,255,255,0.95)',
                    padding: '12px 20px',
                    borderRadius: 8,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10
                }}>
                    <LoadingOutlined spin style={{ color: '#1677ff', fontSize: 18 }} />
                    <Text strong>Raster xəritəyə yüklənir...</Text>
                </div>
            )}

            {/* Loading Indicator */}
            {loading && (
                <div style={{
                    position: 'absolute',
                    top: 10,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    zIndex: 1000,
                    background: 'rgba(255,255,255,0.95)',
                    padding: '8px 16px',
                    borderRadius: 8,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8
                }}>
                    <LoadingOutlined spin style={{ color: '#1677ff' }} />
                    <Text>Yüklənir...</Text>
                </div>
            )}

            {/* Results Count */}
            {results.length > 0 && !loading && (
                <div style={{
                    position: 'absolute',
                    top: 10,
                    right: 60,
                    zIndex: 1000,
                    background: 'rgba(255,255,255,0.95)',
                    padding: '6px 12px',
                    borderRadius: 6,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                }}>
                    <Text strong style={{ fontSize: 12 }}>
                        🗺️ {results.length} nəticə xəritədə
                    </Text>
                </div>
            )}

            {/* Coordinates Display */}
            <div style={{
                position: 'absolute',
                bottom: 10,
                left: 10,
                zIndex: 1000,
                background: 'rgba(255,255,255,0.9)',
                padding: '4px 8px',
                borderRadius: 4,
                fontSize: 11,
                fontFamily: 'monospace'
            }}>
                <Text type="secondary">
                    🌍 WGS84 | EPSG:4326
                </Text>
            </div>

            {/* Selected Item Info */}
            {selectedItem && (
                <div style={{
                    position: 'absolute',
                    bottom: 10,
                    right: 10,
                    zIndex: 1000,
                    background: 'rgba(255,255,255,0.95)',
                    padding: '8px 12px',
                    borderRadius: 8,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                    maxWidth: 300
                }}>
                    <Text strong style={{ fontSize: 12, display: 'block' }}>
                        {selectedItem.properties.title || selectedItem.id}
                    </Text>
                    <Text type="secondary" style={{ fontSize: 11 }}>
                        {dayjs(selectedItem.properties.datetime).format('DD.MM.YYYY HH:mm')}
                    </Text>
                    {isRasterItem && (
                        <div style={{ marginTop: 4 }}>
                            <Tag color="blue" style={{ fontSize: 10 }}>COG Yüklənir</Tag>
                        </div>
                    )}
                </div>
            )}

            {/* Leaflet Map */}
            <MapContainer
                center={[40.4093, 49.8671]}
                zoom={7}
                style={{ height: '100%', width: '100%' }}
                zoomControl={true}
            >
                {/* Map Drag Controller */}
                <MapDragController isDrawing={isDrawingBbox} />

                <LayersControl position="topright">
                    <BaseLayer checked name="🛰️ Satellite">
                        <TileLayer
                            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                            attribution="&copy; Esri"
                            maxZoom={19}
                        />
                    </BaseLayer>

                    <BaseLayer name="🗺️ OpenStreetMap">
                        <TileLayer
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            attribution="&copy; OpenStreetMap"
                            maxZoom={19}
                        />
                    </BaseLayer>

                    <BaseLayer name="🌑 Dark">
                        <TileLayer
                            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                            attribution="&copy; CARTO"
                            maxZoom={19}
                        />
                    </BaseLayer>

                    <BaseLayer name="⛰️ Topographic">
                        <TileLayer
                            url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png"
                            attribution="&copy; OpenTopoMap"
                            maxZoom={17}
                        />
                    </BaseLayer>
                </LayersControl>

                {/* Bbox Drawer */}
                <BboxDrawer 
                    isDrawing={isDrawingBbox} 
                    onBboxDrawn={onBboxDrawn}
                />

                {/* Search Bbox Display */}
                {bbox && !isDrawingBbox && (
                    <Rectangle
                        bounds={[
                            [bbox.minLat, bbox.minLng],
                            [bbox.maxLat, bbox.maxLng]
                        ]}
                        pathOptions={{
                            color: '#ff4d4f',
                            weight: 2,
                            fillColor: '#ff4d4f',
                            fillOpacity: 0.1,
                            dashArray: '10, 5'
                        }}
                    />
                )}

                {/* Result Footprints */}
                {results.map((item) => (
                    <ItemFootprint
                        key={item.id}
                        item={item}
                        isSelected={selectedItem?.id === item.id}
                        onSelect={() => onItemSelect(item)}
                    />
                ))}

                {/* ✅ YENİ: Raster Tile Layer - seçilmiş item üçün */}
                {selectedItem && showRasterTiles && isRasterItem && (
                    <RasterTileLayer
                        item={selectedItem}
                        opacity={0.85}
                    />
                )}

                {/* ✅ YENİ: Vector Points Layer */}
                <VectorPointsLayer
                    collectionId="azeriqaz_wtr_points"
                    visible={showVectorPoints}
                    color="#1677ff"
                    maxPoints={5000}
                />
            </MapContainer>
        </div>
    );
};

export default RasterMapView;