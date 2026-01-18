import type { RcFile } from 'antd/es/upload';
import axios from 'axios'

export const MinIOService = {
    upload: async (url: string, file: RcFile): Promise<any> => {
        return await axios.put(url, file);
    },
    uploadRaster: async (
        presignedUrl: string, 
        file: File, 
        onProgress?: (percent: number) => void
    ): Promise<void> => {
        return new Promise<void>((resolve, reject) => {
            const xhr = new XMLHttpRequest();

            // Progress tracking
            xhr.upload.addEventListener('progress', (e) => {
                if (e.lengthComputable && onProgress) {
                    const percent = Math.round((e.loaded / e.total) * 100);
                    onProgress(percent);
                }
            });

            // Success
            xhr.addEventListener('load', () => {
                if (xhr.status === 200 || xhr.status === 204) {
                    resolve();
                } else {
                    reject(new Error(`Upload xətası: ${xhr.status} ${xhr.statusText}`));
                }
            });

            // Error
            xhr.addEventListener('error', () => {
                reject(new Error('Network xətası'));
            });

            // Abort
            xhr.addEventListener('abort', () => {
                reject(new Error('Yükləmə ləğv edildi'));
            });

            // Send request
            xhr.open('PUT', presignedUrl);
            xhr.setRequestHeader('Content-Type', 'image/tiff');
            xhr.send(file);
        });
    }
}