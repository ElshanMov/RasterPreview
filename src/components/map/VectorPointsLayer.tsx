import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import { PyGeoAPIService, type PyGeoAPIFeature } from '../../services/pygeoapi.service';
import { Typography, Space, Tag } from 'antd';
import { EnvironmentOutlined, LoadingOutlined } from '@ant-design/icons';

const { Text } = Typography;

interface VectorPointsLayerProps {
    collectionId: string;
    visible: boolean;
    onFeatureClick?: (feature: PyGeoAPIFeature) => void;
    onStatsUpdate?: (stats: { loaded: number; total: number }) => void;
    color?: string;
    maxPoints?: number;
}

const VectorPointsLayer: React.FC<VectorPointsLayerProps> = ({
    collectionId,
    visible,
    onFeatureClick,
    onStatsUpdate,
    color = '#1677ff',
    maxPoints = 10000,
}) => {
    const map = useMap();
    const [loading, setLoading] = useState(false);
    const [stats, setStats] = useState({ loaded: 0, total: 0 });
    const clusterGroupRef = useRef<L.MarkerClusterGroup | null>(null);
    const loadedBoundsRef = useRef<string | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);
    const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Create custom point icon
    const createIcon = useCallback((isSelected: boolean = false) => {
        const size = isSelected ? 14 : 10;
        return L.divIcon({
            className: 'vector-point-marker',
            html: `
                <div style="
                    width: ${size}px;
                    height: ${size}px;
                    background: ${isSelected ? '#ff4d4f' : color};
                    border: 2px solid white;
                    border-radius: 50%;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.3);
                    transition: all 0.2s;
                "></div>
            `,
            iconSize: [size, size],
            iconAnchor: [size / 2, size / 2],
        });
    }, [color]);

    // Create popup content
    const createPopupContent = useCallback((feature: PyGeoAPIFeature) => {
        const props = feature.properties || {};
        const innerProps = props.properties || props;
        
        // Try to find a name field
        const name = innerProps?.name || 
                     innerProps?.title || 
                     innerProps?.leaid ||
                     props?.leaid ||
                     `Point ${feature.id}`;
        
        // Get coordinates
        const [lng, lat] = feature.geometry?.coordinates || [0, 0];
        
        return `
            <div style="min-width: 220px; font-family: -apple-system, BlinkMacSystemFont, sans-serif;">
                <div style="
                    font-weight: 600; 
                    font-size: 14px; 
                    margin-bottom: 10px; 
                    color: ${color};
                    border-bottom: 2px solid ${color}20;
                    padding-bottom: 8px;
                ">
                    📍 ${name}
                </div>
                
                <div style="font-size: 12px; color: #666; margin-bottom: 6px;">
                    <strong>Koordinat:</strong> ${lat.toFixed(6)}, ${lng.toFixed(6)}
                </div>
                
                ${innerProps?.stac_datetime ? `
                    <div style="font-size: 12px; color: #666; margin-bottom: 6px;">
                        <strong>Tarix:</strong> ${new Date(innerProps.stac_datetime).toLocaleString('az-AZ')}
                    </div>
                ` : ''}
                
                ${innerProps?.organization_id ? `
                    <div style="font-size: 11px; color: #999; margin-bottom: 4px;">
                        <strong>Org ID:</strong> ${innerProps.organization_id.substring(0, 8)}...
                    </div>
                ` : ''}
                
                <div style="
                    font-size: 10px; 
                    color: #999; 
                    margin-top: 8px;
                    padding-top: 8px;
                    border-top: 1px solid #eee;
                    font-family: monospace;
                ">
                    ID: ${feature.id}
                </div>
            </div>
        `;
    }, [color]);

    // Initialize cluster group
    useEffect(() => {
        if (!clusterGroupRef.current) {
            clusterGroupRef.current = L.markerClusterGroup({
                chunkedLoading: true,
                chunkInterval: 100,
                chunkDelay: 20,
                maxClusterRadius: 60,
                spiderfyOnMaxZoom: true,
                showCoverageOnHover: false,
                zoomToBoundsOnClick: true,
                disableClusteringAtZoom: 17,
                animate: true,
                animateAddingMarkers: false, // Performance
                removeOutsideVisibleBounds: true, // Performance
                iconCreateFunction: (cluster) => {
                    const count = cluster.getChildCount();
                    let size: 'small' | 'medium' | 'large' = 'small';
                    let dimension = 36;
                    let fontSize = 12;
                    
                    if (count > 1000) {
                        size = 'large';
                        dimension = 56;
                        fontSize = 14;
                    } else if (count > 100) {
                        size = 'medium';
                        dimension = 46;
                        fontSize = 13;
                    }

                    // Format count
                    const displayCount = count >= 10000 
                        ? `${(count / 1000).toFixed(0)}k`
                        : count >= 1000 
                            ? `${(count / 1000).toFixed(1)}k`
                            : count.toString();

                    return L.divIcon({
                        html: `
                            <div style="
                                width: ${dimension}px;
                                height: ${dimension}px;
                                background: linear-gradient(135deg, ${color} 0%, ${color}dd 100%);
                                border: 3px solid white;
                                border-radius: 50%;
                                display: flex;
                                align-items: center;
                                justify-content: center;
                                color: white;
                                font-weight: 700;
                                font-size: ${fontSize}px;
                                box-shadow: 0 4px 12px rgba(0,0,0,0.25);
                                text-shadow: 0 1px 2px rgba(0,0,0,0.2);
                            ">
                                ${displayCount}
                            </div>
                        `,
                        className: `marker-cluster marker-cluster-${size}`,
                        iconSize: L.point(dimension, dimension),
                    });
                },
            });
        }

        return () => {
            if (clusterGroupRef.current) {
                clusterGroupRef.current.clearLayers();
                if (map.hasLayer(clusterGroupRef.current)) {
                    map.removeLayer(clusterGroupRef.current);
                }
            }
        };
    }, [map, color]);

    // Load points for current bounds
    const loadPoints = useCallback(async (force: boolean = false) => {
        if (!visible || !clusterGroupRef.current) return;

        const bounds = map.getBounds();
        const boundsKey = `${bounds.toBBoxString()}-${map.getZoom()}`;
        
        // Skip if same bounds (unless forced)
        if (!force && loadedBoundsRef.current === boundsKey) {
            return;
        }

        // Cancel previous request
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        abortControllerRef.current = new AbortController();

        setLoading(true);

        try {
            const bbox: [number, number, number, number] = [
                Math.max(bounds.getWest(), -180),
                Math.max(bounds.getSouth(), -90),
                Math.min(bounds.getEast(), 180),
                Math.min(bounds.getNorth(), 90),
            ];

            console.log(`📡 Loading points for bbox: ${bbox.join(', ')}`);

            const response = await PyGeoAPIService.getItems(collectionId, {
                bbox,
                limit: maxPoints,
            });

            if (abortControllerRef.current?.signal.aborted) {
                return;
            }

            // Clear and add new markers
            clusterGroupRef.current.clearLayers();

            const markers: L.Marker[] = [];
            
            for (const feature of response.features) {
                if (!feature.geometry?.coordinates) continue;
                
                const [lng, lat] = feature.geometry.coordinates;
                
                // Validate coordinates
                if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
                    continue;
                }

                const marker = L.marker([lat, lng], { icon: createIcon() });
                marker.bindPopup(createPopupContent(feature), {
                    maxWidth: 300,
                    className: 'vector-point-popup'
                });
                
                if (onFeatureClick) {
                    marker.on('click', () => onFeatureClick(feature));
                }

                markers.push(marker);
            }

            // Batch add for performance
            clusterGroupRef.current.addLayers(markers);
            loadedBoundsRef.current = boundsKey;

            const newStats = {
                loaded: markers.length,
                total: response.numberMatched || markers.length
            };
            setStats(newStats);
            onStatsUpdate?.(newStats);

            console.log(`✅ Loaded ${markers.length} points (total: ${newStats.total})`);

        } catch (error: any) {
            if (error.name !== 'AbortError' && error.name !== 'CanceledError') {
                console.error('Points load error:', error);
            }
        } finally {
            setLoading(false);
        }
    }, [visible, map, collectionId, maxPoints, createIcon, createPopupContent, onFeatureClick, onStatsUpdate]);

    // Add/remove layer based on visibility
    useEffect(() => {
        if (!clusterGroupRef.current) return;

        if (visible) {
            if (!map.hasLayer(clusterGroupRef.current)) {
                map.addLayer(clusterGroupRef.current);
            }
            loadPoints(true);
        } else {
            if (map.hasLayer(clusterGroupRef.current)) {
                map.removeLayer(clusterGroupRef.current);
            }
            setStats({ loaded: 0, total: 0 });
            loadedBoundsRef.current = null;
        }
    }, [visible, map, loadPoints]);

    // Reload on map move with debounce
    useEffect(() => {
        if (!visible) return;

        const handleMoveEnd = () => {
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }
            debounceTimerRef.current = setTimeout(() => {
                loadPoints();
            }, 400);
        };

        map.on('moveend', handleMoveEnd);
        map.on('zoomend', handleMoveEnd);

        return () => {
            map.off('moveend', handleMoveEnd);
            map.off('zoomend', handleMoveEnd);
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }
        };
    }, [map, visible, loadPoints]);

    // Stats indicator (always show when visible and has data)
    if (visible && (loading || stats.loaded > 0)) {
        return (
            <div style={{
                position: 'absolute',
                top: 60,
                left: 60,
                zIndex: 1000,
                background: 'rgba(255,255,255,0.95)',
                padding: '10px 14px',
                borderRadius: 8,
                boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
                backdropFilter: 'blur(8px)',
                border: `2px solid ${color}30`,
            }}>
                <Space direction="vertical" size={4}>
                    <Space>
                        <EnvironmentOutlined style={{ color, fontSize: 16 }} />
                        <Text strong style={{ fontSize: 13 }}>Vektor Nöqtələri</Text>
                        {loading && <LoadingOutlined spin style={{ color, marginLeft: 4 }} />}
                    </Space>
                    
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <Tag color="blue" style={{ margin: 0 }}>
                            {stats.loaded.toLocaleString()} yükləndi
                        </Tag>
                        {stats.total > stats.loaded && (
                            <Tag color="orange" style={{ margin: 0 }}>
                                {stats.total.toLocaleString()} ümumi
                            </Tag>
                        )}
                    </div>
                    
                    {stats.total > maxPoints && (
                        <Text type="secondary" style={{ fontSize: 11 }}>
                            💡 Daha çox görmək üçün yaxınlaşdırın
                        </Text>
                    )}
                </Space>
            </div>
        );
    }

    return null;
};

export default VectorPointsLayer;