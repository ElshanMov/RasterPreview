/**
 * RasterThumbnail Component
 * 
 * ✅ CACHE FIRST: Statistics cache-dən oxunur (0.05ms), API fallback (5000ms)
 */

import React, { useState, useEffect, memo, useRef } from 'react';
import { LoadingOutlined, PictureOutlined, EyeOutlined } from '@ant-design/icons';
import type { StacItem } from '../types/raster.map.type';
import { getCachedStatistics } from '../services/statistics.cache';

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

// ✅ Preview URL cache - eyni COG üçün təkrar sorğu getməsin
const previewCache = new Map<string, string>();

// ✅ CACHE FIRST: Statistics cache-dən oxu
const buildPreviewUrl = async (cogUrl: string, shortName: string): Promise<string> => {
    // Preview URL cache yoxla
    const cachedUrl = previewCache.get(cogUrl);
    if (cachedUrl) {
        console.log(`%c⚡ [${shortName}] Preview URL cache hit!`, 'color: #10b981;');
        return cachedUrl;
    }

    const startTime = performance.now();

    try {
        // Get info
        const infoUrl = `${TITILER_BASE}/cog/info?url=${encodeURIComponent(cogUrl)}`;
        const infoStart = performance.now();
        const infoResponse = await fetch(infoUrl);
        
        if (!infoResponse.ok) {
            throw new Error('Info failed');
        }
        
        const info = await infoResponse.json();
        const infoTime = performance.now() - infoStart;
        const bandCount = info.count || 3;

        console.log(
            `%c📊 [${shortName}] Info: ${infoTime.toFixed(0)}ms | bands=${bandCount}`,
            infoTime > 500 ? 'color: #f59e0b;' : 'color: #3b82f6;'
        );

        // ✅ CACHE FIRST - Statistics
        let rescales: string[] = [];
        const cached = getCachedStatistics(cogUrl);
        
        if (cached) {
            // ⚡ CACHE HIT - instant!
            const cacheStart = performance.now();
            
            for (let i = 1; i <= Math.min(bandCount, 3); i++) {
                const bandKey = `b${i}` as 'b1' | 'b2' | 'b3' | 'b4';
                const bandStats = cached[bandKey];
                
                if (bandStats) {
                    const low = Math.floor(bandStats.percentile_2);
                    const high = Math.ceil(bandStats.percentile_98);
                    rescales.push(`${low},${high}`);
                } else {
                    rescales.push('0,255');
                }
            }
            
            const cacheTime = performance.now() - cacheStart;
            console.log(
                `%c⚡ [${shortName}] Statistics CACHE HIT! ${cacheTime.toFixed(2)}ms`,
                'color: #52c41a; font-weight: bold;'
            );
            console.log(`%c   Real rescale:`, 'color: #52c41a;', rescales);
            
        } else {
            // ❌ CACHE MISS - API fallback
            console.log(`%c⚠️ [${shortName}] Cache miss, fetching from API...`, 'color: #f59e0b;');
            
            const statsUrl = `${TITILER_BASE}/cog/statistics?url=${encodeURIComponent(cogUrl)}`;
            const statsStart = performance.now();
            const statsResponse = await fetch(statsUrl);
            
            if (statsResponse.ok) {
                const stats = await statsResponse.json();
                const statsTime = performance.now() - statsStart;
                
                console.log(
                    `%c📈 [${shortName}] Statistics API: ${statsTime.toFixed(0)}ms`,
                    statsTime > 2000 ? 'color: #ef4444;' : statsTime > 1000 ? 'color: #f59e0b;' : 'color: #10b981;'
                );
                
                for (let i = 1; i <= Math.min(bandCount, 3); i++) {
                    const bandKey = `b${i}`;
                    const bandStats = stats[bandKey];
                    
                    if (bandStats && bandStats.percentile_2 !== undefined && bandStats.percentile_98 !== undefined) {
                        const low = Math.floor(bandStats.percentile_2);
                        const high = Math.ceil(bandStats.percentile_98);
                        rescales.push(`${low},${high}`);
                    } else {
                        rescales.push('0,255');
                    }
                }
                
                console.log(`%c✅ [${shortName}] Real rescale from API:`, 'color: #52c41a;', rescales);
            } else {
                // Fallback to default
                rescales = Array(Math.min(bandCount, 3)).fill('0,255');
                console.warn(`⚠️ [${shortName}] Statistics failed, using default rescale`);
            }
        }

        // Build URL
        const params = new URLSearchParams();
        params.append('url', cogUrl);
        params.append('max_size', '256');
        
        for (let i = 1; i <= rescales.length; i++) {
            params.append('bidx', String(i));
            params.append('rescale', rescales[i - 1]);
        }
        
        const url = `${TITILER_BASE}/cog/preview.png?${params.toString()}`;
        
        // Cache saxla
        previewCache.set(cogUrl, url);
        
        const totalTime = performance.now() - startTime;
        console.log(
            `%c✅ [${shortName}] Total preview setup: ${totalTime.toFixed(0)}ms ${cached ? '(with cache ⚡)' : '(API)'}`,
            totalTime > 2000 ? 'color: #ef4444;' : 'color: #10b981;'
        );
        
        return url;
        
    } catch (error) {
        console.error(`❌ [${shortName}] Preview URL build failed:`, error);
        
        // Fallback URL
        const params = new URLSearchParams();
        params.append('url', cogUrl);
        params.append('max_size', '256');
        params.append('bidx', '1');
        params.append('bidx', '2');
        params.append('bidx', '3');
        params.append('rescale', '0,255');
        params.append('rescale', '0,255');
        params.append('rescale', '0,255');
        
        return `${TITILER_BASE}/cog/preview.png?${params.toString()}`;
    }
};

const RasterThumbnailComponent: React.FC<RasterThumbnailProps> = ({ 
    item, 
    isSelected, 
    onClick 
}) => {
    const [imageLoading, setImageLoading] = useState(true);
    const [imageError, setImageError] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    
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
                // ✅ Build URL with cache-first statistics
                const url = await buildPreviewUrl(cogUrl, shortName);
                
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
        
        const color = totalTime > 5000 ? '#ef4444' : totalTime > 2000 ? '#f59e0b' : '#10b981';
        
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

// React.memo ilə optimize et
const RasterThumbnail = memo(RasterThumbnailComponent, (prevProps, nextProps) => {
    return (
        prevProps.item.id === nextProps.item.id &&
        prevProps.isSelected === nextProps.isSelected
    );
});

export default RasterThumbnail;