import { Timestamp } from 'firebase/firestore';

export interface SiteSettings {
  siteName: string;
  logoUrl: string;
  announcementText: string;
  heroBannerUrl: string;
  heroTitle: string;
  heroSubtitle: string;
  heroCtaText: string;
  paymentBadges: string[];
  supportLinks: string[]; // Formatted as "Label|URL"
  legalLinks: string[];   // Formatted as "Label|URL"
  copyrightText: string;
  updatedAt?: Timestamp | null;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  iconName: string;
  order: number;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

export interface Game {
  id: string;
  title: string;
  slug: string;
  iconUrl: string;
  bannerUrl: string;
  featured: boolean;
  categoryIds: string[];
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

export interface Listing {
  id: string;
  gameId: string;
  gameSlug: string;
  gameTitle: string;
  categoryId: string;
  categoryName: string;
  title: string;
  description: string;
  price: number;
  stock: number;
  deliverySpeed: string;
  sellerName: string;
  sellerRating: number;
  imageUrl: string;
  active: boolean;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

export type OrderStatus = 'Pending' | 'Completed' | 'Cancelled';

export interface Order {
  id: string;
  listingId: string;
  listingTitle: string;
  gameTitle: string;
  categoryName: string;
  sellerName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  buyerUid: string;
  buyerEmail: string;
  buyerName: string;
  deliveryInstructions: string;
  status: OrderStatus;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

export type CurrencyCode = 'USD' | 'INR' | 'EUR' | 'GBP' | 'CAD' | 'AUD';

export interface CurrencyConfig {
  code: CurrencyCode;
  symbol: string;
  rate: number;
}

export const CURRENCIES: Record<CurrencyCode, CurrencyConfig> = {
  USD: { code: 'USD', symbol: '$', rate: 1.0 },
  INR: { code: 'INR', symbol: '₹', rate: 86.5 },
  EUR: { code: 'EUR', symbol: '€', rate: 0.92 },
  GBP: { code: 'GBP', symbol: '£', rate: 0.79 },
  CAD: { code: 'CAD', symbol: 'C$', rate: 1.38 },
  AUD: { code: 'AUD', symbol: 'A$', rate: 1.53 },
};

/** Minimum withdrawal limit in Indian Rupees */
export const MIN_WITHDRAWAL_INR = 1000;

/** Converts ₹1000 INR into the target currency */
export function getMinWithdrawalInCurrency(currency: CurrencyCode): number {
  if (currency === 'INR') return MIN_WITHDRAWAL_INR;
  const inUsd = MIN_WITHDRAWAL_INR / CURRENCIES.INR.rate;
  const inTarget = inUsd * CURRENCIES[currency].rate;
  return Math.round(inTarget * 100) / 100;
}

export type SellerApplicationStatus = 'Pending' | 'Approved' | 'Rejected' | 'Banned';

export interface SellerApplication {
  id: string;
  userId: string;
  userEmail: string;
  fullName: string;
  address: string;
  phoneNumber: string;
  whatsappNumber: string;
  nationalIdUrl: string;
  status: SellerApplicationStatus;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

export type SellerStatus = 'Active' | 'Banned';

export interface Seller {
  id: string;
  userId: string;
  userEmail: string;
  fullName: string;
  phoneNumber?: string;
  whatsappNumber?: string;
  address?: string;
  status: SellerStatus;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

export interface Wallet {
  userId: string;
  balanceInr: number;
  updatedAt?: Timestamp | null;
}

export type TransactionType = 'Deposit' | 'Purchase' | 'Sale' | 'Withdrawal';
export type TransactionStatus = 'Completed' | 'Pending' | 'Rejected';

export interface WalletTransaction {
  id: string;
  userId: string;
  type: TransactionType;
  amountInr: number;
  description: string;
  status: TransactionStatus;
  payoutDetails?: string;
  createdAt?: Timestamp | null;
}

// Blueprint-synchronized validation constants
export const FIELD_LIMITS = {
  SITE_NAME_MAX: 80,
  ANNOUNCEMENT_MAX: 240,
  HERO_TITLE_MAX: 140,
  HERO_SUBTITLE_MAX: 300,
  HERO_CTA_MAX: 60,
  COPYRIGHT_MAX: 160,
  IMAGE_URL_MAX: 600000,
  CATEGORY_NAME_MAX: 60,
  CATEGORY_DESC_MAX: 200,
  GAME_TITLE_MAX: 100,
  LISTING_TITLE_MAX: 140,
  LISTING_DESC_MAX: 2000,
  DELIVERY_SPEED_MAX: 40,
  SELLER_NAME_MAX: 60,
  ORDER_INSTRUCTIONS_MAX: 500,
  MAX_ARRAY_ITEMS: 10,
} as const;

export const ADMIN_GRANT_TOKEN = 'POLARITH_ADMIN_8825_GRANT';
export const ADMIN_SESSION_STORAGE_KEY = 'beatrix_admin_unlocked_v1';

/**
 * Strips raw HTML tags and trims text to prevent XSS and enforce maxLength.
 */
export function sanitizeText(input: string, maxLength: number): string {
  if (typeof input !== 'string') return '';
  return input
    .replace(/[<>]/g, '')
    .trim()
    .slice(0, maxLength);
}

/**
 * Generates a clean URL-safe lowercase slug matching ^[a-z0-9\-]+$
 */
export function sanitizeSlug(input: string, maxLength = 60): string {
  const cleaned = input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, maxLength);
  return cleaned || 'item';
}

/**
 * Validates that a URL is either empty, a valid http(s) URL, a local asset path, or a safe image data URI.
 */
export function isValidImageUrlOrDataUri(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return true;
  if (trimmed.length > FIELD_LIMITS.IMAGE_URL_MAX) return false;
  if (trimmed.startsWith('data:image/')) return true;
  if (trimmed.startsWith('/')) return true;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

/**
 * Compresses an uploaded image File into an optimized JPEG data URI suitable for Firestore storage (< 350KB).
 */
export async function compressImageToDataUrl(
  file: File,
  maxWidth = 1200,
  maxHeight = 720,
  quality = 0.78
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('Selected file must be an image.'));
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Invalid image file format.'));
      img.onload = () => {
        let { width, height } = img;
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Browser canvas context unavailable.'));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        if (dataUrl.length > FIELD_LIMITS.IMAGE_URL_MAX) {
          const lowerQualityUrl = canvas.toDataURL('image/jpeg', 0.5);
          if (lowerQualityUrl.length > FIELD_LIMITS.IMAGE_URL_MAX) {
            reject(new Error('Image is too large even after compression. Please use a smaller image or paste an external URL.'));
            return;
          }
          resolve(lowerQualityUrl);
          return;
        }
        resolve(dataUrl);
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

export function parseFooterLink(raw: string): { label: string; url: string } {
  const parts = raw.split('|');
  const label = sanitizeText(parts[0] || 'Link', 50);
  const url = (parts[1] || '#/').trim();
  return { label, url };
}
