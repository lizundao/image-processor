use tauri::command;
use crate::types::{self, *};
use crate::services::*;

/// 压缩图片命令
#[command]
pub async fn compress_images(
    input_paths: Vec<String>,
    settings: CompressSettings,
    global_settings: GlobalSettings,
) -> ProcessingResult {
    compress_images_batch(input_paths, settings, global_settings).await
}

/// 压缩单张图片命令
#[command]
pub async fn compress_single_image(
    input_path: String,
    settings: CompressSettings,
    global_settings: GlobalSettings,
) -> Result<String, String> {
    match crate::services::compress::compress_single_image(&input_path, &settings, &global_settings, None).await {
        Ok(output_path) => Ok(output_path),
        Err(e) => Err(e.to_string()),
    }
}

/// 添加水印命令
#[command]
pub async fn add_watermark(
    input_paths: Vec<String>,
    settings: WatermarkSettings,
    global_settings: GlobalSettings,
) -> ProcessingResult {
    add_watermark_batch(input_paths, settings, global_settings).await
}

/// 添加单张水印命令
#[command]
pub async fn add_single_watermark(
    input_path: String,
    settings: WatermarkSettings,
    global_settings: GlobalSettings,
) -> Result<String, String> {
    match crate::services::watermark::add_watermark_single(&input_path, &settings, &global_settings, None).await {
        Ok(output_path) => Ok(output_path),
        Err(e) => Err(e.to_string()),
    }
}

/// 获取系统字体列表
#[command]
pub async fn get_system_fonts() -> Result<Vec<String>, String> {
    match crate::services::font::get_system_fonts().await {
        Ok(fonts) => Ok(fonts),
        Err(e) => Err(e.to_string()),
    }
}

/// 格式转换命令
#[command]
pub async fn convert_format(
    input_paths: Vec<String>,
    settings: ConvertSettings,
    global_settings: GlobalSettings,
) -> ProcessingResult {
    convert_format_batch(input_paths, settings, global_settings).await
}

/// 获取支持的格式列表
#[command]
pub async fn get_supported_formats() -> Result<Vec<String>, String> {
    let formats = crate::services::convert::get_supported_formats()
        .iter()
        .map(|s| s.to_string())
        .collect();
    Ok(formats)
}

/// 检查格式兼容性
#[command]
pub async fn check_format_compatibility(
    input_format: String,
    output_format: String,
) -> Result<Vec<String>, String> {
    match crate::services::convert::check_format_compatibility(&input_format, &output_format) {
        Ok(warnings) => Ok(warnings),
        Err(e) => Err(e.to_string()),
    }
}

/// Web优化转换
#[command]
pub async fn convert_to_web_optimized(
    input_paths: Vec<String>,
    global_settings: GlobalSettings,
) -> ProcessingResult {
    crate::services::convert::convert_to_web_optimized(input_paths, global_settings).await
}

/// 宫格切图命令
#[command]
pub async fn grid_slice_images(
    input_paths: Vec<String>,
    settings: GridSliceSettings,
    global_settings: GlobalSettings,
) -> ProcessingResult {
    crate::services::grid_slice::grid_slice_images(input_paths, settings, global_settings).await
}

#[command]
pub async fn resize_images_simple(
    input_paths: Vec<String>,
    settings: ResizeSimpleSettings,
    global_settings: GlobalSettings,
) -> ProcessingResult {
    crate::services::resize_simple::resize_images_simple(input_paths, settings, global_settings).await
}

/// 获取图片信息命令
#[command]
pub async fn get_image_info(file_path: String) -> Result<types::ImageInfo, String> {
    match image::open(&file_path) {
        Ok(img) => {
            let metadata = std::fs::metadata(&file_path).map_err(|e| e.to_string())?;

            let format = match img.color() {
                image::ColorType::L8 => "GRAY",
                image::ColorType::La8 => "GRAY_ALPHA",
                image::ColorType::Rgb8 => "RGB",
                image::ColorType::Rgba8 => "RGBA",
                image::ColorType::L16 => "GRAY16",
                image::ColorType::La16 => "GRAY_ALPHA16",
                image::ColorType::Rgb16 => "RGB16",
                image::ColorType::Rgba16 => "RGBA16",
                image::ColorType::Rgb32F => "RGB32F",
                image::ColorType::Rgba32F => "RGBA32F",
                _ => "UNKNOWN",
            };

            Ok(types::ImageInfo {
                path: file_path,
                width: img.width(),
                height: img.height(),
                format: format.to_string(),
                size_bytes: metadata.len(),
            })
        }
        Err(e) => Err(format!("无法读取图片: {}", e)),
    }
}

