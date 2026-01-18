import * as GeoTIFF from 'geotiff';

interface ProcessMessage {
    type: 'process';
    file: File;
}

interface RenderMessage {
    type: 'render';
    imageIndex: number;
    stretchMode: 'percentile' | 'minmax';
    gamma: number;
}

self.onmessage = async (e: MessageEvent<ProcessMessage | RenderMessage>) => {
    try {
        if (e.data.type === 'process') {
            await processFile(e.data.file);
        } else if (e.data.type === 'render') {
            await renderImage(e.data.imageIndex, e.data.stretchMode, e.data.gamma);
        }
    } catch (error: any) {
        self.postMessage({
            type: 'error',
            error: error.message
        });
    }
};

let currentTiff: any = null;
let currentImage: any = null;
let currentStats: any[] | null = null;

async function processFile(file: File) {

    self.postMessage({ type: 'progress', message: 'GeoTIFF oxunur...' });

    try {
        const arrayBuffer = await file.arrayBuffer();
        currentTiff = await GeoTIFF.fromArrayBuffer(arrayBuffer);

        const image = await currentTiff.getImage(0);
        const width = image.getWidth();
        const height = image.getHeight();
        const samplesPerPixel = image.getSamplesPerPixel();

        const tileWidth = image.getTileWidth?.() || width;
        const tileHeight = image.getTileHeight?.() || height;

        self.postMessage({ type: 'progress', message: 'Metadata oxunur...' });

        let bbox: number[] = [-180, -90, 180, 90];
        let hasGeospatialInfo = false;

        try {
            bbox = image.getBoundingBox();
            hasGeospatialInfo = true;
        } catch (error) {
            self.postMessage({
                type: 'warning',
                message: 'Fayl geospatial metadata saxlamır.'
            });
        }

        let geoKeys: any = null;
        try {
            geoKeys = image.getGeoKeys();
        } catch (error) {
        }

        let crs = 'UNKNOWN';
        if (hasGeospatialInfo) {
            crs = 'EPSG:4326';
            if (geoKeys?.ProjectedCSTypeGeoKey) {
                crs = `EPSG:${geoKeys.ProjectedCSTypeGeoKey}`;
            } else if (geoKeys?.GeographicTypeGeoKey) {
                crs = `EPSG:${geoKeys.GeographicTypeGeoKey}`;
            }
        }

        self.postMessage({ type: 'progress', message: 'Overview-lar yoxlanılır...' });

        const imageCount = await currentTiff.getImageCount();

        const overviews: any[] = [];

        overviews.push({
            index: 0,
            width,
            height,
            resolution: [1, 1]
        });

        for (let i = 1; i < Math.min(imageCount, 10); i++) {
            try {
                const img = await currentTiff.getImage(i);
                const ow = img.getWidth();
                const oh = img.getHeight();
                overviews.push({
                    index: i,
                    width: ow,
                    height: oh,
                    resolution: [1, 1]
                });
            } catch (error) {
                break;
            }
        }

        let bestOverviewIndex = 0;
        let targetSize = 1024;
        let minDiff = Infinity;

        for (let i = 0; i < overviews.length; i++) {
            const ov = overviews[i];
            const diff = Math.abs(ov.width - targetSize);

            if (diff < minDiff && ov.width <= 2048) {
                minDiff = diff;
                bestOverviewIndex = i;
            }
        }


        if (overviews.length === 1 && width > 4096) {
            self.postMessage({
                type: 'warning',
                message: 'Fayl pyramid/overview-lar saxlamır. Preview yavaş ola bilər.'
            });
        }

        currentImage = await currentTiff.getImage(bestOverviewIndex);

        self.postMessage({
            type: 'metadata',
            metadata: {
                width,
                height,
                bands: samplesPerPixel,
                crs,
                bounds: bbox,
                tileWidth,
                tileHeight,
                overviews: overviews.length,
                bestOverview: bestOverviewIndex,
                overview: overviews[bestOverviewIndex],
                hasGeospatialInfo
            }
        });

        await calculateStatistics();

        await renderImage(bestOverviewIndex, 'percentile', 1.0);


    } catch (error: any) {
        console.error('🔴 processFile XƏTA:', error);
        console.error('   Stack:', error.stack);
        self.postMessage({
            type: 'error',
            error: 'GeoTIFF oxuma xətası: ' + error.message
        });
    }
}

