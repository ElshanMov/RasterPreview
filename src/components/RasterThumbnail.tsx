/**
 * RasterThumbnail Component
 * 
 * STAC Item üçün TiTiler preview göstərir.
 * React.memo ilə optimize edilib - lazımsız re-render-lərin qarşısını alır.
 * 
 * ⚡ OPTIMIZATION: Statistics skip edilib - preview üçün lazım deyil
 * Statistics API 20-30 saniyə çəkirdi, indi preview 300-600ms-də yüklənir
 */

import React, { useState, useEffect, memo, useRef } from 'react';
import { LoadingOutlined, PictureOutlined, EyeOutlined } from '@ant-design/icons';
import type { StacItem } from '../types/raster.map.type';

// TiTiler URL konfiqurasiyası
const TITILER_BASE = import.meta.env.DEV ? '/titiler-api' : 'https://tiles.mmdev.az/tiles';

interface RasterThumbnailProps {
    item: StacItem;
    isSelected: boolean;
    onClick: () => void;
}

// COG URL əldə et
const getCogUrl = (item: StacItem): string | null => {
    const dataAsset = item.assets?.data;
    return dataAsset?.Href || dataAsset?.href || 
           item.assets?.image?.Href || item.assets?.image?.href || null;
};

// S3 URL-dən fayl adını çıxar
const getAssetFileName = (item: StacItem): string | null => {
    const dataAsset = item.assets?.data;
    const href = dataAsset?.Href || dataAsset?.href || 
                item.assets?.image?.Href || item.assets?.image?.href;
    if (!href) return null;
    const parts = href.split('/');
    return parts[parts.length - 1] || null;
};

// Qısa fayl adı (log üçün)
const getShortFileName = (item: StacItem): string => {
    const fileName = getAssetFileName(item);
    if (!fileName) return item.id.substring(0, 8);
    if (fileName.length > 20) {
        return fileName.substring(0, 17) + '...';
    }
    return fileName;
};

// Info cache - eyni COG üçün təkrar sorğu getməsin
const infoCache = new Map<string, { dtype: string; bandCount: number }>();

// /info endpoint-dən dtype alıb rescale təyin et
const getInfoAndBuildUrl = async (cogUrl: string, shortName: string): Promise<string> => {
    let dtype = 'uint8';
    let bandCount = 3;
    
    // Cache yoxla
    const cached = infoCache.get(cogUrl);
    if (cached) {
        dtype = cached.dtype;
        bandCount = cached.bandCount;
        console.log(`%c⚡ [${shortName}] Cache hit! dtype=${dtype}`, 'color: #10b981;');
    } else {
        // /info endpoint - statistics-dən 20-30x sürətli
        const infoStart = performance.now();
        const infoUrl = `${TITILER_BASE}/cog/info?url=${encodeURIComponent(cogUrl)}`;
        
        try {
            const response = await fetch(infoUrl);
            if (response.ok) {
                const info = await response.json();
                dtype = info.dtype || 'uint8';
                bandCount = info.count || 3;
                
                // Cache saxla
                infoCache.set(cogUrl, { dtype, bandCount });
                
                const infoTime = performance.now() - infoStart;
                console.log(
                    `%c🔵 [${shortName}] Info: ${infoTime.toFixed(0)}ms | dtype=${dtype} | bands=${bandCount}`,
                    infoTime > 500 ? 'color: #f59e0b;' : 'color: #3b82f6;'
                );
            }
        } catch (e) {
            console.warn(`⚠️ [${shortName}] Info failed, using defaults`);
        }
    }
    
    // Rescale təyin et dtype-a görə
    let rescale: string;
    if (dtype.includes('uint8') || dtype.includes('int8')) {
        rescale = '0,255';
    } else if (dtype.includes('uint16')) {
        // Satellite imagery üçün tipik dəyərlər (reflectance * 10000)
        rescale = '0,3000';
    } else if (dtype.includes('int16')) {
        rescale = '0,3000';
    } else if (dtype.includes('float')) {
        rescale = '0,1';
    } else {
        rescale = '0,255'; // default
    }
    
    // URL yarat
    const params = new URLSearchParams();
    params.append('url', cogUrl);
    params.append('max_size', '256');
    
    // Band indexes
    const bands = Math.min(bandCount, 3);
    for (let i = 1; i <= bands; i++) {
        params.append('bidx', String(i));
        params.append('rescale', rescale);
    }
    
    return `${TITILER_BASE}/cog/preview.png?${params.toString()}`;
};