/// 批量获取图片信息命令
#[command]
pub async fn get_images_info(file_paths: Vec<String>) -> Vec<Result<types::ImageInfo, String>> {
    let mut results = Vec::new();
    for file_path in file_paths {
        let result = get_image_info(file_path).await;
        results.push(result);
    }
    results
}

/// 验证图片文件命令
#[command]
pub async fn validate_image_files(file_paths: Vec<String>) -> Vec<bool> {
    let mut results = Vec::new();
    for file_path in file_paths {
        let is_valid = match image::open(&file_path) {
            Ok(_) => true,
            Err(_) => false,
        };
        results.push(is_valid);
    }
    results
}

/// 预估压缩后文件大小
#[command]
pub async fn estimate_compressed_size(
    file_path: String,
    quality: u8,
    format: String,
) -> Result<u64, String> {
    let metadata = std::fs::metadata(&file_path).map_err(|e| e.to_string())?;
    let original_size = metadata.len();
    let estimated_size = crate::services::compress::estimate_compressed_size(original_size, quality, &format);
    Ok(estimated_size)
}

/// 获取推荐压缩设置
#[command]
pub async fn get_recommended_compress_settings(
    file_size: u64,
) -> Result<CompressSettings, String> {
    let settings = crate::services::compress::get_recommended_compress_settings(file_size);
    Ok(settings)
}

/// 裁剪图片命令
#[command]
pub async fn crop_images(
    input_paths: Vec<String>,
    mut settings: CropSettings,
    global_settings: GlobalSettings,
) -> ProcessingResult {
    if settings.aspect_ratio.is_none() {
        if let (Some(w), Some(h)) = (settings.custom_ratio_width, settings.custom_ratio_height) {
            if w > 0 && h > 0 {
                settings.aspect_ratio = Some(w as f32 / h as f32);
            }
        }
    }
    crop_images_batch(input_paths, settings, global_settings).await
}

/// 裁剪单张图片命令
#[command]
pub async fn crop_single_image(
    input_path: String,
    settings: CropSettings,
    global_settings: GlobalSettings,
) -> Result<String, String> {
    match crate::services::crop::crop_single_image(&input_path, &settings, &global_settings, None).await {
        Ok(output_path) => Ok(output_path),
        Err(e) => Err(e.to_string()),
    }
}

/// 旋转图片命令
#[command]
pub async fn rotate_images(
    input_paths: Vec<String>,
    settings: RotateSettings,
    global_settings: GlobalSettings,
) -> ProcessingResult {
    rotate_images_batch(input_paths, settings, global_settings).await
}

/// 旋转单张图片命令
#[command]
pub async fn rotate_single_image(
    input_path: String,
    settings: RotateSettings,
    global_settings: GlobalSettings,
) -> Result<String, String> {
    match crate::services::rotate::rotate_single_image(&input_path, &settings, &global_settings, None).await {
        Ok(output_path) => Ok(output_path),
        Err(e) => Err(e.to_string()),
    }
}

/// 翻转图片命令
#[command]
pub async fn flip_images(
    input_paths: Vec<String>,
    settings: FlipSettings,
    global_settings: GlobalSettings,
) -> ProcessingResult {
    flip_images_batch(input_paths, settings, global_settings).await
}

/// 翻转单张图片命令
#[command]
pub async fn flip_single_image(
    input_path: String,
    settings: FlipSettings,
    global_settings: GlobalSettings,
) -> Result<String, String> {
    match crate::services::flip::flip_single_image(&input_path, &settings, &global_settings, None).await {
        Ok(output_path) => Ok(output_path),
        Err(e) => Err(e.to_string()),
    }
}

/// 调整亮度命令
#[command]
pub async fn adjust_brightness(
    input_paths: Vec<String>,
    settings: BrightnessSettings,
    global_settings: GlobalSettings,
) -> ProcessingResult {
    adjust_brightness_batch(input_paths, settings, global_settings).await
}

