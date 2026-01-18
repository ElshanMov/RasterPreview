import React, { useEffect } from 'react';
import { MapContainer, TileLayer, ImageOverlay, useMap, LayersControl } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

const { BaseLayer } = LayersControl;

interface RasterPreviewProps {
    imageUrl: string;
    bounds: [[number, number], [number, number]];
}

const AutoZoom: React.FC<{ bounds: [[number, number], [number, number]] }> = ({ bounds }) => {
    const map = useMap();

    useEffect(() => {
        if (bounds) {
            map.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 });
        }
    }, [bounds, map]);

    return null;
};

const RasterPreview: React.FC<RasterPreviewProps> = ({ imageUrl, bounds }) => {
    return (
        <MapContainer
            center={[40.4093, 49.8671]}
            zoom={10}
            style={{ width: '100%', height: '100%' }}
            preferCanvas={true}
        >
            <LayersControl position="topright">
                {/* Satellite - Default */}
                <BaseLayer checked name="🛰️ Satellite">
                    <TileLayer
                        url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                        attribution='&copy; Esri'
                        maxZoom={19}
                    />
                </BaseLayer>

                {/* OpenStreetMap */}
                <BaseLayer name="🗺️ OpenStreetMap">
                    <TileLayer
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        attribution='&copy; OpenStreetMap'
                        maxZoom={19}
                    />
                </BaseLayer>

                {/* Dark */}
                <BaseLayer name="🌑 Dark">
                    <TileLayer
                        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                        attribution='&copy; CARTO'
                        maxZoom={19}
                    />
                </BaseLayer>

                {/* Topo */}
                <BaseLayer name="⛰️ Topographic">
                    <TileLayer
                        url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png"
                        attribution='&copy; OpenTopoMap'
                        maxZoom={17}
                    />
                </BaseLayer>
            </LayersControl>

            {/* Raster overlay */}
            <ImageOverlay
                url={imageUrl}
                bounds={bounds}
                opacity={0.8}
            />

            <AutoZoom bounds={bounds} />
        </MapContainer>
    );
};

export default RasterPreview;