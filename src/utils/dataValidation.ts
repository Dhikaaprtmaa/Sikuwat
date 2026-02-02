/**
 * Data Validation and Synchronization Utilities
 * Ensures consistent validation across AdminPanel, UserPanel, and Dashboard
 */

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface MarketPrice {
  commodity: string;
  price: number;
  unit: string;
  date?: string;
}

export interface Article {
  title: string;
  content: string;
  source?: string;
  url?: string;
  image_url?: string;
}

export interface Tip {
  title: string;
  content: string;
  category?: string;
}

export interface Planting {
  seed_type: string;
  seed_count: number;
  planting_date: string;
  harvest_date?: string;
  harvest_yield?: number;
  sales_amount?: number;
  user_id?: string;
}

/**
 * Validate Market Price Data
 */
export function validateMarketPrice(data: Partial<MarketPrice>): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required fields
  if (!data.commodity || !data.commodity.trim()) {
    errors.push('Nama komoditas harus diisi');
  } else if (data.commodity.trim().length < 3) {
    errors.push('Nama komoditas minimal 3 karakter');
  }

  if (!data.price || data.price <= 0) {
    errors.push('Harga harus diisi dan lebih dari 0');
  } else if (!Number.isFinite(data.price)) {
    errors.push('Harga harus berupa angka valid');
  }

  if (!data.unit || !data.unit.trim()) {
    errors.push('Satuan harus diisi');
  }

  // Warnings
  if (data.price && data.price > 1000000) {
    warnings.push('Harga terlihat sangat tinggi, mohon verifikasi');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validate Article Data
 */
export function validateArticle(data: Partial<Article>): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required fields
  if (!data.title || !data.title.trim()) {
    errors.push('Judul artikel harus diisi');
  } else if (data.title.trim().length < 5) {
    errors.push('Judul minimal 5 karakter');
  } else if (data.title.trim().length > 500) {
    errors.push('Judul maksimal 500 karakter');
  }

  if (!data.content || !data.content.trim()) {
    errors.push('Konten artikel harus diisi');
  } else if (data.content.trim().length < 20) {
    errors.push('Konten minimal 20 karakter');
  } else if (data.content.trim().length > 50000) {
    errors.push('Konten terlalu panjang (max 50000 karakter)');
  }

  // Optional field warnings
  if (data.url) {
    try {
      new URL(data.url);
    } catch {
      warnings.push('URL tidak valid');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validate Tip Data
 */
export function validateTip(data: Partial<Tip>): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required fields
  if (!data.title || !data.title.trim()) {
    errors.push('Judul tips harus diisi');
  } else if (data.title.trim().length < 5) {
    errors.push('Judul minimal 5 karakter');
  } else if (data.title.trim().length > 500) {
    errors.push('Judul maksimal 500 karakter');
  }

  if (!data.content || !data.content.trim()) {
    errors.push('Konten tips harus diisi');
  } else if (data.content.trim().length < 20) {
    errors.push('Konten minimal 20 karakter');
  } else if (data.content.trim().length > 10000) {
    errors.push('Konten terlalu panjang');
  }

  if (!data.category || !data.category.trim()) {
    warnings.push('Kategori sebaiknya diisi untuk organisasi yang lebih baik');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validate Planting Data
 */
export function validatePlanting(data: Partial<Planting>): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required fields
  if (!data.seed_type || !data.seed_type.trim()) {
    errors.push('Jenis bibit harus diisi');
  } else if (data.seed_type.trim().length < 3) {
    errors.push('Jenis bibit minimal 3 karakter');
  }

  if (!data.seed_count || data.seed_count <= 0) {
    errors.push('Jumlah bibit harus diisi dan lebih dari 0');
  } else if (!Number.isInteger(data.seed_count)) {
    errors.push('Jumlah bibit harus berupa angka bulat');
  }

  if (!data.planting_date) {
    errors.push('Tanggal tanam harus diisi');
  } else {
    // Validate date format
    const date = new Date(data.planting_date);
    if (isNaN(date.getTime())) {
      errors.push('Tanggal tanam tidak valid');
    } else if (date > new Date()) {
      errors.push('Tanggal tanam tidak boleh di masa depan');
    }
  }

  // Optional fields validation
  if (data.harvest_date) {
    const harvestDate = new Date(data.harvest_date);
    const plantingDate = new Date(data.planting_date || '');
    
    if (isNaN(harvestDate.getTime())) {
      errors.push('Tanggal panen tidak valid');
    } else if (harvestDate < plantingDate) {
      errors.push('Tanggal panen harus setelah tanggal tanam');
    }
  }

  if (data.harvest_yield !== undefined) {
    if (data.harvest_yield < 0) {
      errors.push('Hasil panen tidak boleh negatif');
    } else if (!Number.isFinite(data.harvest_yield)) {
      errors.push('Hasil panen harus berupa angka valid');
    }
  }

  if (data.sales_amount !== undefined) {
    if (data.sales_amount < 0) {
      errors.push('Jumlah penjualan tidak boleh negatif');
    } else if (!Number.isFinite(data.sales_amount)) {
      errors.push('Jumlah penjualan harus berupa angka valid');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Sanitize string input to prevent XSS
 */
export function sanitizeString(str: string): string {
  if (!str) return '';
  return str
    .trim()
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .slice(0, 10000); // Max length
}

/**
 * Format currency for display
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(amount);
}

/**
 * Format date for display
 */
export function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  } catch {
    return dateString;
  }
}

/**
 * Calculate statistics from plantings array
 */
export function calculatePlantingStats(plantings: Planting[]) {
  if (!Array.isArray(plantings)) {
    return {
      totalPlantings: 0,
      totalHarvested: 0,
      totalYield: 0,
      totalRevenue: 0,
      avgYield: 0,
      successRate: 0
    };
  }

  const totalPlantings = plantings.length;
  const harvestedPlantings = plantings.filter(p => p.harvest_yield && p.harvest_yield > 0);
  const totalHarvested = harvestedPlantings.length;
  const totalYield = harvestedPlantings.reduce((sum, p) => sum + (p.harvest_yield || 0), 0);
  const totalRevenue = harvestedPlantings.reduce((sum, p) => sum + (p.sales_amount || 0), 0);
  const avgYield = totalHarvested > 0 ? totalYield / totalHarvested : 0;
  const successRate = totalPlantings > 0 ? (totalHarvested / totalPlantings) * 100 : 0;

  return {
    totalPlantings,
    totalHarvested,
    totalYield: Math.round(totalYield * 100) / 100,
    totalRevenue: Math.round(totalRevenue * 100) / 100,
    avgYield: Math.round(avgYield * 100) / 100,
    successRate: Math.round(successRate * 100) / 100
  };
}

/**
 * Detect duplicate data
 */
export function isDuplicate(newData: any, existingArray: any[], compareFields: string[]): boolean {
  return existingArray.some(existing => {
    return compareFields.every(field => {
      return existing[field] === newData[field];
    });
  });
}

/**
 * Retry async operation with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> {
  let lastError: Error | null = null;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delayMs * Math.pow(2, i)));
      }
    }
  }

  throw lastError || new Error('Max retries exceeded');
}

/**
 * Log data sync event for debugging
 */
export function logDataSync(component: string, action: string, data: any, result: 'success' | 'error', details?: any) {
  const timestamp = new Date().toISOString();
  const log = {
    timestamp,
    component,
    action,
    dataType: typeof data,
    result,
    details
  };

  console.log(`[${timestamp}] [${component}] ${action}: ${result.toUpperCase()}`, log);

  // Could send to external logging service here
  // Example: sendToLoggingService(log);
}
