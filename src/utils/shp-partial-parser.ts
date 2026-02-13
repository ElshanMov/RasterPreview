import { ZipReader, BlobReader, Uint8ArrayWriter, TextWriter } from "@zip.js/zip.js";
import proj4 from "proj4";

export const parseShapefilePartial = async (zipFile: File, maxFeatures: number = 100) => {
    const zipReader = new ZipReader(new BlobReader(zipFile));
    try {
        const entries = await zipReader.getEntries();
        const shpEntry = entries.find((e: any) => e.filename.toLowerCase().endsWith(".shp"));
        const shxEntry = entries.find((e: any) => e.filename.toLowerCase().endsWith(".shx"));
        const dbfEntry = entries.find((e: any) => e.filename.toLowerCase().endsWith(".dbf"));
        const prjEntry = entries.find((e: any) => e.filename.toLowerCase().endsWith(".prj"));

        if (!shpEntry || !shxEntry || !dbfEntry) throw new Error("Required files (.shp, .shx, .dbf) not found in zip.");

        const prjWkt = prjEntry ? await (prjEntry as any).getData(new TextWriter()) : null;

        // 1. Read Index (SHX)
        const shxBuffer = await (shxEntry as any).getData(new Uint8ArrayWriter());
        const shxView = new DataView(shxBuffer.buffer);
        const totalCount = Math.floor((shxBuffer.length - 100) / 8);
        const numToRead = Math.min(maxFeatures, totalCount);

        // 2. Determine buffer size needed for SHP
        let maxByteRequired = 100;
        for (let i = 0; i < numToRead; i++) {
            const off = shxView.getInt32(100 + i * 8, false) * 2;
            const len = shxView.getInt32(100 + i * 8 + 4, false) * 2;
            if (off + len + 8 > maxByteRequired) maxByteRequired = off + len + 8;
        }

        // 3. Stream data with extra padding
        const shpBuffer = await getStreamedBytes(shpEntry, maxByteRequired + 1024);
        const dbfHeader = await getStreamedBytes(dbfEntry, 32);
        const dbfHeadView = new DataView(dbfHeader.buffer);
        const hSize = dbfHeadView.getUint16(8, true);
        const rSize = dbfHeadView.getUint16(10, true);
        const dbfBuffer = await getStreamedBytes(dbfEntry, hSize + (rSize * numToRead) + 500);

        // 4. Parse DBF Attributes
        const fields = parseDbfFields(dbfBuffer, hSize);
        const attributes = parseDbfRecords(dbfBuffer, fields, hSize, rSize, numToRead);

        // 5. Parse SHP Geometries with Correct Offsets
        const shpView = new DataView(shpBuffer.buffer);
        const features = [];

        for (let i = 0; i < numToRead; i++) {
            const offset = shxView.getInt32(100 + i * 8, false) * 2;
            if (offset + 12 > shpBuffer.length) continue;

            const shapeType = shpView.getInt32(offset + 8, true);
            let geometry: any = null;

            if (shapeType === 1 || shapeType === 11) { // Point / PointZ
                geometry = { type: "Point", coordinates: [shpView.getFloat64(offset + 12, true), shpView.getFloat64(offset + 20, true)] };
            }
            else if ([3, 5, 13, 15].includes(shapeType)) { // Polyline / Polygon (Standard & Z)
                const numParts = shpView.getInt32(offset + 44, true);  // Offset 44 is standard for NumParts
                const numPoints = shpView.getInt32(offset + 48, true); // Offset 48 is standard for NumPoints

                const parts = [];
                for (let j = 0; j < numParts; j++) {
                    parts.push(shpView.getInt32(offset + 52 + j * 4, true));
                }

                const pointsStart = offset + 52 + (numParts * 4);
                const rings = [];

                for (let p = 0; p < numParts; p++) {
                    const start = parts[p];
                    const end = (p < numParts - 1) ? parts[p + 1] : numPoints;
                    const ring = [];
                    for (let k = start; k < end; k++) {
                        const ptOff = pointsStart + k * 16;
                        if (ptOff + 16 <= shpBuffer.length) {
                            ring.push([shpView.getFloat64(ptOff, true), shpView.getFloat64(ptOff + 8, true)]);
                        }
                    }
                    if (ring.length > 0) rings.push(ring);
                }

                if (rings.length > 0) {
                    const isLine = (shapeType === 3 || shapeType === 13);
                    geometry = {
                        type: isLine ? (rings.length === 1 ? "LineString" : "MultiLineString") : "Polygon",
                        coordinates: isLine && rings.length === 1 ? rings[0] : rings
                    };
                }
            }

            if (geometry) {
                // AUTO-DETECT PROJECTION: If coords are large numbers, they are meters.
                const sample = geometry.type === "Point" ? geometry.coordinates :
                    (geometry.type === "LineString" ? geometry.coordinates[0] : geometry.coordinates[0][0]);

                if (sample && (Math.abs(sample[0]) > 181 || Math.abs(sample[1]) > 90)) {
                    if (prjWkt) geometry = transformGeometry(geometry, prjWkt);
                }

                features.push({ type: "Feature", geometry, properties: attributes[i] || {} });
            }
        }

        console.log(`[SHP Parser] Success. Total: ${totalCount}, Loaded: ${features.length}`);
        if (features.length > 0) console.log("First Feature Coordinate:", features[0].geometry.coordinates);

        return { type: "FeatureCollection", features, totalCount, loadedCount: features.length };
    } finally {
        await zipReader.close();
    }
};

const transformGeometry = (geom: any, wkt: string) => {
    const project = (pt: [number, number]): [number, number] => {
        try { return proj4(wkt, "EPSG:4326", pt); } catch { return pt; }
    };
    if (geom.type === "Point") return { ...geom, coordinates: project(geom.coordinates) };
    if (geom.type === "LineString") return { ...geom, coordinates: geom.coordinates.map(project) };
    if (geom.type === "Polygon" || geom.type === "MultiLineString") {
        return { ...geom, coordinates: geom.coordinates.map((r: any) => r.map(project)) };
    }
    return geom;
};

async function getStreamedBytes(entry: any, size: number): Promise<Uint8Array> {
    const controller = new AbortController();
    const result = new Uint8Array(size);
    let offset = 0;
    try {
        await entry.getData(new WritableStream({
            write(chunk: Uint8Array) {
                const toCopy = Math.min(chunk.length, size - offset);
                if (toCopy > 0) { result.set(chunk.slice(0, toCopy), offset); offset += toCopy; }
                if (offset >= size) controller.abort();
            }
        }), { signal: controller.signal });
    } catch (e: any) { if (e.name !== "AbortError") throw e; }
    return result;
}

const parseDbfFields = (buffer: Uint8Array, headerSize: number) => {
    const fields = [];
    const count = Math.floor((headerSize - 33) / 32);
    for (let i = 0; i < count; i++) {
        const start = 32 + (i * 32);
        const name = new TextDecoder().decode(buffer.slice(start, start + 11)).replace(/\0/g, '').trim();
        fields.push({ name, type: String.fromCharCode(buffer[start + 11]), length: buffer[start + 16] });
    }
    return fields;
};

const parseDbfRecords = (buffer: Uint8Array, fields: any[], headerSize: number, recordSize: number, count: number) => {
    const records = [];
    for (let i = 0; i < count; i++) {
        const start = headerSize + (i * recordSize) + 1;
        const record: any = {};
        let offset = 0;
        for (const f of fields) {
            record[f.name] = new TextDecoder().decode(buffer.slice(start + offset, start + offset + f.length)).trim();
            offset += f.length;
        }
        records.push(record);
    }
    return records;
};