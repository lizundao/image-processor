import { invoke } from '@tauri-apps/api/tauri';
import { ImageFile, ProcessingFunction, ProcessingSettings, GlobalSettings } from '../types';
import { t } from '../i18n';



// Tauri后端返回的结果类型
interface TauriProcessingResult {
  success: boolean;
  processed_files: string[];
  error?: string;
}

// 前端处理结果类型
interface ProcessingResult {
  success: boolean;
  processedImages: ImageFile[];
  error?: string;
}

export class TauriImageProcessingService {
  /**
   * 检查是否在Tauri环境中
   */
  static isTauriEnvironment(): boolean {
    return typeof window !== 'undefined' && '__TAURI__' in window;
  }

  /**
   * 处理图片（主入口 - 简化版本，专注于后端调用）
   */
  static async processImages(
    images: ImageFile[],
    functionName: ProcessingFunction,
    settings: ProcessingSettings,
    globalSettings: GlobalSettings,
    onProgress?: (imageId: string, progress: { status: string; progress?: number; message?: string }) => void
  ): Promise<ProcessingResult> {

    if (!images || images.length === 0) {
      return {
        success: false,
        processedImages: [],
        error: t('services.errors.noImages') as string,
      };
    }

    if (!this.isTauriEnvironment()) {
      return {
        success: false,
        processedImages: [],
        error: t('services.errors.requireDesktopApp') as string,
      };
    }

    if (!globalSettings.outputDirectory) {
      return {
        success: false,
        processedImages: [],
        error: t('services.errors.outputDirectoryRequired') as string,
      };
    }

    try {
      // 准备输入文件路径
      const inputPaths: string[] = [];
      for (let i = 0; i < images.length; i++) {
        const image = images[i];

        onProgress?.(image.id, {
          status: 'processing',
          progress: Math.round((i / images.length) * 30),
          message: t('services.messages.preparingFiles') as string
        });

        if (image.url.startsWith('blob:')) {
          const tempPath = await this.saveBlobToTempFile(image);
          inputPaths.push(tempPath);
        } else {
          inputPaths.push(image.url);
        }
      }

      // 调用后端批量处理
      const result = await this.processBatch(inputPaths, functionName, settings, globalSettings);

      // 清理临时文件
      await this.cleanupTempFiles(inputPaths, images);

      if (result.success) {
        // 通知处理完成
        images.forEach(image => {
          onProgress?.(image.id, {
            status: 'completed',
            progress: 100,
            message: t('services.messages.processingComplete') as string
          });
        });

        // 转换结果为前端格式
        const processedImages: ImageFile[] = result.processed_files.map((filePath: string, index: number) => ({
          id: `processed_${Date.now()}_${index}`,
          name: filePath.split(/[/\\]/).pop() || 'processed_image',
          size: 0,
          type: this.getImageTypeFromPath(filePath),
          url: `file://${filePath}`,
          file: new File([], filePath),
        }));

        return {
          success: true,
          processedImages,
        };
      } else {
        // 通知处理失败
        images.forEach(image => {
          onProgress?.(image.id, {
            status: 'error',
            progress: 0,
            message: result.error || t('services.errors.processingFailed') as string
          });
        });

        return {
          success: false,
          processedImages: [],
          error: result.error || t('services.errors.processingFailed') as string,
        };
      }

    } catch (error) {
      return {
        success: false,
        processedImages: [],
        error: error instanceof Error ? error.message : t('services.errors.unknownError') as string,
      };
    }
  }

