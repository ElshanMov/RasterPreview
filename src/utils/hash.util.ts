/**
 * Faylın adından MD5 hash yaradıb UUID formatına çevirir.
 * Eyni fayl adı həmişə eyni UUID qaytarır.
 */
export const generateUuidFromFileName = async (fileName: string): Promise<string> => {
    // 1. Fayl adını UTF-8 byte array-ə çevir
    const encoder = new TextEncoder();
    const data = encoder.encode(fileName);

    // 2. MD5 əvəzinə SHA-256 istifadə edirik (Web Crypto API MD5 dəstəkləmir)
    //    Sonra ilk 32 hex simvolu götürürük (MD5 uzunluğu qədər)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);

    // 3. Hash-i hex string-ə çevir
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    // 4. İlk 32 simvolu götür (UUID üçün lazım olan qədər)
    const hash32 = hashHex.substring(0, 32);

    // 5. UUID formatına çevir: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
    const uuid = [
        hash32.substring(0, 8),
        hash32.substring(8, 12),
        hash32.substring(12, 16),
        hash32.substring(16, 20),
        hash32.substring(20, 32)
    ].join('-');

    return uuid;
};

