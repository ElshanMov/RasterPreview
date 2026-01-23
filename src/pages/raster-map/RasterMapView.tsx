import React, { useState, useCallback, useEffect } from 'react';
import { MapContainer, TileLayer, Rectangle, Polygon, useMapEvents, useMap, LayersControl, Popup } from 'react-leaflet';
import { Button, Space, Typography, Alert, Card, Tag } from 'antd';
import { 
    MenuFoldOutlined, 
    MenuUnfoldOutlined,
    FullscreenOutlined,
    FullscreenExitOutlined,
    CloudOutlined,
    CalendarOutlined
} from '@ant-design/icons';
import type { BboxCoords, StacItem } from '../../types/raster.map.type';
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
const ItemFootprint: React.FC<{
    item: StacItem;
    isSelected: boolean;
    onSelect: () => void;
}> = ({ item, isSelected, onSelect }) => {
    if (item.geometry.type !== 'Polygon') return null;

    const positions = item.geometry.coordinates[0].map(
        (coord: [number, number]) => [coord[1], coord[0]] as [number, number]
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
            <Popup>
                <Card size="small" bordered={false} style={{ minWidth: 200 }}>
                    <Text strong style={{ display: 'block', marginBottom: 8 }}>
                        {item.properties.title || item.id}
                    </Text>
                    
                    <div style={{ fontSize: 12, marginBottom: 4 }}>
                        <CalendarOutlined style={{ marginRight: 4 }} />
                        {dayjs(item.properties.datetime).format('DD.MM.YYYY HH:mm')}
                    </div>
                    
                    {item.collection && (
                        <Tag style={{ marginTop: 4 }}>{item.collection}</Tag>
                    )}
                    
                    {item.properties['eo:cloud_cover'] !== undefined && (
                        <Tag 
                            color={item.properties['eo:cloud_cover'] < 20 ? 'green' : 'orange'}
                            style={{ marginTop: 4 }}
                        >
                            <CloudOutlined /> {item.properties['eo:cloud_cover']}%
                        </Tag>
                    )}
                </Card>
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
    onToggleSidebar
}) => {
    const [isFullscreen, setIsFullscreen] = useState(false);

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

            {/* Results Count */}
            {results.length > 0 && (
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
            </MapContainer>
        </div>
    );
};

export default RasterMapView;