async function calculateStatistics() {
    self.postMessage({ type: 'progress', message: 'Statistika hesablanır...' });

    try {
        const rasters = await currentImage.readRasters();

        const bands = rasters.length;
        const width = currentImage.getWidth();
        const height = currentImage.getHeight();
        const totalPixels = width * height;

        const stats: any[] = [];
        const sampleRate = totalPixels > 1000000 ? 10 : 1;

        for (let b = 0; b < bands; b++) {

            const data = rasters[b];
            const sampledData: number[] = [];

            for (let i = 0; i < data.length; i += sampleRate) {
                const v = data[i];
                if (v !== null && !isNaN(v) && isFinite(v)) {
                    sampledData.push(v);
                }
            }


            if (sampledData.length === 0) {
                stats.push(null);
                continue;
            }

            sampledData.sort((a: number, b: number) => a - b);

            const min = sampledData[0];
            const max = sampledData[sampledData.length - 1];
            const sum = sampledData.reduce((a: number, b: number) => a + b, 0);
            const mean = sum / sampledData.length;

            const variance = sampledData.reduce((a: number, b: number) => a + Math.pow(b - mean, 2), 0) / sampledData.length;
            const stdDev = Math.sqrt(variance);

            const p2Index = Math.floor(sampledData.length * 0.02);
            const p98Index = Math.floor(sampledData.length * 0.98);

            const bandStats = {
                min,
                max,
                mean,
                stdDev,
                percentile_2: sampledData[p2Index],
                percentile_98: sampledData[p98Index]
            };

            stats.push(bandStats);

        }

        currentStats = stats;

        self.postMessage({
            type: 'statistics',
            statistics: stats
        });


    } catch (error: any) {
        currentStats = [{ min: 0, max: 255, mean: 127, stdDev: 64, percentile_2: 0, percentile_98: 255 }];
    }
}

async function renderImage(imageIndex: number, stretchMode: string, gamma: number) {

    self.postMessage({ type: 'progress', message: 'Render edilir...' });

    try {
        const image = await currentTiff.getImage(imageIndex);
        const width = image.getWidth();
        const height = image.getHeight();

        const maxPreviewSize = 1024;
        let targetWidth = width;
        let targetHeight = height;
        let shouldSubsample = false;

        if (width > maxPreviewSize || height > maxPreviewSize) {
            const scale = Math.max(width / maxPreviewSize, height / maxPreviewSize);
            targetWidth = Math.floor(width / scale);
            targetHeight = Math.floor(height / scale);
            shouldSubsample = true;
        }


        const rasters = shouldSubsample
            ? await image.readRasters({
                samples: [0, 1, 2].slice(0, image.getSamplesPerPixel()),
                width: targetWidth,
                height: targetHeight
            })
            : await image.readRasters();


        const bands = rasters.length;

        const imageData = new Uint8ClampedArray(targetWidth * targetHeight * 4);


        if (bands >= 3) {
            for (let i = 0; i < targetWidth * targetHeight; i++) {
                const r = stretchValue(rasters[0][i], currentStats?.[0], stretchMode, gamma);
                const g = stretchValue(rasters[1][i], currentStats?.[1], stretchMode, gamma);
                const b = stretchValue(rasters[2][i], currentStats?.[2], stretchMode, gamma);

                imageData[i * 4] = r;
                imageData[i * 4 + 1] = g;
                imageData[i * 4 + 2] = b;
                imageData[i * 4 + 3] = 255;
            }
        } else {
            for (let i = 0; i < targetWidth * targetHeight; i++) {
                const value = stretchValue(rasters[0][i], currentStats?.[0], stretchMode, gamma);
                const color = applyColormap(value);

                imageData[i * 4] = color[0];
                imageData[i * 4 + 1] = color[1];
                imageData[i * 4 + 2] = color[2];
                imageData[i * 4 + 3] = 255;
            }
        }


        self.postMessage({
            type: 'render',
            imageData,
            width: targetWidth,
            height: targetHeight
        });

    } catch (error: any) {
        self.postMessage({
            type: 'error',
            error: 'Render xətası: ' + error.message
        });
    }
}

function stretchValue(value: number, stats: any | null | undefined, mode: string, gamma: number): number {
    if (!stats || value === null || isNaN(value)) return 0;

    let normalized: number;

    if (mode === 'percentile') {
        const low = stats.percentile_2 ?? 0;
        const high = stats.percentile_98 ?? 255;
        normalized = (value - low) / (high - low);
    } else {
        const min = stats.min ?? 0;
        const max = stats.max ?? 255;
        normalized = (value - min) / (max - min);
    }

    normalized = Math.max(0, Math.min(1, normalized));
    normalized = Math.pow(normalized, gamma);

    return Math.round(normalized * 255);
}

function applyColormap(value: number): [number, number, number] {
    const colors: [number, number, number][] = [
        [0, 0, 128],
        [0, 128, 255],
        [0, 255, 128],
        [255, 255, 0],
        [255, 128, 0],
        [128, 64, 0]
    ];

    const normalized = value / 255;
    const index = normalized * (colors.length - 1);
    const i1 = Math.floor(index);
    const i2 = Math.min(i1 + 1, colors.length - 1);
    const frac = index - i1;

    const c1 = colors[i1];
    const c2 = colors[i2];

    return [
        Math.round(c1[0] + (c2[0] - c1[0]) * frac),
        Math.round(c1[1] + (c2[1] - c1[1]) * frac),
        Math.round(c1[2] + (c2[2] - c1[2]) * frac)
    ];
}