use crate::types::*;
use crate::utils::*;
use anyhow::Result;
use image::{DynamicImage, GenericImageView, ImageFormat};

pub struct CropService;

impl CropService {
    /// 批量裁剪图片
    pub async fn crop_images_batch(
        input_paths: Vec<String>,
        settings: CropSettings,
        global_settings: GlobalSettings,
    ) -> ProcessingResult {
        let mut processed_files: Vec<String> = Vec::new();
        let mut errors: Vec<String> = Vec::new();

        for (idx, path) in input_paths.iter().enumerate() {
            // 如果是手动模式且提供了 manual_crops，则将对应索引的裁剪参数注入
            let mut per_image_settings = settings.clone();
            if let Some(mode) = &per_image_settings.mode {
                if mode == "manual" {
                    if let Some(crops) = &per_image_settings.manual_crops {
                        if idx < crops.len() {
                            let c = &crops[idx];
                            per_image_settings.x = Some(c.x);
                            per_image_settings.y = Some(c.y);
                            per_image_settings.width = Some(c.width);
                            per_image_settings.height = Some(c.height);
                            if let Some(ar) = c.aspect_ratio { per_image_settings.aspect_ratio = Some(ar); }
                        }
                    }
                }
            }
            match Self::crop_single_image(path, &per_image_settings, &global_settings).await {
                Ok(output_path) => {
                    processed_files.push(output_path);
                }
                Err(e) => {
                    let error_msg = format!("处理 {} 失败: {}", path, e);
                    errors.push(error_msg);
                }
            }
        }

        if !errors.is_empty() {
            ProcessingResult {
                success: false,
                processed_files,
                error: Some(errors.join("; ")),
            }
        } else {
            ProcessingResult {
                success: true,
                processed_files,
                error: None,
            }
        }
    }

    /// 裁剪单张图片
    pub async fn crop_single_image(
        input_path: &str,
        settings: &CropSettings,
        global_settings: &GlobalSettings,
    ) -> Result<String> {
        // 验证输入文件
        validate_image_file(input_path)?;

        // 打开图片
        let img = image::open(input_path)?;
        let (img_width, img_height) = img.dimensions();

        // 根据裁剪模式执行不同的裁剪逻辑
        let cropped = match &settings.mode {
            Some(mode) => match mode.as_str() {
                "manual" => {
                    // 手动裁剪模式
                    Self::apply_manual_crop(img, settings, img_width, img_height)?
                }
                "ratio" => {
                    // 比例裁剪模式
                    Self::apply_ratio_crop(img, settings, img_width, img_height)?
                }
                "pixel" => {
                    // 像素裁剪模式
                    Self::apply_pixel_crop(img, settings, img_width, img_height)?
                }
                _ => {
                    return Err(anyhow::anyhow!("不支持的裁剪模式: {}", mode));
                }
            }
            None => {
                // 默认使用比例裁剪
                Self::apply_ratio_crop(img, settings, img_width, img_height)?
            }
        };

        // 确定输出格式
        let (output_format, file_extension) = if let Some(format) = &settings.output_format {
            match format.to_uppercase().as_str() {
                "PNG" => (ImageFormat::Png, "png"),
                "WEBP" => (ImageFormat::WebP, "webp"),
                "GIF" => (ImageFormat::Gif, "gif"),
                "BMP" => (ImageFormat::Bmp, "bmp"),
                "TIFF" => (ImageFormat::Tiff, "tiff"),
                "ICO" => (ImageFormat::Ico, "ico"),
                _ => (ImageFormat::Jpeg, "jpg"),
            }
        } else {
            // 尝试从原文件扩展名推断格式
            let path = std::path::Path::new(input_path);
            let ext = path.extension().and_then(|e| e.to_str()).unwrap_or("jpg");
            match ext.to_lowercase().as_str() {
                "png" => (ImageFormat::Png, "png"),
                "webp" => (ImageFormat::WebP, "webp"),
                "gif" => (ImageFormat::Gif, "gif"),
                "bmp" => (ImageFormat::Bmp, "bmp"),
                "tiff" | "tif" => (ImageFormat::Tiff, "tiff"),
                "ico" => (ImageFormat::Ico, "ico"),
                _ => (ImageFormat::Jpeg, "jpg"),
            }
        };

        // 生成输出路径
        let mode_suffix = settings.mode.as_deref().unwrap_or("ratio");
        let suffix = format!("crop_{}", mode_suffix);
        let output_path = generate_output_filename(
            input_path,
            &global_settings.output_directory,
            &global_settings.filename_pattern,
            &suffix,
            file_extension,
        );

        // 检查文件覆盖
        check_file_overwrite(&output_path, global_settings.overwrite_existing)?;
        ensure_output_directory(&output_path)?;

        // 保存图片
        match output_format {
            ImageFormat::Jpeg => {
                let _quality = settings.quality.unwrap_or(90);
                cropped.save_with_format(&output_path, output_format)?;
            }
            _ => {
                cropped.save_with_format(&output_path, output_format)?;
            }
        }

        Ok(output_path)
    }

