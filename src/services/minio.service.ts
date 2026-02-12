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
    console.log('🚀 Upload starting...');
    console.log('🔗 Presigned URL:', presignedUrl);
    console.log('📁 File name:', file.name);
    console.log('📁 File size:', file.size);
    console.log('📁 File type:', file.type);

    return new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.upload.addEventListener('progress', (e) => {
            if (e.lengthComputable && onProgress) {
                const percent = Math.round((e.loaded / e.total) * 100);
                onProgress(percent);
            }
        });

        xhr.addEventListener('load', () => {
            console.log('📡 Response status:', xhr.status);
            console.log('📡 Response text:', xhr.responseText);
            console.log('📡 Response headers:', xhr.getAllResponseHeaders());
            
            if (xhr.status === 200 || xhr.status === 204) {
                resolve();
            } else {
                reject(new Error(`Upload xətası: ${xhr.status} ${xhr.statusText} - ${xhr.responseText}`));
            }
        });

        xhr.addEventListener('error', () => {
            console.error('❌ XHR Error event triggered');
            console.error('❌ Status:', xhr.status);
            console.error('❌ Response:', xhr.responseText);
            reject(new Error('Network xətası'));
        });

        xhr.addEventListener('abort', () => {
            reject(new Error('Yükləmə ləğv edildi'));
        });

        // Send request
        xhr.open('PUT', presignedUrl);
        
        xhr.send(file);
    });
}
}