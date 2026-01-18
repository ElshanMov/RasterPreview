import { useState, useCallback, useRef, useEffect } from 'react';
import proj4 from 'proj4';

// ✅ Azərbaycan üçün UTM zone definitions
proj4.defs('EPSG:32638', '+proj=utm +zone=38 +datum=WGS84 +units=m +no_defs +type=crs');
proj4.defs('EPSG:32639', '+proj=utm +zone=39 +datum=WGS84 +units=m +no_defs +type=crs');
proj4.defs('EPSG:32640', '+proj=utm +zone=40 +datum=WGS84 +units=m +no_defs +type=crs');

interface RasterMetadata {
    width: number;
    height: number;
    bands: number;
    crs: string;
    bounds: number[];
    overviews: number;
    overview?: any;
    hasGeospatialInfo?: boolean;
}

interface RasterStatistics {
    min: number;
    max: number;
    mean: number;
    stdDev: number;
    percentile_2: number;
    percentile_98: number;
}

interface RasterPreview {
    imageUrl: string;
    bounds: [[number, number], [number, number]];
}

export const useRasterPreview = () => {
    const [loading, setLoading] = useState(false);
    const [progress, setProgress] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [warning, setWarning] = useState<string | null>(null);

    const [currentFile, setCurrentFile] = useState<File | null>(null);
    const [metadata, setMetadata] = useState<RasterMetadata | null>(null);
    const [statistics, setStatistics] = useState<RasterStatistics[] | null>(null);
    const [preview, setPreview] = useState<RasterPreview | null>(null);

    const workerRef = useRef<Worker | null>(null);
    const metadataRef = useRef<RasterMetadata | null>(null);

    useEffect(() => {
        metadataRef.current = metadata;
    }, [metadata]);

    useEffect(() => {
        workerRef.current = new Worker(
            new URL('../workers/raster.worker.ts', import.meta.url),
            { type: 'module' }
        );

        workerRef.current.onmessage = (e) => {
            const { type, ...data } = e.data;

            switch (type) {
                case 'progress':
                    setProgress(data.message);
                    break;

                case 'metadata':
                    setMetadata(data.metadata);
                    break;

                case 'statistics':
                    setStatistics(data.statistics);
                    break;

                case 'render':
                    handleRenderComplete(data.imageData, data.width, data.height);
                    break;

                case 'error':
                    setError(data.error);
                    setLoading(false);
                    break;

                case 'warning':
                    setWarning(data.message);
                    break;
            }
        };

        workerRef.current.onerror = (error) => {
            setError('Worker xətası: ' + error.message);
            setLoading(false);
        };

        return () => {
            workerRef.current?.terminate();
        };
    }, []);

    const handleRenderComplete = useCallback((imageDataArray: Uint8ClampedArray, width: number, height: number) => {

        try {
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');

            if (!ctx) {
                setError('Canvas context alınmadı');
                setLoading(false);
                return;
            }

            const imgData = new ImageData(
                new Uint8ClampedArray(imageDataArray),
                width,
                height
            );

            ctx.putImageData(imgData, 0, 0);

            canvas.toBlob((blob) => {
                const currentMetadata = metadataRef.current;

                if (blob && currentMetadata) {

                    const imageUrl = URL.createObjectURL(blob);
                    const [minX, minY, maxX, maxY] = currentMetadata.bounds;

                    // ✅ DÜZGÜN CRS TRANSFORMATION
                    let previewBounds: [[number, number], [number, number]];

                    try {
                        if (currentMetadata.crs === 'EPSG:4326' || currentMetadata.crs === 'WGS84') {
                            // Artıq WGS84-dədir
                            previewBounds = [[minY, minX], [maxY, maxX]];

                        } else if (currentMetadata.crs.includes('EPSG:326')) {

                            // Transform 4 corners
                            const [lngMin, latMin] = proj4(currentMetadata.crs, 'EPSG:4326', [minX, minY]);
                            const [lngMax, latMax] = proj4(currentMetadata.crs, 'EPSG:4326', [maxX, maxY]);

                            previewBounds = [[latMin, lngMin], [latMax, lngMax]];

                        } else if (currentMetadata.crs === 'UNKNOWN') {
                            // No geospatial info
                            previewBounds = [[40.4, 49.8], [40.5, 49.9]];

                        } else {
                            // Other CRS - try generic transform
                            try {
                                const [lngMin, latMin] = proj4(currentMetadata.crs, 'EPSG:4326', [minX, minY]);
                                const [lngMax, latMax] = proj4(currentMetadata.crs, 'EPSG:4326', [maxX, maxY]);
                                previewBounds = [[latMin, lngMin], [latMax, lngMax]];
                            } catch (err) {
                                previewBounds = [[40.4, 49.8], [40.5, 49.9]];
                            }
                        }

                    } catch (error) {
                        previewBounds = [[40.4, 49.8], [40.5, 49.9]];
                    }

                    const previewData = {
                        imageUrl,
                        bounds: previewBounds
                    };

                    setPreview(previewData);
                    setLoading(false);
                    setProgress('');
                } else {
                    setError('Blob və ya metadata problemi');
                    setLoading(false);
                }
            }, 'image/png');

        } catch (error: any) {
            setError('Render xətası: ' + error.message);
            setLoading(false);
        }
    }, []);

    const processFile = useCallback((file: File) => {

        setCurrentFile(file);
        setLoading(true);
        setError(null);
        setWarning(null);
        setMetadata(null);
        setStatistics(null);
        setPreview(null);

        workerRef.current?.postMessage({
            type: 'process',
            file
        });
    }, []);

    const rerender = useCallback((stretchMode: 'percentile' | 'minmax', gamma: number) => {
        const currentMetadata = metadataRef.current;

        if (!currentMetadata) {
            return;
        }

        setLoading(true);
        workerRef.current?.postMessage({
            type: 'render',
            imageIndex: currentMetadata.overview?.index || 0,
            stretchMode,
            gamma
        });
    }, []);

    return {
        loading,
        progress,
        error,
        warning,
        currentFile,
        metadata,
        statistics,
        preview,
        processFile,
        rerender
    };
};
