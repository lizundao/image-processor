/**
 * 文件工具函数
 */

/**
 * 格式化文件大小
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * 获取文件扩展名
 */
export function getFileExtension(filename: string): string {
  return filename.slice((filename.lastIndexOf('.') - 1 >>> 0) + 2);
}

/**
 * 检查是否为图片文件
 */
export function isImageFile(file: File): boolean {
  const imageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/bmp', 'image/webp'];
  return imageTypes.includes(file.type);
}

/**
 * 生成唯一ID
 */
export function generateId(): string {
  return Math.random().toString(36).substr(2, 9);
}

/**
 * 下载文件
 */
export function downloadFile(url: string, filename: string): void {
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * 批量下载文件
 */
export function downloadFiles(files: Array<{ url: string; name: string }>): void {
  files.forEach((file, index) => {
    setTimeout(() => {
      downloadFile(file.url, file.name);
    }, index * 100);
  });
} 