/// 调整单张图片亮度命令
#[command]
pub async fn adjust_brightness_single_image(
    input_path: String,
    settings: BrightnessSettings,
    global_settings: GlobalSettings,
) -> Result<String, String> {
    match crate::services::brightness::adjust_brightness_single(
        &input_path,
        &settings,
        &global_settings,
        None,
    )
    .await {
        Ok(output_path) => Ok(output_path),
        Err(e) => Err(e.to_string()),
    }
}

/// 添加边框命令
#[command]
pub async fn add_border(
    input_paths: Vec<String>,
    settings: BorderSettings,
    global_settings: GlobalSettings,
) -> ProcessingResult {
    add_border_batch(input_paths, settings, global_settings).await
}

/// 为单张图片添加边框命令
#[command]
pub async fn add_single_border(
    input_path: String,
    settings: BorderSettings,
    global_settings: GlobalSettings,
) -> Result<String, String> {
    match crate::services::border::add_border_single_image(&input_path, &settings, &global_settings, None).await {
        Ok(output_path) => Ok(output_path),
        Err(e) => Err(e.to_string()),
    }
}

/// 添加圆角命令
#[command]
pub async fn add_rounded_corners(
    input_paths: Vec<String>,
    settings: RoundedSettings,
    global_settings: GlobalSettings,
) -> ProcessingResult {
    crate::services::rounded::add_rounded_corners_batch(input_paths, settings, global_settings).await
}

/// 为单张图片添加圆角命令
#[command]
pub async fn add_single_rounded_corners(
    input_path: String,
    settings: RoundedSettings,
    global_settings: GlobalSettings,
) -> Result<String, String> {
    match crate::services::rounded::add_rounded_corners_single_image(&input_path, &settings, &global_settings, None).await {
        Ok(output_path) => Ok(output_path),
        Err(e) => Err(e.to_string()),
    }
}

/// 合并图片命令
#[command]
pub async fn merge_images(
    input_paths: Vec<String>,
    settings: MergeSettings,
    global_settings: GlobalSettings,
) -> ProcessingResult {
    crate::services::merge::merge_images_batch(input_paths, settings, global_settings).await
}

/// 合并单张图片命令
#[command]
pub async fn merge_single_images(
    input_paths: Vec<String>,
    settings: MergeSettings,
    global_settings: GlobalSettings,
) -> Result<String, String> {
    let result = crate::services::merge::merge_images_batch(input_paths, settings, global_settings).await;
    if result.success && !result.processed_files.is_empty() {
        Ok(result.processed_files[0].clone())
    } else {
        Err(result.error.unwrap_or_else(|| "合并失败".to_string()))
    }
}

/// 创建GIF命令
#[command]
pub async fn create_gif(
    input_paths: Vec<String>,
    settings: GifSettings,
    global_settings: GlobalSettings,
) -> ProcessingResult {
    crate::services::gif::create_gif_batch(input_paths, settings, global_settings).await
}

#[command]
pub async fn enhance_preview(
    input_path: String,
    settings: EnhanceSettings,
    preview_max_size: Option<u32>,
) -> Result<(String, u32, u32), String> {
    let max_size = preview_max_size.unwrap_or(1400);
    crate::services::enhance::enhance_preview(&input_path, &settings, max_size)
        .await
        .map_err(|e| e.to_string())
}

/// 一键美化 - 批量
#[command]
pub async fn enhance_images(
    input_paths: Vec<String>,
    settings: EnhanceSettings,
    global_settings: GlobalSettings,
) -> ProcessingResult {
    crate::services::enhance::enhance_apply_batch(input_paths, settings, global_settings).await
}

/// 一键美化 - 单张
#[command]
pub async fn enhance_single_image(
    input_path: String,
    settings: EnhanceSettings,
    global_settings: GlobalSettings,
) -> Result<String, String> {
    match crate::services::enhance::enhance_apply_one(&input_path, &settings, &global_settings, None).await {
        Ok(output_path) => Ok(output_path),
        Err(e) => Err(e.to_string()),
    }
}

/// 清理临时预览文件
#[command]
pub async fn cleanup_preview_files() -> Result<u32, String> {
    match crate::services::enhance::cleanup_preview_temp_files() {
        Ok(count) => Ok(count),
        Err(e) => Err(e.to_string()),
    }
}