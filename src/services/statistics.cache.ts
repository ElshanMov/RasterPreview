// src/services/statisticsCache.ts

/**
 * Pre-computed statistics cache for raster files
 * Eliminates 5-50s API calls by storing statistics locally
 * 
 * Generated: 2026-02-02
 * Source: TiTiler statistics endpoint responses
 */

export interface BandStatistics {
  min: number;
  max: number;
  mean: number;
  percentile_2: number;
  percentile_98: number;
}

export interface RasterStatistics {
  b1: BandStatistics;
  b2: BandStatistics;
  b3: BandStatistics;
  b4?: BandStatistics; // Optional for 3-band images
}

export const PRECOMPUTED_STATISTICS: Record<string, RasterStatistics> = {
  // 10254_16bit.tif - 16-bit, 4 bands
  '10254_16bit': {
    b1: {
      min: 0,
      max: 3147,
      mean: 378.18,
      percentile_2: 0,
      percentile_98: 699
    },
    b2: {
      min: 0,
      max: 3411,
      mean: 452.63,
      percentile_2: 0,
      percentile_98: 667
    },
    b3: {
      min: 0,
      max: 3469,
      mean: 491.78,
      percentile_2: 0,
      percentile_98: 690
    },
    b4: {
      min: 0,
      max: 3213,
      mean: 1253.67,
      percentile_2: 0,
      percentile_98: 2300
    }
  },

  // 10218_8bit.tif - 8-bit, 3 bands (RGB)
  '10218_8bit': {
    b1: {
      min: 0,
      max: 255,
      mean: 71.12,
      percentile_2: 0,
      percentile_98: 138
    },
    b2: {
      min: 0,
      max: 255,
      mean: 80.59,
      percentile_2: 0,
      percentile_98: 126
    },
    b3: {
      min: 0,
      max: 255,
      mean: 86.21,
      percentile_2: 0,
      percentile_98: 125
    }
  },

  // 10120-cog-fixed.tif - 16-bit, 3 bands
  '10120-cog-fixed': {
    b1: {
      min: 0,
      max: 4282,
      mean: 388.70,
      percentile_2: 0,
      percentile_98: 759
    },
    b2: {
      min: 0,
      max: 4277,
      mean: 444.19,
      percentile_2: 0,
      percentile_98: 695
    },
    b3: {
      min: 0,
      max: 4190,
      mean: 477.19,
      percentile_2: 0,
      percentile_98: 683
    }
  },

  // 10025-to-cog.tif - 16-bit, 4 bands
  '10025-to-cog': {
    b1: {
      min: 0,
      max: 3292,
      mean: 255.42,
      percentile_2: 0,
      percentile_98: 375
    },
    b2: {
      min: 0,
      max: 3371,
      mean: 394.44,
      percentile_2: 0,
      percentile_98: 562
    },
    b3: {
      min: 0,
      max: 3354,
      mean: 459.08,
      percentile_2: 0,
      percentile_98: 632
    },
    b4: {
      min: 0,
      max: 4095,
      mean: 1498.04,
      percentile_2: 0,
      percentile_98: 2492
    }
  },

  // 10016_16bit.tif - 16-bit, 4 bands
  '10016_16bit': {
    b1: {
      min: 0,
      max: 2502,
      mean: 393.71,
      percentile_2: 0,
      percentile_98: 775
    },
    b2: {
      min: 0,
      max: 2476,
      mean: 473.06,
      percentile_2: 0,
      percentile_98: 706
    },
    b3: {
      min: 0,
      max: 2421,
      mean: 500.28,
      percentile_2: 0,
      percentile_98: 697
    },
    b4: {
      min: 0,
      max: 3243,
      mean: 1494.71,
      percentile_2: 0,
      percentile_98: 2277
    }
  },

  // 10009-cog-fixed.tif - 16-bit, 3 bands
  '10009-cog-fixed': {
    b1: {
      min: 0,
      max: 2550,
      mean: 279.78,
      percentile_2: 0,
      percentile_98: 544
    },
    b2: {
      min: 0,
      max: 2485,
      mean: 416.68,
      percentile_2: 0,
      percentile_98: 605
    },
    b3: {
      min: 0,
      max: 2371,
      mean: 471.45,
      percentile_2: 0,
      percentile_98: 631
    }
  },

  // 10003-to-cog.tif - 16-bit, 4 bands (duplicate of 10025)
  '10003-to-cog': {
    b1: {
      min: 0,
      max: 3292,
      mean: 255.42,
      percentile_2: 0,
      percentile_98: 375
    },
    b2: {
      min: 0,
      max: 3371,
      mean: 394.44,
      percentile_2: 0,
      percentile_98: 562
    },
    b3: {
      min: 0,
      max: 3354,
      mean: 459.08,
      percentile_2: 0,
      percentile_98: 632
    },
    b4: {
      min: 0,
      max: 4095,
      mean: 1498.04,
      percentile_2: 0,
      percentile_98: 2492
    }
  }
};

/**
 * Extract file name from S3 URL or file path
 * Examples:
 *   - "s3://bucket/path/10254_16bit/10254_16bit.tif" → "10254_16bit"
 *   - "10120-cog-fixed.tif" → "10120-cog-fixed"
 */
export function extractFileName(path: string): string {
  const fileName = path.split('/').pop()?.replace('.tif', '') || '';
  return fileName;
}

/**
 * Get cached statistics for a file
 * @param path - S3 URL or file path
 * @returns Statistics object or null if not cached
 */
export function getCachedStatistics(path: string): RasterStatistics | null {
  const fileName = extractFileName(path);
  return PRECOMPUTED_STATISTICS[fileName] || null;
}

/**
 * Check if statistics are available in cache
 */
export function hasStatistics(path: string): boolean {
  return getCachedStatistics(path) !== null;
}

