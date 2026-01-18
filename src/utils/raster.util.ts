import * as GeoTIFF from 'geotiff';

export const analyzeRasterFile = async (file: File) => {
    try {
        const arrayBuffer = await file.arrayBuffer();
        const tiff = await GeoTIFF.fromArrayBuffer(arrayBuffer);
        const image = await tiff.getImage();

        const width = image.getWidth();
        const height = image.getHeight();
        const bands = image.getSamplesPerPixel();

        const geoKeys = image.getGeoKeys();
        const bbox = image.getBoundingBox();

        let srid = 4326;
        if (geoKeys && geoKeys.ProjectedCSTypeGeoKey) {
            srid = geoKeys.ProjectedCSTypeGeoKey;
        }

        return {
            width,
            height,
            bands,
            srid,
            bounds: bbox || [0, 0, 0, 0],
            isValid: true,
        };
    } catch (error) {
        console.error('Raster analiz xətası:', error);
        return {
            width: 0,
            height: 0,
            bands: 0,
            srid: 4326,
            bounds: [0, 0, 0, 0],
            isValid: false,
        };
    }
};