import { ImageFile, ProcessingFunction, ProcessingSettings, GlobalSettings } from '../types';
import { TauriImageProcessingService } from './tauriImageProcessing';
import { t } from '../i18n';

export interface ProcessingResult {
  success: boolean;
  processedImages: ImageFile[];
  error?: string;
}

export class ImageProcessingService {
  /**
   * 检测当前环境并选择最佳处理方法
   */
  private static isTauriEnvironment(): boolean {
    return typeof window !== 'undefined' && '__TAURI__' in window;
  }

  /**
   * 创建一个测试Canvas来验证Canvas API是否正常工作
   */
  private static async testCanvasAPI(): Promise<boolean> {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 100;
      canvas.height = 100;
      const ctx = canvas.getContext('2d');

      if (!ctx) return false;

      // 绘制一个简单的矩形
      ctx.fillStyle = '#FF0000';
      ctx.fillRect(0, 0, 50, 50);

      // 尝试导出
      const dataURL = canvas.toDataURL('image/jpeg', 0.8);
      return dataURL.length > 100;
    } catch (error) {
       return false;
    }
  }
  /**
   * 获取正确的MIME类型
   */
  private static getMimeType(format: string): string {
    switch (format.toUpperCase()) {
      case 'JPEG':
      case 'JPG':
        return 'image/jpeg';
      case 'PNG':
        return 'image/png';
      case 'WEBP':
        return 'image/webp';
      case 'GIF':
        return 'image/gif';
      case 'BMP':
        return 'image/bmp';
      default:
        return 'image/jpeg';
    }
  }

  /**
   * 等待图片加载
   */
  private static loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous'; // 避免跨域问题
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(t('services.errors.imageLoadFailed') as string));
      img.src = src;
    });
  }

  /**
   * 从Canvas获取Blob数据（多种方法尝试）
   */
  private static getCanvasBlob(canvas: HTMLCanvasElement, mimeType: string, quality?: number): Promise<Blob> {
    return new Promise((resolve, reject) => {
     

      // 方法1: 尝试使用toBlob (原生方法)
      let toBlobAttempted = false;

      const tryToBlob = () => {
        if (toBlobAttempted) return;
        toBlobAttempted = true;

 
        canvas.toBlob((blob) => {
          if (blob && blob.size > 0) {
             resolve(blob);
          } else {
            console.warn(t('services.messages.toBlobEmpty') as string);
            tryDataURL();
          }
        }, mimeType, quality);

        // 设置超时，如果toBlob没有响应，使用备用方法
        setTimeout(() => {
          if (!toBlobAttempted) {
            console.warn('⚠️ toBlob超时，使用备用方法');
            tryDataURL();
          }
        }, 2000);
      };

      // 方法2: 使用toDataURL作为备用方案
      const tryDataURL = () => {
        try {
          console.log('🔄 尝试方法2: canvas.toDataURL()');

          const dataURL = canvas.toDataURL(mimeType, quality);

          if (!dataURL || dataURL === 'data:,' || dataURL.length < 100) {
            throw new Error(`DataURL无效: 长度=${dataURL?.length || 0}`);
          }

          console.log(`📊 DataURL长度: ${dataURL.length}`);

          // 将DataURL转换为Blob
          const base64Data = dataURL.split(',')[1];
          if (!base64Data) {
            throw new Error('无法提取base64数据');
          }

          const binaryString = atob(base64Data);
          const bytes = new Uint8Array(binaryString.length);

          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }

          const blob = new Blob([bytes], { type: mimeType });

 
          if (blob.size === 0) {
            throw new Error('转换后的Blob大小为0');
          }

          resolve(blob);

        } catch (error) {
          console.error('❌ DataURL方法也失败:', error);
          tryImageData();
        }
      };

      // 方法3: 使用ImageData作为最后的备用方案
      const tryImageData = () => {
        try {
 
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            throw new Error('无法获取Canvas上下文');
          }

          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

          // 创建一个新的Canvas来重新绘制
          const tempCanvas = document.createElement('canvas');
          tempCanvas.width = canvas.width;
          tempCanvas.height = canvas.height;
          const tempCtx = tempCanvas.getContext('2d');

          if (!tempCtx) {
            throw new Error('无法创建临时Canvas上下文');
          }

          tempCtx.putImageData(imageData, 0, 0);

          // 强制使用JPEG格式作为最后的尝试
          const fallbackDataURL = tempCanvas.toDataURL('image/jpeg', 0.9);

          if (!fallbackDataURL || fallbackDataURL === 'data:,') {
            throw new Error('所有方法都失败了');
          }

          const base64Data = fallbackDataURL.split(',')[1];
          const binaryString = atob(base64Data);
          const bytes = new Uint8Array(binaryString.length);

          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }

          const blob = new Blob([bytes], { type: 'image/jpeg' });

          console.log(`✅ ImageData方法成功: ${blob.size} bytes (强制JPEG格式)`);

          if (blob.size === 0) {
            throw new Error('最终生成的Blob仍然是0字节');
          }

          resolve(blob);

        } catch (error) {
          console.error('❌ 所有方法都失败了:', error);
          reject(new Error(`无法生成图片数据: ${error instanceof Error ? error.message : String(error)}`));
        }
      };

      // 开始尝试第一种方法
      tryToBlob();
    });
  }
  /**
   * 使用简化方法压缩图片（针对Tauri环境优化）
   */
  static async compressImagesSimple(
    images: ImageFile[],
    settings: ProcessingSettings['compress']
  ): Promise<ProcessingResult> {
    try {
      const processedImages: ImageFile[] = [];

      for (const image of images) {
        console.log(`🔄 开始处理: ${image.name}`);

        // 创建图片元素
        const img = new Image();
        img.crossOrigin = 'anonymous';

        // 等待图片加载
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = () => reject(new Error('图片加载失败'));
          img.src = image.url;
        });

        console.log(`📐 图片尺寸: ${img.width}x${img.height}`);

        // 创建Canvas
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d', { alpha: false }); // 禁用alpha通道可能有助于JPEG

        if (!ctx) {
          throw new Error('无法创建Canvas上下文');
        }

        canvas.width = img.width;
        canvas.height = img.height;

        // 设置白色背景（对JPEG很重要）
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // 绘制图片
        ctx.drawImage(img, 0, 0);

        // 强制使用JPEG格式和固定质量
        const quality = (settings?.quality || 80) / 100;
        console.log(`🎨 压缩质量: ${quality}`);

        // 使用toDataURL方法（在Tauri中更可靠）
        const dataURL = canvas.toDataURL('image/jpeg', quality);

        if (!dataURL || dataURL.length < 1000) {
          throw new Error(`生成的DataURL无效，长度: ${dataURL?.length || 0}`);
        }

        console.log(`📊 DataURL长度: ${dataURL.length}`);

        // 转换为Blob
        const response = await fetch(dataURL);
        const blob = await response.blob();

        console.log(`✅ 生成Blob: ${blob.size} bytes`);

        if (blob.size === 0) {
          throw new Error('生成的Blob大小为0');
        }

        const processedImage: ImageFile = {
          id: `${image.id}_compressed`,
          name: `${image.name.replace(/\.[^/.]+$/, '')}_compressed.jpg`,
          size: blob.size,
          type: 'image/jpeg',
          url: URL.createObjectURL(blob),
          file: new File([blob], `${image.name}_compressed.jpg`, { type: 'image/jpeg' }),
        };

        processedImages.push(processedImage);
        console.log(`✅ 处理完成: ${image.name} -> ${processedImage.name}`);
      }

      return {
        success: true,
        processedImages,
      };
    } catch (error) {
      console.error('❌ 简化压缩失败:', error);
      return {
        success: false,
        processedImages: [],
        error: error instanceof Error ? error.message : '压缩失败',
      };
    }
  }

  /**
   * 压缩图片（原方法，保留作为备用）
   */
  static async compressImages(
    images: ImageFile[],
    settings: ProcessingSettings['compress']
  ): Promise<ProcessingResult> {
    try {
      const processedImages: ImageFile[] = [];
      
      for (const image of images) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          throw new Error('无法创建Canvas上下文');
        }

        const img = await this.loadImage(image.url);

        console.log(`🖼️ 处理图片: ${image.name}, 原始尺寸: ${img.width}x${img.height}, 原始大小: ${image.size} bytes`);

        // 验证图片是否正确加载
        if (img.width === 0 || img.height === 0) {
          throw new Error(`图片尺寸无效: ${img.width}x${img.height}`);
        }

        canvas.width = img.width;
        canvas.height = img.height;

        // 检查Canvas状态
        console.log(`🎨 Canvas尺寸设置: ${canvas.width}x${canvas.height}`);

        // 清除Canvas并设置白色背景（对于JPEG格式很重要）
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // 绘制图片
        ctx.drawImage(img, 0, 0);

        // 验证Canvas内容
        const imageData = ctx.getImageData(0, 0, Math.min(10, canvas.width), Math.min(10, canvas.height));
        const pixelSum = Array.from(imageData.data.slice(0, 12)).reduce((a, b) => a + b, 0);
        console.log(`🔍 Canvas像素数据样本: ${imageData.data.slice(0, 12)}, 像素和: ${pixelSum}`);

        if (pixelSum === 0) {
          console.warn('⚠️ Canvas像素数据全为0，可能绘制失败');
        }
        
        const quality = settings?.quality || 80;
        const format = 'JPEG'; // 使用默认格式
        const mimeType = this.getMimeType(format);

        const blob = await this.getCanvasBlob(canvas, mimeType, quality / 100);
        console.log(`✅ 压缩成功: ${image.name}, 原始大小: ${image.size}, 压缩后: ${blob.size}, 质量: ${quality}%`);
        
        const processedImage: ImageFile = {
          id: `${image.id}_compressed`,
          name: `${image.name.replace(/\.[^/.]+$/, '')}_compressed.${format.toLowerCase()}`,
          size: blob.size,
          type: mimeType,
          url: URL.createObjectURL(blob),
          file: new File([blob], `${image.name}_compressed.${format.toLowerCase()}`, { type: mimeType }),
        };
        
        processedImages.push(processedImage);
      }
      
      return {
        success: true,
        processedImages,
      };
    } catch (error) {
      return {
        success: false,
        processedImages: [],
        error: error instanceof Error ? error.message : '压缩失败',
      };
    }
  }

  /**
   * 添加水印
   */
  static async addWatermark(
    images: ImageFile[],
    settings: ProcessingSettings['watermark']
  ): Promise<ProcessingResult> {
    try {
      const processedImages: ImageFile[] = [];
      
      for (const image of images) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          throw new Error('无法创建Canvas上下文');
        }

        const img = await this.loadImage(image.url);

        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        
        if (ctx && settings) {
          ctx.font = `${settings.fontSize}px Arial`;
          ctx.fillStyle = `rgba(0, 0, 0, ${settings.opacity})`;
          
          const text = settings.text || '';
          const textMetrics = ctx.measureText(text);
          const textWidth = textMetrics.width;
          const textHeight = settings.fontSize || 24;
          
          let x = 0;
          let y = 0;
          
          switch (settings.position) {
            case 'top-left':
              x = 10;
              y = textHeight + 10;
              break;
            case 'top-right':
              x = canvas.width - textWidth - 10;
              y = textHeight + 10;
              break;
            case 'bottom-left':
              x = 10;
              y = canvas.height - 10;
              break;
            case 'bottom-right':
              x = canvas.width - textWidth - 10;
              y = canvas.height - 10;
              break;
            case 'center':
              x = (canvas.width - textWidth) / 2;
              y = (canvas.height + textHeight) / 2;
              break;
          }
          
          ctx.fillText(text, x, y);
        }
        
        const blob = await this.getCanvasBlob(canvas, image.type);
        console.log(`✅ 水印添加成功: ${image.name}, 大小: ${blob.size}`);
        
        const processedImage: ImageFile = {
          id: `${image.id}_watermarked`,
          name: `${image.name.replace(/\.[^/.]+$/, '')}_watermarked${image.name.match(/\.[^/.]+$/)?.[0] || ''}`,
          size: blob.size,
          type: image.type,
          url: URL.createObjectURL(blob),
          file: new File([blob], `${image.name}_watermarked`, { type: image.type }),
        };
        
        processedImages.push(processedImage);
      }
      
      return {
        success: true,
        processedImages,
      };
    } catch (error) {
      return {
        success: false,
        processedImages: [],
        error: error instanceof Error ? error.message : '添加水印失败',
      };
    }
  }

  /**
   * 格式转换
   */
  static async convertFormat(
    images: ImageFile[],
    settings: ProcessingSettings['convert']
  ): Promise<ProcessingResult> {
    try {
      const processedImages: ImageFile[] = [];
      
      for (const image of images) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          throw new Error('无法创建Canvas上下文');
        }

        const img = await this.loadImage(image.url);

        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        const format = settings?.format || 'JPEG';
        const mimeType = this.getMimeType(format);

        const blob = await this.getCanvasBlob(canvas, mimeType);
        console.log(`✅ 格式转换成功: ${image.name} -> ${format}, 大小: ${blob.size}`);
        
        const processedImage: ImageFile = {
          id: `${image.id}_converted`,
          name: `${image.name.replace(/\.[^/.]+$/, '')}.${format.toLowerCase()}`,
          size: blob.size,
          type: mimeType,
          url: URL.createObjectURL(blob),
          file: new File([blob], `${image.name.replace(/\.[^/.]+$/, '')}.${format.toLowerCase()}`, { type: mimeType }),
        };
        
        processedImages.push(processedImage);
      }
      
      return {
        success: true,
        processedImages,
      };
    } catch (error) {
      return {
        success: false,
        processedImages: [],
        error: error instanceof Error ? error.message : '格式转换失败',
      };
    }
  }



  /**
   * 处理图片（智能选择处理方法）
   */
  static async processImages(
    images: ImageFile[],
    functionName: ProcessingFunction,
    settings: ProcessingSettings
  ): Promise<ProcessingResult> {
    // 首先测试Canvas API是否正常工作
    const canvasWorking = await this.testCanvasAPI();
    console.log(`🔧 Canvas API测试结果: ${canvasWorking ? '正常' : '异常'}`);

    switch (functionName) {
      case 'compress':
        // 在Tauri环境或Canvas API异常时，优先使用简化方法
        if (this.isTauriEnvironment() || !canvasWorking) {
          console.log('🔄 使用简化压缩方法（Tauri优化）');
          const result = await this.compressImagesSimple(images, settings.compress);

          // 如果简化方法失败，尝试原方法
          if (!result.success) {
            console.log('🔄 简化方法失败，尝试原方法');
            return this.compressImages(images, settings.compress);
          }

          return result;
        } else {
          console.log('🔄 使用标准压缩方法');
          return this.compressImages(images, settings.compress);
        }

      case 'watermark':
        return this.addWatermark(images, settings.watermark);
      case 'convert':
        return this.convertFormat(images, settings.convert);

      default:
        return {
          success: false,
          processedImages: [],
          error: `暂不支持 "${functionName}" 功能，请选择其他功能`,
        };
    }
  }
} 