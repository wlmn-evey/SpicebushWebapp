// Photo optimization system types
export interface FocalPoint {
  x: number; // 0-100 percentage from left
  y: number; // 0-100 percentage from top
  weight: number; // 1-10 importance rating
  description: string; // What's at this focal point
}

export interface CropZone {
  desktop: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  tablet: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  mobile: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface PhotoMetadata {
  // File information
  originalFilename: string;
  optimizedFilename: string;
  category: 'homepage' | 'about' | 'programs' | 'admissions' | 'gallery' | 'teachers' | 'blog';
  
  // Dimensions and format
  originalDimensions: {
    width: number;
    height: number;
  };
  aspectRatio: string; // "4:3", "16:9", etc.
  format: 'webp' | 'jpg' | 'png';
  
  // Focal points and positioning
  focalPoints: FocalPoint[];
  primaryFocalPoint: FocalPoint;
  cropZones: CropZone;
  
  // SEO and accessibility
  altText: string;
  seoKeywords: string[];
  contextualDescription: string;
  
  // Usage tracking
  usedOn: string[]; // Array of page/component names
  primaryUse: string; // Main intended use case
  
  // Performance
  compressed: boolean;
  hasWebP: boolean;
  hasSrcSet: boolean;
  lazyLoad: boolean;
}

export interface PhotoVariant {
  width: number;
  height: number;
  format: 'webp' | 'jpg';
  filename: string;
  size: string; // File size
}

export interface OptimizedPhoto {
  metadata: PhotoMetadata;
  variants: PhotoVariant[];
  srcSet: string;
  fallbackSrc: string;
}

// Utility types for component props
export interface ResponsiveImageProps {
  photo: OptimizedPhoto;
  className?: string;
  priority?: boolean; // For above-the-fold images
  sizes?: string; // Custom sizes attribute
  objectFit?: 'cover' | 'contain' | 'fill' | 'scale-down' | 'none';
}

// Photo analysis helpers
export interface PhotoAnalysis {
  hasHumanFaces: boolean;
  hasChildren: boolean;
  hasMonressoriMaterials: boolean;
  dominantColors: string[];
  lighting: 'natural' | 'indoor' | 'mixed';
  activity: string;
  setting: 'classroom' | 'outdoor' | 'mixed' | 'portrait';
}