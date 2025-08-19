use crate::types::*;
use crate::utils::*;
use anyhow::Result;
use image::{DynamicImage, ImageFormat};

#[allow(dead_code)]
pub struct BrightnessService;

#[allow(dead_code)]
impl BrightnessService {
    /// 调整单张图片亮度
    pub async fn adjust_brightness_single(
        input_path: &str,
        settings: &BrightnessSettings,
        global_settings: &GlobalSettings,
    ) -> Result<String> {
        // 打开图片
        let img = image::open(input_path)?;
        
        // 应用亮度调整
        let adjusted = Self::apply_brightness_adjustment(img, settings.value);
        
        // 生成输出路径
        let suffix = format!("brightness_{}", settings.value);
        let output_path = generate_output_filename(
            input_path,
            &global_settings.output_directory,
            &global_settings.filename_pattern,
            &suffix,
            "jpg",
        );
        
        // 检查文件覆盖
        check_file_overwrite(&output_path, global_settings.overwrite_existing)?;
        ensure_output_directory(&output_path)?;
        
        // 保存图片
        adjusted.save_with_format(&output_path, ImageFormat::Jpeg)?;
        
        Ok(output_path)
    }
    
    /// 批量调整图片亮度
    pub async fn adjust_brightness_batch(
        input_paths: Vec<String>,
        settings: BrightnessSettings,
        global_settings: GlobalSettings,
    ) -> ProcessingResult {
        let mut results = Vec::new();
        let mut errors = Vec::new();
        
        for input_path in input_paths {
            match Self::adjust_brightness_single(&input_path, &settings, &global_settings).await {
                Ok(output_path) => results.push(output_path),
                Err(e) => errors.push(format!("{}: {}", input_path, e)),
            }
        }
        
        ProcessingResult {
            success: errors.is_empty(),
            processed_files: results,
            error: if errors.is_empty() { None } else { Some(errors.join("; ")) },
        }
    }
    
    /// 应用亮度调整
    fn apply_brightness_adjustment(img: DynamicImage, brightness: i32) -> DynamicImage {
        let mut adjusted = img.to_rgba8();
        
        for pixel in adjusted.pixels_mut() {
            let r = ((pixel[0] as i32 + brightness).max(0).min(255)) as u8;
            let g = ((pixel[1] as i32 + brightness).max(0).min(255)) as u8;
            let b = ((pixel[2] as i32 + brightness).max(0).min(255)) as u8;
            
            pixel[0] = r;
            pixel[1] = g;
            pixel[2] = b;
        }
        
        DynamicImage::ImageRgba8(adjusted)
    }
}

/// 批量调整亮度
#[allow(dead_code)]
pub async fn adjust_brightness_batch(
    input_paths: Vec<String>,
    settings: BrightnessSettings,
    global_settings: GlobalSettings,
) -> ProcessingResult {
    BrightnessService::adjust_brightness_batch(input_paths, settings, global_settings).await
}

/// 调整单张图片亮度
#[allow(dead_code)]
pub async fn adjust_brightness_single(
    input_path: &str,
    settings: &BrightnessSettings,
    global_settings: &GlobalSettings,
) -> Result<String> {
    BrightnessService::adjust_brightness_single(input_path, settings, global_settings).await
}
