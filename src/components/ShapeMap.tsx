import React, { useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, useMap, GeoJSON } from 'react-leaflet';
import L from 'leaflet';
import shp from 'shpjs';
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
    isFocus?: boolean; // focus=0 məntiqi üçün: true (default) uçur, false yerində qalır
}

const MapController = ({ data, isFocus }: { data: any, isFocus: boolean }) => {
    const map = useMap();

    useEffect(() => {
        // Yalnız isFocus true olduqda və data gəldikdə fitBounds işləsin
        if (isFocus && data?.features?.length > 0) {
            try {
                const layer = L.geoJSON(data);
                const bounds = layer.getBounds();
                if (bounds.isValid()) {
                    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 });
                }
            } catch (e) {
                console.error("Bounds error:", e);
            }
        }

        // Hər bir halda ölçüləri yenilə ki, boz ekran getsin
        const timer = setTimeout(() => map.invalidateSize(), 200);
        return () => clearTimeout(timer);
    }, [data, map, isFocus]);

    return null;
};

const ShapeMap: React.FC<ShapeMapProps> = ({
    file,
    height = "500px",
    maxFeatures = 3000,
    isFocus = true // Susmaya görə true (focus=1)
}) => {
    const [geoJsonData, setGeoJsonData] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [count, setCount] = useState({ total: 0, shown: 0 });

    console.log(error);
    console.log(count);

    useEffect(() => {
        if (!file) {
            setGeoJsonData(null);
            return;
        }

        const processFile = async () => {
            setLoading(true);
            setError(null);
            try {
                const buffer = await file.arrayBuffer();
                const result = await shp(buffer);

                let allFeatures = Array.isArray(result)
                    ? result.flatMap(r => r.features)
                    : result.features;

                const validFeatures = allFeatures.filter((f: any) => {
                    if (!f.geometry || !f.geometry.coordinates) return false;
                    const cStr = JSON.stringify(f.geometry.coordinates);
                    return !cStr.includes("NaN") && !cStr.includes("null");
                });

                const limitedFeatures = validFeatures.slice(0, maxFeatures);
                setCount({ total: validFeatures.length, shown: limitedFeatures.length });
                setGeoJsonData({ type: "FeatureCollection", features: limitedFeatures });

            } catch (err: any) {
                setError("Xəta: " + err.message);
            } finally {
                setLoading(false);
            }
        };

        processFile();
    }, [file, maxFeatures]);

    const renderer = useMemo(() => L.canvas({ padding: 0.5 }), []);

    return (
        <div style={{ height, width: '100%', position: 'relative', background: '#f5f5f5', borderRadius: '8px', overflow: 'hidden' }}>
            <style>{`.leaflet-container { width: 100%; height: 100%; }`}</style>

            {loading && (
                <div style={{ position: 'absolute', zIndex: 1000, inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.6)' }}>
                    <Spin size="large" tip="Yüklenir..." />
                </div>
            )}

            <MapContainer
                center={[40.4093, 49.8671]} // Əgər focus=0 olsa, xəritə bu nöqtədə qalacaq
                zoom={10}
                preferCanvas={true}
                key={file?.name || 'empty-map'}
            >
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

                {geoJsonData && (
                    <GeoJSON
                        data={geoJsonData}
                        pathOptions={{
                            color: '#1890ff',
                            weight: 2,
                            fillOpacity: 0.3,
                            renderer: renderer 
                        }}
                        style={{ color: '#1890ff', weight: 2, fillOpacity: 0.3 }}
                    />
                )}
                <MapController data={geoJsonData} isFocus={isFocus} />
            </MapContainer>
        </div>
    );
};

export default ShapeMap;