import React, { useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, useMap, GeoJSON, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { parseShapefilePartial } from '../utils/shp-partial-parser';
import { Spin } from 'antd';
import 'leaflet/dist/leaflet.css';

// Marker fix
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

interface ShapeMapProps {
    file: File | undefined;
    height?: string;
    maxFeatures?: number;
    isFocus?: boolean;
}

// Separate component to handle map refreshing and focusing
const MapController = ({ data, isFocus }: { data: any, isFocus: boolean }) => {
    const map = useMap();

    // This listener catches the moment the map is ready to be drawn
    useMapEvents({
        load: () => {
            map.invalidateSize();
        },
    });

    useEffect(() => {
        // Force a resize calculation immediately
        map.invalidateSize();

        if (isFocus && data?.features?.length > 0) {
            try {
                const layer = L.geoJSON(data);
                const bounds = layer.getBounds();
                if (bounds.isValid()) {
                    map.flyToBounds(bounds, {
                        padding: [50, 50],
                        maxZoom: 16,
                        duration: 1.5
                    });
                }
            } catch (e) {
                console.error("Focus error:", e);
            }
        }
    }, [data, map, isFocus]);

    return null;
};

const ShapeMap: React.FC<ShapeMapProps> = ({
                                               file,
                                               height = "500px",
                                               maxFeatures = 1000,
                                               isFocus = true
                                           }) => {
    const [geoJsonData, setGeoJsonData] = useState<any>(null);
    const [centroidData, setCentroidData] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [_error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!file) {
            setGeoJsonData(null);
            setCentroidData(null);
            return;
        }

        const renderShapefileOnMap = async () => {
            setLoading(true);
            setError(null);
            try {
                const result = await parseShapefilePartial(file, maxFeatures);
                const validFeatures = result.features.filter((f: any) => f.geometry && f.geometry.coordinates);

                const centroids = validFeatures.map((f: any) => {
                    let coords: [number, number] | null = null;
                    if (f.geometry.type === "Polygon") {
                        const ring = f.geometry.coordinates[0];
                        let x = 0, y = 0;
                        ring.forEach((p: any) => { x += p[0]; y += p[1]; });
                        coords = [x / ring.length, y / ring.length];
                    } else if (f.geometry.type === "Point") {
                        coords = f.geometry.coordinates;
                    }
                    return coords ? {
                        type: "Feature",
                        geometry: { type: "Point", coordinates: coords },
                        properties: f.properties
                    } : null;
                }).filter(Boolean);

                setGeoJsonData({ type: "FeatureCollection", features: validFeatures });
                setCentroidData({ type: "FeatureCollection", features: centroids });
            } catch (err: any) {
                setError("Xəta: " + err.message);
            } finally {
                setLoading(false);
            }
        };

        renderShapefileOnMap();
    }, [file, maxFeatures]);

    const renderer = useMemo(() => L.canvas({ padding: 0.5 }), []);

    return (
        <div style={{ height, width: '100%', position: 'relative', background: '#ccc' }}>
            {/* Global CSS fix to ensure the container always fills its parent */}
            <style>{`
                .leaflet-container { width: 100% !important; height: 100% !important; background: #f0f0f0 !important; }
            `}</style>

            {loading && (
                <div style={{ position: 'absolute', zIndex: 1000, inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.6)' }}>
                    <Spin size="large" tip="Yüklenir..." />
                </div>
            )}

            <MapContainer
                center={[40.4093, 49.8671]}
                zoom={10}
                preferCanvas={true}
                key={file?.name || 'empty-map'}
                style={{ width: '100%', height: '100%' }} // Inline style for safety
            >
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

                {geoJsonData && (
                    <GeoJSON
                        data={geoJsonData}
                        pathOptions={{ color: '#1890ff', weight: 2, fillOpacity: 0.3, renderer }}
                    />
                )}

                {centroidData && (
                    <GeoJSON
                        data={centroidData}
                        pointToLayer={(_, latlng) => (
                            L.circleMarker(latlng, {
                                radius: 6,
                                fillColor: "#ff4d4f",
                                color: "#fff",
                                weight: 1,
                                fillOpacity: 0.9
                            })
                        )}
                    />
                )}

                <MapController data={geoJsonData} isFocus={isFocus} />
            </MapContainer>
        </div>
    );
};

export default ShapeMap;