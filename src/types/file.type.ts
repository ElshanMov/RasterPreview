export interface FilePresignedUrlVector {
    organizationName: string | undefined;
    fileName: string;
}

export interface FilePresignedUrlRaster {
    organizationName: string | undefined;
    pixelSize: string;
    fileName: string;
}