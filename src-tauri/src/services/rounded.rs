use crate::types::*;
use crate::utils::*;
use anyhow::Result;
use image::{DynamicImage, GenericImageView, Rgba, RgbaImage};

pub struct RoundedService;

impl RoundedService {
    /// 批量添加圆角
    pub async fn add_rounded_corners_batch(
        input_paths: Vec<String>,
        settings: RoundedSettings,
        global_settings: GlobalSettings,
    ) -> ProcessingResult {
        let mut processed_files: Vec<String> = Vec::new();
        let mut errors: Vec<String> = Vec::new();

        for path in input_paths.iter() {
            match Self::add_rounded_corners_single_image(path, &settings, &global_settings).await {
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

    /// 为单张图片添加圆角
    pub async fn add_rounded_corners_single_image(
        input_path: &str,
        settings: &RoundedSettings,
        global_settings: &GlobalSettings,
    ) -> Result<String> {
        // 验证输入文件
        validate_image_file(input_path)?;

        // 验证圆角设置
        if settings.radius == 0 {
            return Err(anyhow::anyhow!("圆角半径不能为0"));
        }

        // 打开图片
        let img = image::open(input_path)?;
        let (_width, _height) = img.dimensions();

        // 应用圆角
        let rounded = Self::apply_rounded_corners(img, settings.radius);

        // 圆角功能需要PNG格式支持透明度
        let output_format = image::ImageFormat::Png;
        let file_extension = "png";

        // 生成输出路径
        let suffix = format!("rounded_{}px", settings.radius);
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
        rounded.save_with_format(&output_path, output_format)?;

        Ok(output_path)
    }

    /// 应用圆角效果
    fn apply_rounded_corners(img: DynamicImage, radius: u32) -> DynamicImage {
        let (width, height) = img.dimensions();
        
        // 智能圆角限制：确保圆角不会过大，但保持可见效果
        let max_radius = (width.min(height) as f32 * 0.3) as u32;
        let effective_radius = if radius > max_radius {
            max_radius
        } else {
            radius
        };
        
        
        // 如果圆角太小，不应用
        if effective_radius < 5 {
            return img;
        }
        
        // 创建圆形遮罩
        let mut mask = RgbaImage::new(width, height);
        
        for y in 0..height {
            for x in 0..width {
                let alpha = if Self::is_inside_rounded_rect(x, y, width, height, effective_radius) {
                    255 // 圆角矩形内部，保持不透明
                } else {
                    0 // 圆角矩形外部，完全透明
                };
                mask.put_pixel(x, y, Rgba([255, 255, 255, alpha]));
            }
        }
        
        // 应用遮罩到原图
        let mut result = img.to_rgba8();
        for y in 0..height {
            for x in 0..width {
                let mask_pixel = mask.get_pixel(x, y);
                let img_pixel = result.get_pixel(x, y);
                
                // 根据遮罩的alpha值调整图片的alpha值
                let new_alpha = (img_pixel[3] as u32 * mask_pixel[3] as u32 / 255) as u8;
                result.put_pixel(x, y, Rgba([img_pixel[0], img_pixel[1], img_pixel[2], new_alpha]));
            }
        }
        
        DynamicImage::ImageRgba8(result)
    }
    
    /// 判断点是否在圆角矩形内部
    fn is_inside_rounded_rect(x: u32, y: u32, width: u32, height: u32, radius: u32) -> bool {
        // 检查是否在基本矩形内
        if x < radius || x >= width - radius || y < radius || y >= height - radius {
            // 在边缘区域，需要检查圆角
            if x < radius && y < radius {
                // 左上角
                let dx = x as i32 - radius as i32;
                let dy = y as i32 - radius as i32;
                dx * dx + dy * dy <= (radius as i32) * (radius as i32)
            } else if x >= width - radius && y < radius {
                // 右上角
                let dx = x as i32 - (width as i32 - radius as i32);
                let dy = y as i32 - radius as i32;
                dx * dx + dy * dy <= (radius as i32) * (radius as i32)
            } else if x < radius && y >= height - radius {
                // 左下角
                let dx = x as i32 - radius as i32;
                let dy = y as i32 - (height as i32 - radius as i32);
                dx * dx + dy * dy <= (radius as i32) * (radius as i32)
            } else if x >= width - radius && y >= height - radius {
                // 右下角
                let dx = x as i32 - (width as i32 - radius as i32);
                let dy = y as i32 - (height as i32 - radius as i32);
                dx * dx + dy * dy <= (radius as i32) * (radius as i32)
            } else {
                // 在直边区域
                true
            }
        } else {
            // 在中心区域
            true
        }
    }
}

/// 批量添加圆角
pub async fn add_rounded_corners_batch(
    input_paths: Vec<String>,
    settings: RoundedSettings,
    global_settings: GlobalSettings,
) -> ProcessingResult {
    RoundedService::add_rounded_corners_batch(input_paths, settings, global_settings).await
}

/// 为单张图片添加圆角
pub async fn add_rounded_corners_single_image(
    input_path: &str,
    settings: &RoundedSettings,
    global_settings: &GlobalSettings,
) -> Result<String> {
    RoundedService::add_rounded_corners_single_image(input_path, settings, global_settings).await
}
