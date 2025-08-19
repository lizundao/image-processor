use crate::types::*;
use crate::utils::*;
use anyhow::Result;

/// 转换单张图片格式
pub async fn convert_single_format(
    input_path: &str,
    settings: &ConvertSettings,
    global_settings: &GlobalSettings,
) -> Result<String> {
    
    // 验证输入
    validate_image_file(input_path)?;
    
    // 加载图片
    let img = image::open(input_path)?;
    
    // 生成输出文件名
    let output_path = generate_output_filename(
        input_path,
        &global_settings.output_directory,
        &global_settings.filename_pattern,
        "converted",
        &settings.format,
    );
    
    // 检查文件覆盖
    check_file_overwrite(&output_path, global_settings.overwrite_existing)?;
    
    // 确保输出目录存在
    ensure_output_directory(&output_path)?;
    
    // 获取输出格式并保存
    let format = get_image_format(&settings.format)?;
    
    // 根据目标格式进行特殊处理
    match format {
        image::ImageFormat::Jpeg => {
            // JPEG不支持透明度，需要转换为RGB
            let processed_img = if img.color().has_alpha() {
                // 处理透明背景
                let background_color = settings.background_color
                    .as_ref()
                    .and_then(|c| parse_hex_color(c).ok())
                    .unwrap_or((255, 255, 255)); // 默认白色背景

                let rgb_img = convert_rgba_to_rgb(&img, background_color);
                image::DynamicImage::ImageRgb8(rgb_img)
            } else {
                img.to_rgb8().into()
            };

            // 使用质量设置保存JPEG
            if let Some(quality) = settings.quality {
                save_jpeg_with_quality(&processed_img, &output_path, quality as u8)?;
            } else {
                processed_img.save_with_format(&output_path, format)?;
            }
        }
        image::ImageFormat::Png => {
            // PNG支持透明度和压缩级别
            if let Some(compression_level) = settings.compression_level {
                save_png_with_compression(&img, &output_path, compression_level)?;
            } else {
                img.save_with_format(&output_path, format)?;
            }
        }
        image::ImageFormat::WebP => {
            // WebP支持质量设置
            if let Some(quality) = settings.quality {
                save_webp_with_quality(&img, &output_path, quality as u8)?;
            } else {
                img.save_with_format(&output_path, format)?;
            }
        }
        _ => {
            img.save_with_format(&output_path, format)?;
        }
    }
    

    
    Ok(output_path)
}

/// 批量格式转换
pub async fn convert_format_batch(
    input_paths: Vec<String>,
    settings: ConvertSettings,
    global_settings: GlobalSettings,
) -> ProcessingResult {
    
    let mut processed_files = Vec::new();
    
    for (_index, input_path) in input_paths.iter().enumerate() {
        
        match convert_single_format(input_path, &settings, &global_settings).await {
            Ok(output_path) => {
                processed_files.push(output_path);
            }
            Err(e) => {
                return ProcessingResult {
                    success: false,
                    processed_files: vec![],
                    error: Some(format!("格式转换失败: {}", e)),
                };
            }
        }
    }
    
    
    ProcessingResult {
        success: true,
        processed_files,
        error: None,
    }
}

/// 获取支持的输出格式列表
pub fn get_supported_formats() -> Vec<&'static str> {
    vec!["JPEG", "PNG", "WEBP", "GIF", "BMP", "TIFF", "ICO"]
}

/// 检查格式兼容性
pub fn check_format_compatibility(input_format: &str, output_format: &str) -> Result<Vec<String>> {
    let mut warnings = Vec::new();
    
    let input_upper = input_format.to_uppercase();
    let output_upper = output_format.to_uppercase();
    
    // 透明度兼容性检查
    if (input_upper == "PNG" || input_upper == "GIF") && output_upper == "JPEG" {
        warnings.push("目标格式JPEG不支持透明度，透明区域将变为白色".to_string());
    }
    
    // 动画兼容性检查
    if input_upper == "GIF" && output_upper != "GIF" {
        warnings.push("目标格式不支持动画，只会保存第一帧".to_string());
    }
    
    // 质量损失警告
    if (input_upper == "PNG" || input_upper == "BMP") && output_upper == "JPEG" {
        warnings.push("从无损格式转换为有损格式可能会降低图片质量".to_string());
    }
    
    Ok(warnings)
}

