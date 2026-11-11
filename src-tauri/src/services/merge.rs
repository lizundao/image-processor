use crate::types::*;
use crate::utils::*;
use anyhow::Result;
use image::{DynamicImage, GenericImageView, ImageFormat, Rgba, RgbaImage};

pub struct MergeService;

impl MergeService {
    /// 批量合并图片
    pub async fn merge_images_batch(
        input_paths: Vec<String>,
        settings: MergeSettings,
        global_settings: GlobalSettings,
    ) -> ProcessingResult {
        if input_paths.len() < 2 {
            return ProcessingResult {
                success: false,
                processed_files: vec![],
                error: Some("合并功能至少需要2张图片".to_string()),
            };
        }

        let mut processed_files: Vec<String> = Vec::new();
        let mut errors: Vec<String> = Vec::new();

        // 合并图片
        match Self::merge_images(&input_paths, &settings, &global_settings).await {
            Ok(output_path) => {
                processed_files.push(output_path);
            }
            Err(e) => {
                let error_msg = format!("合并图片失败: {}", e);
                errors.push(error_msg);
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

    /// 合并多张图片
    async fn merge_images(
        input_paths: &[String],
        settings: &MergeSettings,
        global_settings: &GlobalSettings,
    ) -> Result<String> {
        // 验证输入文件
        for path in input_paths {
            validate_image_file(path)?;
        }

        // 读取所有图片
        let mut images: Vec<DynamicImage> = Vec::new();
        for path in input_paths {
            let img = image::open(path)?;
            images.push(img);
        }

        // 应用合并
        let merged = Self::apply_merge(&images, settings)?;

        // 根据原图格式选择输出格式
        let (output_format, file_extension) = Self::get_output_format(&input_paths[0]);

        // 生成输出路径
        let direction_suffix = if settings.direction == "horizontal" { "h" } else { "v" };
        let suffix = format!("merged_{}_spacing{}px", direction_suffix, settings.spacing);
        let output_path = generate_output_filename(
            &input_paths[0],
            global_settings,
            &suffix,
            file_extension,
            None,
        );

        // 检查文件覆盖
        check_file_overwrite(&output_path, global_settings.overwrite_existing)?;
        ensure_output_directory(&output_path)?;

        // 保存合并后的图片
        merged.save_with_format(&output_path, output_format)?;

        Ok(output_path)
    }

    /// 应用合并效果
    fn apply_merge(images: &[DynamicImage], settings: &MergeSettings) -> Result<DynamicImage> {
        if images.is_empty() {
            return Err(anyhow::anyhow!("没有图片需要合并"));
        }

        let spacing = settings.spacing;
        let direction = &settings.direction;

        match direction.as_str() {
            "horizontal" => Self::merge_horizontally(images, spacing),
            "vertical" => Self::merge_vertically(images, spacing),
            _ => Err(anyhow::anyhow!("不支持的合并方向: {}", direction)),
        }
    }

    /// 水平合并（左右排列）
    fn merge_horizontally(images: &[DynamicImage], spacing: u32) -> Result<DynamicImage> {
        const MAX_MERGE_PIXELS: u64 = 268_435_456;
        let mut total_width: u64 = 0;
        let mut max_height: u32 = 0;

        // 计算总宽度和最大高度（u64 累加避免溢出）
        for img in images {
            let (width, height) = img.dimensions();
            total_width += width as u64;
            max_height = max_height.max(height);
        }

        // 添加间距
        if images.len() > 1 {
            total_width = total_width
                .checked_add((spacing as u64).saturating_mul(images.len() as u64 - 1))
                .ok_or_else(|| anyhow::anyhow!("合并宽度溢出"))?;
        }
        if total_width > u32::MAX as u64 {
            return Err(anyhow::anyhow!("合并后图片宽度超过 {} 像素", u32::MAX));
        }
        let total_width = total_width as u32;
        if (total_width as u64) * (max_height as u64) > MAX_MERGE_PIXELS {
            return Err(anyhow::anyhow!("合并后图片尺寸过大，超出内存安全上限"));
        }

        // 创建新画布（白色背景）
        let mut merged = RgbaImage::from_pixel(total_width, max_height, Rgba([255, 255, 255, 255]));

        // 逐个放置图片
        let mut current_x = 0;
        for (index, img) in images.iter().enumerate() {
            let (width, height) = img.dimensions();

            // 计算垂直居中位置
            let y_offset = (max_height - height) / 2;

            // 复制图片像素
            for y in 0..height {
                for x in 0..width {
                    let pixel = img.get_pixel(x, y);
                    merged.put_pixel(current_x + x, y_offset + y, pixel);
                }
            }

            current_x += width;

            // 添加间距（除了最后一张图片）
            if index < images.len() - 1 {
                current_x += spacing;
            }
        }

        Ok(DynamicImage::ImageRgba8(merged))
    }

    /// 垂直合并（上下排列）
    fn merge_vertically(images: &[DynamicImage], spacing: u32) -> Result<DynamicImage> {
        const MAX_MERGE_PIXELS: u64 = 268_435_456;
        let mut max_width: u32 = 0;
        let mut total_height: u64 = 0;

        // 计算最大宽度和总高度（u64 累加避免溢出）
        for img in images {
            let (width, height) = img.dimensions();
            max_width = max_width.max(width);
            total_height += height as u64;
        }

        // 添加间距
        if images.len() > 1 {
            total_height = total_height
                .checked_add((spacing as u64).saturating_mul(images.len() as u64 - 1))
                .ok_or_else(|| anyhow::anyhow!("合并高度溢出"))?;
        }
        if total_height > u32::MAX as u64 {
            return Err(anyhow::anyhow!("合并后图片高度超过 {} 像素", u32::MAX));
        }
        let total_height = total_height as u32;
        if (max_width as u64) * (total_height as u64) > MAX_MERGE_PIXELS {
            return Err(anyhow::anyhow!("合并后图片尺寸过大，超出内存安全上限"));
        }

        // 创建新画布（白色背景）
        let mut merged = RgbaImage::from_pixel(max_width, total_height, Rgba([255, 255, 255, 255]));

        // 逐个放置图片
        let mut current_y = 0;
        for (index, img) in images.iter().enumerate() {
            let (width, height) = img.dimensions();

            // 计算水平居中位置
            let x_offset = (max_width - width) / 2;

            // 复制图片像素
            for y in 0..height {
                for x in 0..width {
                    let pixel = img.get_pixel(x, y);
                    merged.put_pixel(x_offset + x, current_y + y, pixel);
                }
            }

            current_y += height;

            // 添加间距（除了最后一张图片）
            if index < images.len() - 1 {
                current_y += spacing;
            }
        }

        Ok(DynamicImage::ImageRgba8(merged))
    }

    /// 获取输出格式
    fn get_output_format(input_path: &str) -> (ImageFormat, &'static str) {
        let path = std::path::Path::new(input_path);
        let ext = path.extension().and_then(|e| e.to_str()).unwrap_or("jpg");

        match ext.to_lowercase().as_str() {
            "png" => (ImageFormat::Png, "png"),
            "webp" => (ImageFormat::WebP, "webp"),
            "gif" => (ImageFormat::Gif, "gif"),
            "bmp" => (ImageFormat::Bmp, "bmp"),
            "tiff" | "tif" => (ImageFormat::Tiff, "tiff"),
            _ => (ImageFormat::Jpeg, "jpg"),
        }
    }
}

/// 批量合并图片
pub async fn merge_images_batch(
    input_paths: Vec<String>,
    settings: MergeSettings,
    global_settings: GlobalSettings,
) -> ProcessingResult {
    MergeService::merge_images_batch(input_paths, settings, global_settings).await
}