  /**
   * 将blob文件保存到临时目录（简化版本，仅用于后端处理）
   */
  private static async saveBlobToTempFile(image: ImageFile): Promise<string> {
    try {
      // 获取临时目录
      const { appDataDir, join } = await import('@tauri-apps/api/path');
      const { writeBinaryFile, createDir, exists } = await import('@tauri-apps/api/fs');

      const tempDir = await appDataDir();
      const tempImageDir = await join(tempDir, 'temp_images');

      // 确保临时目录存在
      if (!(await exists(tempImageDir))) {
        await createDir(tempImageDir, { recursive: true });
      }

      // 使用原始文件名，避免冲突时添加时间戳
      const originalName = image.name || 'image';
      
      // 优先使用原始文件名的扩展名，如果没有则使用MIME类型
      let extension: string;
      if (originalName.includes('.')) {
        // 从原始文件名获取扩展名
        extension = originalName.split('.').pop() || 'jpg';
      } else {
        // 使用MIME类型作为备选
        extension = image.type.split('/')[1] || 'jpg';
      }
      
      // 清理文件名，移除不安全的字符
      const safeName = originalName.replace(/[<>:"/\\|?*]/g, '_');
      let tempFileName = `${safeName}.${extension}`;
      let tempFilePath = await join(tempImageDir, tempFileName);
      
      // 如果文件已存在，添加时间戳避免冲突
      if (await exists(tempFilePath)) {
        const timestamp = Date.now();
        tempFileName = `${safeName}_${timestamp}.${extension}`;
        tempFilePath = await join(tempImageDir, tempFileName);
      }

      // 将File对象转换为Uint8Array并保存
      const arrayBuffer = await image.file.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      await writeBinaryFile(tempFilePath, uint8Array);

      return tempFilePath;
    } catch (error) {
      throw new Error(`保存临时文件失败: ${error}`);
    }
  }

  /**
   * 获取可用于后端处理/预览的本地文件路径。
   * - blob: 源 → 转存到临时目录并返回路径
   * - file:// → 去掉协议前缀
   * - 其他 → 原样返回
   */
  static async ensureLocalPathForImage(image: ImageFile): Promise<string> {
    const url = image.url || '';
    if (url.startsWith('blob:')) {
      return await this.saveBlobToTempFile(image);
    }
    if (url.startsWith('file://')) {
      return url.replace('file://', '');
    }
    return url;
  }

  /**
   * 批量处理（用于不支持单张处理的功能）
   */
  private static async processBatch(
    inputPaths: string[],
    functionName: ProcessingFunction,
    settings: ProcessingSettings,
    globalSettings: GlobalSettings
  ): Promise<TauriProcessingResult> {

    
    switch (functionName) {
      case 'compress':
        const compressQuality = settings.compress?.quality || globalSettings.quality;
        return await invoke('compress_images', {
          inputPaths: inputPaths,
          settings: {
            quality: compressQuality,
            format: globalSettings.outputFormat || 'original',
          },
          globalSettings: {
            output_directory: globalSettings.outputDirectory,
            output_format: globalSettings.outputFormat,
            quality: settings.compress?.quality || globalSettings.quality || 80,
            filename_pattern: globalSettings.filenamePattern,
            overwrite_existing: globalSettings.overwriteExisting,

          },
        });

      case 'watermark':
        return await invoke('add_watermark', {
          inputPaths: inputPaths,
          settings: {
            watermark_type: settings.watermark?.type || 'text',
            text: settings.watermark?.text || 'Watermark',
            font_size: settings.watermark?.fontSize || 24,
            font_color: settings.watermark?.fontColor || '#000000',
            font_weight: settings.watermark?.fontWeight || 'normal',
            font_family: settings.watermark?.fontFamily || 'Arial',
            position: settings.watermark?.position || 'bottom-right',
            opacity: settings.watermark?.opacity || 0.5,
            margin_x: settings.watermark?.marginX || 20,
            margin_y: settings.watermark?.marginY || 20,
            image_path: settings.watermark?.imagePath,
            image_scale: settings.watermark?.imageScale || 1.0,
          },
          globalSettings: {
            output_directory: globalSettings.outputDirectory,
            output_format: globalSettings.outputFormat,
            quality: globalSettings.quality,
            filename_pattern: globalSettings.filenamePattern,
            overwrite_existing: globalSettings.overwriteExisting,
          },
        });

      case 'convert':
        return await invoke('convert_format', {
          inputPaths: inputPaths,
          settings: {
            format: settings.convert?.format || 'JPEG',
            quality: settings.convert?.quality || globalSettings.quality || 85,
            preserve_transparency: settings.convert?.preserveTransparency || true,
            preserve_metadata: settings.convert?.preserveMetadata || false,
            background_color: settings.convert?.backgroundColor || '#FFFFFF',
            compression_level: settings.convert?.compressionLevel || 9, // 默认使用最高压缩
            progressive: settings.convert?.progressive || false,
          },
          globalSettings: {
            output_directory: globalSettings.outputDirectory,
            output_format: globalSettings.outputFormat,
            quality: globalSettings.quality,
            filename_pattern: globalSettings.filenamePattern,
            overwrite_existing: globalSettings.overwriteExisting,
          },
        });

      case 'resize':
        return await invoke('resize_images_simple', {
          inputPaths: inputPaths,
          settings: {
            width: settings.resize?.width,
            height: settings.resize?.height,
          },
          globalSettings: {
            output_directory: globalSettings.outputDirectory,
            output_format: globalSettings.outputFormat,
            quality: globalSettings.quality,
            filename_pattern: globalSettings.filenamePattern,
            overwrite_existing: globalSettings.overwriteExisting,
          },
        });

      case 'crop':
        return await invoke('crop_images', {
          inputPaths: inputPaths,
          settings: {
            mode: settings.crop?.mode || 'ratio',
            aspect_ratio: settings.crop?.aspectRatio || 1.0,
            custom_ratio_width: settings.crop?.customRatioWidth,
            custom_ratio_height: settings.crop?.customRatioHeight,
            x: settings.crop?.x,
            y: settings.crop?.y,
            width: settings.crop?.width,
            height: settings.crop?.height,
            output_format: settings.crop?.outputFormat || 'JPEG',
            quality: settings.crop?.quality || 85,
          },
          globalSettings: {
            output_directory: globalSettings.outputDirectory,
            output_format: globalSettings.outputFormat,
            quality: globalSettings.quality,
            filename_pattern: globalSettings.filenamePattern,
            overwrite_existing: globalSettings.overwriteExisting,
          },
        });

      case 'rotate':
        return await invoke('rotate_images', {
          inputPaths: inputPaths,
          settings: {
            angle: settings.rotate?.angle || 0,
          },
          globalSettings: {
            output_directory: globalSettings.outputDirectory,
            output_format: globalSettings.outputFormat,
            quality: globalSettings.quality,
            filename_pattern: globalSettings.filenamePattern,
            overwrite_existing: globalSettings.overwriteExisting,
          },
        });

      case 'flip':
        return await invoke('flip_images', {
          inputPaths: inputPaths,
          settings: {
            horizontal: settings.flip?.horizontal || false,
            vertical: settings.flip?.vertical || false,
          },
          globalSettings: {
            output_directory: globalSettings.outputDirectory,
            output_format: globalSettings.outputFormat,
            quality: globalSettings.quality,
            filename_pattern: globalSettings.filenamePattern,
            overwrite_existing: globalSettings.overwriteExisting,
          },
        });

      case 'border':
        const borderSettings = {
          width: settings.border?.width || 10,
          color: settings.border?.color || '#000000',
          style: settings.border?.style || 'solid',
          opacity: settings.border?.opacity || 1.0,
          overlay_mode: settings.border?.overlay_mode || false,
          enable_transparency: settings.border?.enable_transparency || false,
          border_radius: settings.border?.border_radius || 0,
        };
        
        return await invoke('add_border', {
          inputPaths: inputPaths,
          settings: borderSettings,
          globalSettings: {
            output_directory: globalSettings.outputDirectory,
            output_format: globalSettings.outputFormat,
            quality: globalSettings.quality,
            filename_pattern: globalSettings.filenamePattern,
            overwrite_existing: globalSettings.overwriteExisting,
          },
        });

      case 'rounded':
        const roundedSettings = {
          radius: settings.rounded?.radius || 0,
        };
        
        return await invoke('add_rounded_corners', {
          inputPaths: inputPaths,
          settings: roundedSettings,
          globalSettings: {
            output_directory: globalSettings.outputDirectory,
            output_format: globalSettings.outputFormat,
            quality: globalSettings.quality,
            filename_pattern: globalSettings.filenamePattern,
            overwrite_existing: globalSettings.overwriteExisting,
          },
        });

      case 'merge':
        const mergeSettings = {
          direction: settings.merge?.direction || 'horizontal',
          spacing: settings.merge?.spacing || 0,
        };
        
        return await invoke('merge_images', {
          inputPaths: inputPaths,
          settings: mergeSettings,
          globalSettings: {
            output_directory: globalSettings.outputDirectory,
            output_format: globalSettings.outputFormat,
            quality: globalSettings.quality,
            filename_pattern: globalSettings.filenamePattern,
            overwrite_existing: globalSettings.overwriteExisting,
          },
        });

      case 'gif':
        const gifSettings = {
          fps: settings.gif?.fps || 10,
          loop_count: settings.gif?.loop_count || 0,
          quality: settings.gif?.quality || 80,
        };
        
        return await invoke('create_gif', {
          inputPaths: inputPaths,
          settings: gifSettings,
          globalSettings: {
            output_directory: globalSettings.outputDirectory,
            output_format: globalSettings.outputFormat,
            quality: globalSettings.quality,
            filename_pattern: globalSettings.filenamePattern,
            overwrite_existing: globalSettings.overwriteExisting,
          },
        });

      case 'enhance':
        const enh = settings as any;
        const enhanceSettings = {
          strength: enh.enhance?.strength ?? 50,
          auto_exposure: enh.enhance?.autoExposure ?? true,
          auto_white_balance: enh.enhance?.autoWhiteBalance ?? false,
          local_contrast: enh.enhance?.localContrast ?? false,
          sharpen: enh.enhance?.sharpen ?? true,
        };
        return await invoke('enhance_images', {
          inputPaths: inputPaths,
          settings: enhanceSettings,
          globalSettings: {
            output_directory: globalSettings.outputDirectory,
            output_format: globalSettings.outputFormat,
            quality: globalSettings.quality,
            filename_pattern: globalSettings.filenamePattern,
            overwrite_existing: globalSettings.overwriteExisting,
          },
        });

      case 'gridSlice':
        const grid = settings as any;
        const gridSliceSettings = {
          rows: grid.gridSlice?.rows ?? 3,
          columns: grid.gridSlice?.columns ?? 3,
          output_format: grid.gridSlice?.outputFormat ?? 'JPEG',
          quality: grid.gridSlice?.quality ?? 85,
          include_original: grid.gridSlice?.includeOriginal ?? false,
          naming_pattern: grid.gridSlice?.namingPattern ?? 'grid_{row}_{col}',
        };
        return await invoke('grid_slice_images', {
          inputPaths: inputPaths,
          settings: gridSliceSettings,
          globalSettings: {
            output_directory: globalSettings.outputDirectory,
            output_format: globalSettings.outputFormat,
            quality: globalSettings.quality,
            filename_pattern: globalSettings.filenamePattern,
            overwrite_existing: globalSettings.overwriteExisting,
          },
        });

      default:
        return {
          success: false,
          processed_files: [],
          error: t('services.errors.unsupportedFunction', { functionName }) as string,
        };
    }
  }





  /**
   * 清理临时文件（简化版本）
   */
  private static async cleanupTempFiles(inputPaths: string[], originalImages: ImageFile[]) {
    try {
      const { removeFile } = await import('@tauri-apps/api/fs');

      for (let i = 0; i < inputPaths.length; i++) {
        const inputPath = inputPaths[i];
        const originalImage = originalImages[i];

        // 只删除我们创建的临时文件（blob转换的文件）
        if (originalImage.url.startsWith('blob:') && inputPath.includes('temp_images')) {
          try {
            await removeFile(inputPath);
          } catch (error) {
            // 忽略清理错误
          }
        }
      }
    } catch (error) {
      // 忽略清理错误
    }
  }

  /**
   * 根据文件路径推断图片类型
   */
  private static getImageTypeFromPath(filePath: string): string {
    const extension = filePath.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'jpg':
      case 'jpeg':
        return 'image/jpeg';
      case 'png':
        return 'image/png';
      case 'webp':
        return 'image/webp';
      case 'gif':
        return 'image/gif';
      case 'bmp':
        return 'image/bmp';
      default:
        return 'image/jpeg';
    }
  }

  /**
   * 获取图片信息
   */
  static async getImageInfo(filePath: string) {
    if (!this.isTauriEnvironment()) {
      throw new Error('此功能需要在桌面应用中使用');
    }

    try {
      return await invoke('get_image_info', { filePath });
    } catch (error) {
      console.error('获取图片信息失败:', error);
      throw error;
    }
  }

  static async previewEnhance(inputPath: string, params: NonNullable<ProcessingSettings['enhance']>, previewMaxSize: number = 1400): Promise<{ previewPath: string; width: number; height: number; }>{
    if (!this.isTauriEnvironment()) {
      throw new Error('此功能需要在桌面应用中使用');
    }
    const mapped = {
      strength: params.strength,
      auto_exposure: params.autoExposure ?? true,
      auto_white_balance: params.autoWhiteBalance ?? false,
      local_contrast: params.localContrast ?? false,
      sharpen: params.sharpen ?? true,
    };
    const res = await invoke<[string, number, number]>('enhance_preview', {
      inputPath,
      settings: mapped,
      previewMaxSize,
    });
    const { convertFileSrc } = await import('@tauri-apps/api/tauri');
    const url = convertFileSrc(res[0]);
    return { previewPath: url, width: res[1], height: res[2] };
  }

  /**
   * 清理临时预览文件
   */
  static async cleanupPreviewFiles(): Promise<number> {
    if (!this.isTauriEnvironment()) {
      return 0;
    }
    try {
      const count = await invoke<number>('cleanup_preview_files');
      return count;
    } catch (error) {
      console.warn('清理临时文件失败:', error);
      return 0;
    }
  }

  /**
   * 验证图片文件
   */
  static async validateImageFiles(filePaths: string[]) {
    if (!this.isTauriEnvironment()) {
      throw new Error('此功能需要在桌面应用中使用');
    }

    try {
      return await invoke('validate_image_files', { filePaths });
    } catch (error) {
      console.error('验证图片文件失败:', error);
      throw error;
    }
  }

  /**
   * 获取支持的格式列表
   */
  static async getSupportedFormats() {
    if (!this.isTauriEnvironment()) {
      return ['JPEG', 'PNG', 'WEBP', 'GIF', 'BMP'];
    }

    try {
      return await invoke('get_supported_formats');
    } catch (error) {
      console.error('获取支持格式失败:', error);
      return ['JPEG', 'PNG', 'WEBP', 'GIF', 'BMP'];
    }
  }



  /**
   * 检查格式兼容性
   */
  static async checkFormatCompatibility(inputFormat: string, outputFormat: string): Promise<string[]> {
    if (!this.isTauriEnvironment()) {
      return [];
    }

    try {
      return await invoke('check_format_compatibility', { inputFormat, outputFormat });
    } catch (error) {
      console.error('检查格式兼容性失败:', error);
      return [];
    }
  }








}