/// 批量转换为Web优化格式
pub async fn convert_to_web_optimized(
    input_paths: Vec<String>,
    global_settings: GlobalSettings,
) -> ProcessingResult {
    
    let mut processed_files = Vec::new();
    
    for (_index, input_path) in input_paths.iter().enumerate() {
        
        // 根据图片特性选择最佳格式
        let optimal_format = match determine_optimal_web_format(input_path) {
            Ok(format) => format,
            Err(e) => {
                return ProcessingResult {
                    success: false,
                    processed_files: vec![],
                    error: Some(format!("确定最佳格式失败: {}", e)),
                };
            }
        };
        
        let settings = ConvertSettings {
            format: optimal_format,
            quality: Some(85), // Web优化默认质量
            preserve_transparency: Some(true),
            preserve_metadata: Some(false), // Web优化通常不保留元数据
            background_color: Some("#FFFFFF".to_string()),
            compression_level: Some(6), // PNG默认压缩级别
            progressive: Some(false),
        };
        
        match convert_single_format(input_path, &settings, &global_settings).await {
            Ok(output_path) => {
                processed_files.push(output_path);
            }
            Err(e) => {
                return ProcessingResult {
                    success: false,
                    processed_files: vec![],
                    error: Some(format!("Web优化转换失败: {}", e)),
                };
            }
        }
    }
    
    
    ProcessingResult {
        success: true,
        processed_files,
        error: None,
    }
}

/// 确定最佳的Web格式
fn determine_optimal_web_format(input_path: &str) -> Result<String> {
    let img = image::open(input_path)?;
    
    // 检查是否有透明度
    let has_transparency = match img.color() {
        image::ColorType::Rgba8 | image::ColorType::Rgba16 | image::ColorType::La8 | image::ColorType::La16 => {
            // 检查是否实际使用了透明度
            check_actual_transparency(&img)
        }
        _ => false,
    };
    
    // 检查图片复杂度
    let is_complex = img.width() * img.height() > 500_000; // 大于500K像素认为是复杂图片
    
    // 选择最佳格式
    if has_transparency {
        if is_complex {
            Ok("WEBP".to_string()) // 复杂图片用WebP
        } else {
            Ok("PNG".to_string()) // 简单图片用PNG
        }
    } else {
        if is_complex {
            Ok("WEBP".to_string()) // 复杂图片用WebP
        } else {
            Ok("JPEG".to_string()) // 简单图片用JPEG
        }
    }
}

/// 检查图片是否实际使用了透明度
fn check_actual_transparency(img: &image::DynamicImage) -> bool {
    match img {
        image::DynamicImage::ImageRgba8(rgba_img) => {
            // 检查是否有非完全不透明的像素
            for pixel in rgba_img.pixels() {
                if pixel[3] < 255 {
                    return true;
                }
            }
            false
        }
        image::DynamicImage::ImageRgba16(rgba_img) => {
            for pixel in rgba_img.pixels() {
                if pixel[3] < 65535 {
                    return true;
                }
            }
            false
        }
        _ => false,
    }
}

/// 将RGBA图片转换为RGB，使用指定背景色
fn convert_rgba_to_rgb(img: &image::DynamicImage, background_color: (u8, u8, u8)) -> image::RgbImage {
    let rgba_img = img.to_rgba8();
    let (width, height) = rgba_img.dimensions();
    let mut rgb_img = image::RgbImage::new(width, height);

    for (x, y, pixel) in rgba_img.enumerate_pixels() {
        let alpha = pixel[3] as f32 / 255.0;
        let inv_alpha = 1.0 - alpha;

        let r = (pixel[0] as f32 * alpha + background_color.0 as f32 * inv_alpha) as u8;
        let g = (pixel[1] as f32 * alpha + background_color.1 as f32 * inv_alpha) as u8;
        let b = (pixel[2] as f32 * alpha + background_color.2 as f32 * inv_alpha) as u8;

        rgb_img.put_pixel(x, y, image::Rgb([r, g, b]));
    }

    rgb_img
}

/// 使用指定质量保存JPEG
fn save_jpeg_with_quality(img: &image::DynamicImage, path: &str, quality: u8) -> Result<()> {
    use std::fs::File;
    use image::codecs::jpeg::JpegEncoder;

    let file = File::create(path)?;
    let encoder = JpegEncoder::new_with_quality(file, quality);
    img.write_with_encoder(encoder)?;
    Ok(())
}

/// 使用指定压缩级别保存PNG
fn save_png_with_compression(img: &image::DynamicImage, path: &str, _compression_level: u8) -> Result<()> {
    use std::fs::File;
    use image::codecs::png::{PngEncoder, CompressionType, FilterType};

    let file = File::create(path)?;
    let encoder = PngEncoder::new_with_quality(
        file,
        CompressionType::Default,
        FilterType::NoFilter,
    );
    img.write_with_encoder(encoder)?;
    Ok(())
}

/// 使用指定质量保存WebP
fn save_webp_with_quality(img: &image::DynamicImage, path: &str, _quality: u8) -> Result<()> {
    // 注意：image crate的WebP编码器可能不支持质量设置
    // 这里使用默认保存，实际项目中可能需要使用专门的WebP库
    img.save_with_format(path, image::ImageFormat::WebP)?;
    Ok(())
}