const RasterThumbnailComponent: React.FC<RasterThumbnailProps> = ({ 
    item, 
    isSelected, 
    onClick 
}) => {
    const [imageLoading, setImageLoading] = useState(true);
    const [imageError, setImageError] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    
    // Performance tracking refs
    const startTimeRef = useRef<number>(0);
    const imageStartTimeRef = useRef<number>(0);
    
    const cogUrl = getCogUrl(item);
    const shortName = getShortFileName(item);

    useEffect(() => {
        setImageLoading(true);
        setImageError(false);
        setPreviewUrl(null);

        if (!cogUrl) {
            setImageError(true);
            setImageLoading(false);
            return;
        }

        let isMounted = true;
        startTimeRef.current = performance.now();
        
        console.log(`%c🚀 [${shortName}] Preview başladı`, 'color: #6366f1;');

        const loadPreview = async () => {
            try {
                // /info ilə URL yarat (statistics-dən 20-30x sürətli)
                const url = await getInfoAndBuildUrl(cogUrl, shortName);
                
                if (isMounted) {
                    imageStartTimeRef.current = performance.now();
                    setPreviewUrl(url);
                }
                
            } catch (error) {
                if (!isMounted) return;
                
                console.warn(`⚠️ [${shortName}] Xəta, fallback istifadə edilir:`, error);
                
                // Fallback - default 8-bit rescale
                const params = new URLSearchParams();
                params.append('url', cogUrl);
                params.append('max_size', '256');
                params.append('bidx', '1');
                params.append('bidx', '2');
                params.append('bidx', '3');
                params.append('rescale', '0,255');
                params.append('rescale', '0,255');
                params.append('rescale', '0,255');
                
                imageStartTimeRef.current = performance.now();
                setPreviewUrl(`${TITILER_BASE}/cog/preview.png?${params.toString()}`);
            }
        };

        loadPreview();

        return () => {
            isMounted = false;
        };
    }, [cogUrl, shortName]);
    
    const handleImageLoad = () => {
        const imageTime = performance.now() - imageStartTimeRef.current;
        const totalTime = performance.now() - startTimeRef.current;
        
        const color = totalTime > 2000 ? '#ef4444' : totalTime > 1000 ? '#f59e0b' : '#10b981';
        
        console.log(
            `%c✅ [${shortName}] TOTAL: ${totalTime.toFixed(0)}ms (image: ${imageTime.toFixed(0)}ms)`,
            `color: ${color}; font-weight: bold;`
        );
        
        setImageLoading(false);
    };
    
    const handleImageError = () => {
        const totalTime = performance.now() - startTimeRef.current;
        console.error(`%c❌ [${shortName}] FAILED after ${totalTime.toFixed(0)}ms`, 'color: #ef4444; font-weight: bold;');
        setImageLoading(false);
        setImageError(true);
    };

    return (
        <div 
            onClick={onClick}
            style={{ 
                cursor: 'pointer',
                position: 'relative',
                width: '100%',
                height: 120,
                borderRadius: 8,
                overflow: 'hidden',
                background: '#f5f5f5',
                border: isSelected ? '3px solid #1677ff' : '1px solid #e8e8e8',
                transition: 'border 0.2s ease'
            }}
        >
            {previewUrl && !imageError ? (
                <>
                    {imageLoading && (
                        <div style={{
                            position: 'absolute',
                            inset: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                        }}>
                            <LoadingOutlined style={{ fontSize: 24, color: 'white' }} />
                        </div>
                    )}
                    <img
                        src={previewUrl}
                        alt={item.properties.title || item.id}
                        style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            display: imageLoading ? 'none' : 'block'
                        }}
                        onLoad={handleImageLoad}
                        onError={handleImageError}
                    />
                </>
            ) : !previewUrl && !imageError ? (
                <div style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                }}>
                    <LoadingOutlined style={{ fontSize: 24, color: 'white' }} />
                </div>
            ) : (
                <div style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                }}>
                    <PictureOutlined style={{ fontSize: 32, color: 'rgba(255,255,255,0.5)' }} />
                </div>
            )}

            {/* Overlay with title */}
            <div style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                padding: '8px',
                background: 'linear-gradient(transparent, rgba(0,0,0,0.7))',
                color: 'white'
            }}>
                <div style={{ 
                    fontSize: 11, 
                    fontWeight: 600,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                }}>
                    {item.properties.title || getAssetFileName(item) || item.id}
                </div>
            </div>

            {/* Selected indicator */}
            {isSelected && (
                <div style={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    background: '#1677ff',
                    borderRadius: '50%',
                    width: 24,
                    height: 24,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}>
                    <EyeOutlined style={{ color: 'white', fontSize: 12 }} />
                </div>
            )}
        </div>
    );
};

// React.memo ilə optimize et - yalnız props dəyişdikdə re-render olsun
const RasterThumbnail = memo(RasterThumbnailComponent, (prevProps, nextProps) => {
    // Yalnız bu prop-lar dəyişdikdə re-render et
    return (
        prevProps.item.id === nextProps.item.id &&
        prevProps.isSelected === nextProps.isSelected
    );
});

export default RasterThumbnail;