import { GlobalSettings, ImageFile } from '../types';

// 导入 Tauri API
import { writeBinaryFile, createDir, exists } from '@tauri-apps/api/fs';
import { join } from '@tauri-apps/api/path';
import { open } from '@tauri-apps/api/shell';
import { t } from '../i18n';

export interface SaveResult {
  success: boolean;
  savedFiles: string[];
  error?: string;
}

export class FileService {
  /**
   * 保存处理后的图片到指定目录
   */
  static async saveProcessedImages(
    processedImages: ImageFile[],
    globalSettings: GlobalSettings
  ): Promise<SaveResult> {
    try {
      const savedFiles: string[] = [];
      
      // 检查输出目录
      if (!globalSettings.outputDirectory) {
        throw new Error(t('services.errors.outputDirectoryRequired') as string);
      }

      // 确保输出目录存在
      const outputDirExists = await exists(globalSettings.outputDirectory);
      if (!outputDirExists) {
        await createDir(globalSettings.outputDirectory, { recursive: true });
      }

      // 处理每个图片文件
      for (const image of processedImages) {
        try {
          // 生成文件名
          const fileName = this.generateFileName(image, globalSettings);
          const filePath = await join(globalSettings.outputDirectory, fileName);
          
          // 检查文件是否已存在
          if (!globalSettings.overwriteExisting) {
            const fileExists = await exists(filePath);
            if (fileExists) {
              continue;
            }
          }

          // 检查文件大小

          if (image.file.size === 0) {
            continue;
          }

          // 将 File 对象转换为 Uint8Array
          const arrayBuffer = await image.file.arrayBuffer();
          const uint8Array = new Uint8Array(arrayBuffer);


          // 保存文件
          await writeBinaryFile(filePath, uint8Array);
          savedFiles.push(filePath);

        } catch (fileError) {
          // 继续处理其他文件，不中断整个流程
        }
      }

      // 如果设置了自动打开输出文件夹
      if (globalSettings.autoOpenOutputFolder && savedFiles.length > 0) {
        try {
          await open(globalSettings.outputDirectory);
        } catch (openError) {
        }
      }

      return {
        success: savedFiles.length > 0,
        savedFiles,
        error: savedFiles.length === 0 ? '没有文件被保存' : undefined
      };

    } catch (error) {
      return {
        success: false,
        savedFiles: [],
        error: error instanceof Error ? error.message : '保存文件失败'
      };
    }
  }

  /**
   * 生成文件名
   */
  private static generateFileName(image: ImageFile, globalSettings: GlobalSettings): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const originalName = image.name.replace(/\.[^/.]+$/, ''); // 移除扩展名
    const extension = this.getFileExtension(image, globalSettings);
    
    let fileName = globalSettings.filenamePattern || '{name}_{timestamp}';
    
    // 替换占位符
    fileName = fileName
      .replace('{name}', originalName)
      .replace('{timestamp}', timestamp)
      .replace('{index}', '1'); // 简单实现，后续可以改进为真实索引
    
    return `${fileName}.${extension}`;
  }

  /**
   * 获取文件扩展名
   */
  private static getFileExtension(image: ImageFile, globalSettings: GlobalSettings): string {
    // 如果设置了输出格式，使用设置的格式
    if (globalSettings.outputFormat && globalSettings.outputFormat !== 'original') {
      return globalSettings.outputFormat.toLowerCase();
    }
    
    // 否则从文件类型推断
    const mimeType = image.type;
    switch (mimeType) {
      case 'image/jpeg':
        return 'jpg';
      case 'image/png':
        return 'png';
      case 'image/webp':
        return 'webp';
      case 'image/gif':
        return 'gif';
      case 'image/bmp':
        return 'bmp';
      default:
        return 'jpg'; // 默认格式
    }
  }

  /**
   * 检查是否在 Tauri 环境中
   */
  static isTauriEnvironment(): boolean {
    return typeof window !== 'undefined' && '__TAURI__' in window;
  }

  /**
   * 浏览器环境下的文件下载（备用方案）
   */
  static downloadInBrowser(processedImages: ImageFile[]): void {
    processedImages.forEach((image, index) => {
      const link = document.createElement('a');
      link.href = image.url;
      link.download = image.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // 添加延迟避免浏览器阻止多个下载
      if (index < processedImages.length - 1) {
        setTimeout(() => {}, 100);
      }
    });
  }
}
