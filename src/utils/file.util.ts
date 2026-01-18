import JSZip from "jszip";
import shp from "shpjs";

const normalizeShpResult = (result: Awaited<ReturnType<typeof shp>>) => {
    if (Array.isArray(result)) {
        return result[0] ?? { type: "FeatureCollection" as const, features: [] };
    }
    return result;
};

export const analyzeShapefile = async (zipFile: File) => {
    const arrayBuffer = await zipFile.arrayBuffer();
    const zip = await JSZip.loadAsync(arrayBuffer);

    const originalFiles = Object.keys(zip.files);
    const fileMap = Object.fromEntries(
        originalFiles.map((f) => [f.toLowerCase(), f])
    );
    const filesLower = originalFiles.map((f) => f.toLowerCase());

    const requiredFiles = [".prj", ".shp", ".shx", ".dbf"];
    const missingRequired = requiredFiles.filter(
        (ext) => !filesLower.some((f) => f.endsWith(ext))
    );

    if (missingRequired.length > 0) {
        throw new Error(
            `❌ ZIP-də tələb olunan fayllar yoxdur: ${missingRequired.join(", ")}`
        );
    }

    let prjWkt: string | null = null;
    const prjLower = filesLower.find((f) => f.endsWith(".prj"));
    if (prjLower) {
        const realPrjName = fileMap[prjLower];
        prjWkt = await zip.files[realPrjName].async("string");
    }

    const result = await shp(arrayBuffer);
    const geojson = normalizeShpResult(result); // <-- Normallaşdır

    const geometryType = geojson.features?.[0]?.geometry?.type ?? null;
    const properties = geojson.features?.[0]?.properties ?? {};

    const businessKeyColumns = Object.keys(properties).filter((key) =>
        key.toLowerCase().includes("id")
    );

    const sourceName = zipFile.name.split(".zip")[0];
    const sourceSrid = detectSrid(prjWkt);

    return {
        sourceName,
        sourceSrid,
        geometryType,
        businessKeyColumns,
        featureCount: geojson.features?.length ?? 0,
    };
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