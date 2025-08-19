/**
 * 图片工具函数
 */

/**
 * 获取图片尺寸
 */
export function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.width, height: img.height });
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

/**
 * 计算压缩后的尺寸（保持宽高比）
 */
export function calculateResizedDimensions(
  originalWidth: number,
  originalHeight: number,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number } {
  const ratio = Math.min(maxWidth / originalWidth, maxHeight / originalHeight);
  
  return {
    width: Math.round(originalWidth * ratio),
    height: Math.round(originalHeight * ratio),
  };
}

/**
 * 创建图片缩略图
 */
export function createThumbnail(
  file: File,
  maxWidth: number = 200,
  maxHeight: number = 200
): Promise<string> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      const { width, height } = calculateResizedDimensions(
        img.width,
        img.height,
        maxWidth,
        maxHeight
      );
      
      canvas.width = width;
      canvas.height = height;
      
      ctx?.drawImage(img, 0, 0, width, height);
      
      resolve(canvas.toDataURL('image/jpeg', 0.8));
    };
    
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

/**
 * 检查图片是否支持透明度
 */
export function supportsTransparency(mimeType: string): boolean {
  return ['image/png', 'image/gif', 'image/webp'].includes(mimeType);
}

/**
 * 获取图片的MIME类型
 */
export function getMimeType(format: string): string {
  const formatMap: Record<string, string> = {
    'JPEG': 'image/jpeg',
    'PNG': 'image/png',
    'GIF': 'image/gif',
    'BMP': 'image/bmp',
    'WEBP': 'image/webp',
  };
  
  return formatMap[format.toUpperCase()] || 'image/jpeg';
} 