import React, { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
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

interface RasterPreviewProps {
    cogUrl: string;
    height?: string;
}

const TITILER_URL = import.meta.env.VITE_TITILER_URL || 'http://localhost:8000';

const MapController = ({ cogUrl }: { cogUrl: string }) => {
    const map = useMap();
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        if (!cogUrl || loaded) return;

        const fetchBounds = async () => {
            try {
                const encodedUrl = encodeURIComponent(cogUrl);
                const response = await fetch(`${TITILER_URL}/cog/bounds?url=${encodedUrl}`);
                const data = await response.json();

                if (data.bounds) {
                    const [minX, minY, maxX, maxY] = data.bounds;
                    const bounds: L.LatLngBoundsExpression = [
                        [minY, minX],
                        [maxY, maxX]
                    ];
                    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 });
                    setLoaded(true);
                }
            } catch (e) {
                console.error("Bounds error:", e);
            }
        };

        fetchBounds();

        const timer = setTimeout(() => map.invalidateSize(), 200);
        return () => clearTimeout(timer);
    }, [cogUrl, map, loaded]);

    return null;
};

const RasterPreview: React.FC<RasterPreviewProps> = ({
    cogUrl,
    height = "500px"
}) => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [tileUrl, setTileUrl] = useState<string>('');
    const tileLayerRef = useRef<L.TileLayer | null>(null);

    useEffect(() => {
        if (!cogUrl) {
            setTileUrl('');
            setLoading(false);
            return;
        }

        const loadRaster = async () => {
            setLoading(true);
            setError(null);

            try {
                const encodedUrl = encodeURIComponent(cogUrl);
                const infoResponse = await fetch(`${TITILER_URL}/cog/info?url=${encodedUrl}`);
                const info = await infoResponse.json();

                let rescale = '0,255';
                try {
                    const statsResponse = await fetch(`${TITILER_URL}/cog/statistics?url=${encodedUrl}`);
                    const stats = await statsResponse.json();

                    const firstBand = Object.keys(stats)[0];
                    if (stats[firstBand]) {
                        const low = stats[firstBand].percentile_2 || stats[firstBand].min || 0;
                        const high = stats[firstBand].percentile_98 || stats[firstBand].max || 255;
                        rescale = `${Math.floor(low)},${Math.ceil(high)}`;
                    }
                } catch (e) {
                    console.warn('Statistics alınmadı, default rescale istifadə olunur');
                }

                let url = `${TITILER_URL}/cog/tiles/WebMercatorQuad/{z}/{x}/{y}@1x.png?url=${encodedUrl}`;

                if (info.count >= 3) {
                    url += '&bidx=1&bidx=2&bidx=3';
                    url += `&rescale=${rescale}&rescale=${rescale}&rescale=${rescale}`;
                } else {
                    url += '&bidx=1';
                    url += `&rescale=${rescale}`;
                    url += '&colormap_name=viridis';
                }

                setTileUrl(url);
                setLoading(false);
            } catch (err: any) {
                setError("Xəta: " + err.message);
                setLoading(false);
            }
        };

        loadRaster();
    }, [cogUrl]);

    return (
        <div style={{
            height,
            width: '100%',
            position: 'relative',
            background: '#f5f5f5',
            borderRadius: '8px',
            overflow: 'hidden'
        }}>
            <style>{`.leaflet-container { width: 100%; height: 100%; }`}</style>

            {loading && (
                <div style={{
                    position: 'absolute',
                    zIndex: 1000,
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'rgba(255,255,255,0.6)'
                }}>
                    <Spin size="large" tip="Raster yüklənir..." />
                </div>
            )}

            {error && (
                <div style={{
                    position: 'absolute',
                    zIndex: 1000,
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'rgba(255,255,255,0.9)',
                    color: '#ff4d4f',
                    fontSize: '14px'
                }}>
                    {error}
                </div>
            )}

            <MapContainer
                center={[40.4093, 49.8671]}
                zoom={10}
                preferCanvas={true}
                key={cogUrl}
            >
                <TileLayer
                    url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                    attribution='&copy; OpenStreetMap &copy; CARTO'
                />

                {tileUrl && (
                    <TileLayer
                        url={tileUrl}
                        opacity={0.9}
                        maxZoom={22}
                        ref={tileLayerRef}
                        errorTileUrl="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="
                    />
                )}

                <MapController cogUrl={cogUrl} />
            </MapContainer>
        </div>
    );
};

export default RasterPreview;