    /// 应用手动裁剪
    fn apply_manual_crop(
        img: DynamicImage, 
        settings: &CropSettings, 
        img_width: u32, 
        img_height: u32
    ) -> Result<DynamicImage> {
        // 检查手动裁剪参数
        let (x, y, width, height) = if let (Some(x), Some(y), Some(width), Some(height)) = 
            (settings.x, settings.y, settings.width, settings.height) {
            (x, y, width, height)
        } else {
            return Err(anyhow::anyhow!("手动裁剪缺少必要的坐标和尺寸参数"));
        };

        // 验证裁剪区域是否在图片范围内
        if x >= img_width || y >= img_height {
            return Err(anyhow::anyhow!("裁剪起始坐标超出图片范围"));
        }
        if x + width > img_width || y + height > img_height {
            return Err(anyhow::anyhow!("裁剪区域超出图片范围"));
        }
        if width == 0 || height == 0 {
            return Err(anyhow::anyhow!("裁剪尺寸不能为0"));
        }

        // 执行裁剪
        let cropped = img.crop_imm(x, y, width, height);
        Ok(cropped)
    }

    /// 应用比例裁剪
    fn apply_ratio_crop(
        img: DynamicImage, 
        settings: &CropSettings, 
        img_width: u32, 
        img_height: u32
    ) -> Result<DynamicImage> {
        // 获取目标宽高比
        let target_ratio = if let Some(ratio) = settings.aspect_ratio {
            ratio
        } else if let (Some(w), Some(h)) = (settings.custom_ratio_width, settings.custom_ratio_height) {
            if w > 0 && h > 0 {
                w as f32 / h as f32
            } else {
                return Err(anyhow::anyhow!("自定义比例宽高必须大于0"));
            }
        } else {
            return Err(anyhow::anyhow!("比例裁剪需要指定宽高比或自定义宽高"));
        };

        // 计算当前图片的宽高比
        let current_ratio = img_width as f32 / img_height as f32;

        let (crop_x, crop_y, crop_width, crop_height) = if current_ratio > target_ratio {
            // 当前图片更宽，需要裁剪宽度
            let crop_height = img_height;
            let crop_width = (img_height as f32 * target_ratio) as u32;
            let crop_x = (img_width - crop_width) / 2;
            let crop_y = 0;
            (crop_x, crop_y, crop_width, crop_height)
        } else {
            // 当前图片更高，需要裁剪高度
            let crop_width = img_width;
            let crop_height = (img_width as f32 / target_ratio) as u32;
            let crop_x = 0;
            let crop_y = (img_height - crop_height) / 2;
            (crop_x, crop_y, crop_width, crop_height)
        };

        // 执行裁剪
        let cropped = img.crop_imm(crop_x, crop_y, crop_width, crop_height);
        Ok(cropped)
    }

    /// 应用像素裁剪
    fn apply_pixel_crop(
        img: DynamicImage, 
        settings: &CropSettings, 
        img_width: u32, 
        img_height: u32
    ) -> Result<DynamicImage> {
        // 检查像素裁剪参数
        let (x, y, width, height) = if let (Some(x), Some(y), Some(width), Some(height)) = 
            (settings.x, settings.y, settings.width, settings.height) {
            (x, y, width, height)
        } else {
            return Err(anyhow::anyhow!("像素裁剪缺少必要的坐标和尺寸参数"));
        };

        // 验证裁剪区域是否在图片范围内
        if x >= img_width || y >= img_height {
            return Err(anyhow::anyhow!("裁剪起始坐标超出图片范围"));
        }
        if x + width > img_width || y + height > img_height {
            return Err(anyhow::anyhow!("裁剪区域超出图片范围"));
        }
        if width == 0 || height == 0 {
            return Err(anyhow::anyhow!("裁剪尺寸不能为0"));
        }

        // 执行裁剪
        let cropped = img.crop_imm(x, y, width, height);
        Ok(cropped)
    }

    /// 获取图片信息（用于前端显示）
    #[allow(dead_code)]
    pub fn get_image_info(input_path: &str) -> Result<ImageInfo> {
        // 验证输入文件
        validate_image_file(input_path)?;

        // 打开图片
        let img = image::open(input_path)?;
        let (width, height) = img.dimensions();

        // 获取文件大小
        let metadata = std::fs::metadata(input_path)?;
        let file_size = metadata.len();

        Ok(ImageInfo {
            width,
            height,
            file_size,
            aspect_ratio: width as f32 / height as f32,
        })
    }
}

/// 图片信息结构
#[derive(Debug)]
#[allow(dead_code)]
pub struct ImageInfo {
    pub width: u32,
    pub height: u32,
    pub file_size: u64,
    pub aspect_ratio: f32,
}

/// 批量裁剪图片
pub async fn crop_images_batch(
    input_paths: Vec<String>,
    settings: CropSettings,
    global_settings: GlobalSettings,
) -> ProcessingResult {
    CropService::crop_images_batch(input_paths, settings, global_settings).await
}

/// 裁剪单张图片
pub async fn crop_single_image(
    input_path: &str,
    settings: &CropSettings,
    global_settings: &GlobalSettings,
) -> Result<String> {
    CropService::crop_single_image(input_path, settings, global_settings).await
}

/// 获取图片信息
#[allow(dead_code)]
pub fn get_image_info(input_path: &str) -> Result<ImageInfo> {
    CropService::get_image_info(input_path)
} 