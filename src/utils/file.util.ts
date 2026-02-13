import { ZipReader, BlobReader, TextWriter } from "@zip.js/zip.js";
import type { Entry } from "@zip.js/zip.js";

const SHAPE_TYPES: Record<number, string> = {
    0: "Null",
    1: "Point",
    3: "LineString",
    5: "Polygon",
    8: "MultiPoint",
    11: "PointZ",
    13: "LineStringZ",
    15: "PolygonZ",
    18: "MultiPointZ",
};

/**
 * Helper: Streams only the needed bytes from a ZIP entry and aborts decompression early.
 */
async function getStreamedBytes(entry: any, targetSize: number): Promise<Uint8Array> {
    const controller = new AbortController();
    const result = new Uint8Array(targetSize);
    let offset = 0;
    try {
        await entry.getData(new WritableStream({
            write(chunk: Uint8Array) {
                const toCopy = Math.min(chunk.length, targetSize - offset);
                result.set(chunk.slice(0, toCopy), offset);
                offset += toCopy;
                // Once we have enough bytes, kill the stream to save CPU/Time
                if (offset >= targetSize) controller.abort();
            }
        }), { signal: controller.signal });
    } catch (e: any) {
        if (e.name !== "AbortError") throw e;
    }
    return result;
}

/**
 * DBF Header Parser for metadata (column names and record count)
 */
const parseDbfMetadata = (buffer: Uint8Array): { recordCount: number; columns: string[] } => {
    const view = new DataView(buffer.buffer);
    const recordCount = view.getUint32(4, true);
    const headerSize = view.getUint16(8, true);
    const fieldCount = Math.floor((headerSize - 33) / 32);

    const columns: string[] = [];
    for (let i = 0; i < fieldCount; i++) {
        const fieldStart = 32 + (i * 32);
        const nameBytes = buffer.slice(fieldStart, fieldStart + 11);
        const nullIndex = nameBytes.indexOf(0);
        const name = new TextDecoder()
            .decode(nameBytes.slice(0, nullIndex > 0 ? nullIndex : 11))
            .trim();
        if (name) columns.push(name);
    }
    return { recordCount, columns };
};

export const analyzeShapefile = async (zipFile: File) => {
    if (!zipFile) throw new Error("Fayl seçilməyib");

    const zipReader = new ZipReader(new BlobReader(zipFile));

    try {
        const entries = await zipReader.getEntries();
        if (entries.length === 0) throw new Error("ZIP faylı boşdur");

        const fileNames = entries.map((e) => e.filename.toLowerCase());
        const requiredFiles = [".prj", ".shp", ".shx", ".dbf"];
        const missingRequired = requiredFiles.filter(
            (ext) => !fileNames.some((f) => f.endsWith(ext))
        );

        if (missingRequired.length > 0) {
            throw new Error(`❌ ZIP-də tələb olunan fayllar yoxdur: ${missingRequired.join(", ")}`);
        }

        const findEntry = (ext: string): Entry | undefined =>
            entries.find((e) => e.filename.toLowerCase().endsWith(ext));

        const shpEntry = findEntry(".shp");
        const dbfEntry = findEntry(".dbf");
        const prjEntry = findEntry(".prj");

        // 1. Read PRJ (Coordinate System) - Small text, safe to read fully
        let prjWkt: string | null = null;
        if (prjEntry && (prjEntry as any).getData) {
            prjWkt = await (prjEntry as any).getData(new TextWriter());
        }

        // 2. Read SHP Header (Geometry Type) - Using Stream/Abort for speed
        let geometryType: string | null = null;
        if (shpEntry) {
            const shpHeader = await getStreamedBytes(shpEntry, 100);
            const shapeTypeCode = new DataView(shpHeader.buffer).getInt32(32, true);
            geometryType = SHAPE_TYPES[shapeTypeCode] || "Unknown";
        }

        // 3. Read DBF Header (Count and Columns) - Using Stream/Abort for speed
        let featureCount = 0;
        let columns: string[] = [];
        if (dbfEntry) {
            // We need enough of the DBF to read the field descriptors (usually ~1-2KB)
            // Reading the first 2048 bytes is safe and covers most Shapefiles
            const dbfBuffer = await getStreamedBytes(dbfEntry, 2048);
            const dbfInfo = parseDbfMetadata(dbfBuffer);
            featureCount = dbfInfo.recordCount;
            columns = dbfInfo.columns;
        }

        const businessKeyColumns = columns.filter((key) =>
            key.toLowerCase().includes("id")
        );

        const sourceName = zipFile.name.split(".zip")[0];
        const sourceSrid = detectSrid(prjWkt);

        return {
            sourceName,
            sourceSrid,
            geometryType,
            businessKeyColumns,
            featureCount,
        };
    } finally {
        await zipReader.close();
    }
};

export const detectSrid = (wkt: string | null | undefined): number => {
    const defaultSrid = 4326;
    if (!wkt || typeof wkt !== "string") return defaultSrid;

    let match = wkt.match(/AUTHORITY\["EPSG","(\d+)"\]/i);
    if (match) return parseInt(match[1], 10);

    match = wkt.match(/ID\["EPSG",\s*(\d+)\]/i);
    if (match) return parseInt(match[1], 10);

    const utmMatch = wkt.match(/UTM Zone (\d+)[, ]+N/i);
    if (utmMatch) return 32600 + parseInt(utmMatch[1], 10);

    const lookup: Record<string, number> = {
        WGS_1984: 4326,
        "WGS 84": 4326,
        GCS_WGS_1984: 4326,
        WGS_84_Pseudo_Mercator: 3857,
        Web_Mercator: 3857,
    };

    for (const key in lookup) {
        if (wkt.includes(key)) return lookup[key];
    }

    return defaultSrid;
};