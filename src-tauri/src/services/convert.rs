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
            let compression_level = settings.compression_level.unwrap_or(9); // 默认使用最高压缩
            
            // 优化图片以减少文件大小
            let optimized_img = optimize_image_for_png(&img);
            
            // 对于高压缩级别，使用高级压缩函数
            if compression_level >= 7 {
                // 尝试使用png crate的高级压缩
                if let Err(_) = save_png_advanced(&optimized_img, &output_path, compression_level) {
                    // 如果失败，回退到标准优化
                    save_png_optimized(&optimized_img, &output_path, compression_level)?;
                }
            } else {
                save_png_with_compression(&optimized_img, &output_path, compression_level)?;
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
        image::ImageFormat::Ico => {
            // ICO格式有严格的尺寸限制：1-256像素
            let (width, height) = (img.width(), img.height());
            if width > 256 || height > 256 {
                let resized_img = img.resize(256, 256, image::imageops::FilterType::Lanczos3);
                resized_img.save_with_format(&output_path, format)?;
            } else if width < 1 || height < 1 {
                let resized_img = img.resize(16, 16, image::imageops::FilterType::Lanczos3);
                resized_img.save_with_format(&output_path, format)?;
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
fn save_png_with_compression(img: &image::DynamicImage, path: &str, compression_level: u8) -> Result<()> {
    use std::fs::File;
    use image::codecs::png::{PngEncoder, CompressionType, FilterType};

    let file = File::create(path)?;
    
    // 将压缩级别(0-9)映射到压缩类型
    let compression_type = match compression_level {
        0..=2 => CompressionType::Fast,
        3..=6 => CompressionType::Default,
        7..=9 => CompressionType::Best,
        _ => CompressionType::Default,
    };
    
    // 选择最佳过滤器类型以获得更好的压缩
    let filter_type = match compression_level {
        0..=3 => FilterType::NoFilter,      // 低压缩级别使用无过滤
        4..=6 => FilterType::Sub,           // 中等压缩级别使用Sub过滤
        7..=9 => FilterType::Adaptive,      // 高压缩级别使用自适应过滤
        _ => FilterType::Adaptive,
    };
    
    let encoder = PngEncoder::new_with_quality(
        file,
        compression_type,
        filter_type,
    );
    
    
    img.write_with_encoder(encoder)?;
    Ok(())
}

/// 优化图片以减少PNG文件大小
fn optimize_image_for_png(img: &image::DynamicImage) -> image::DynamicImage {
    // 如果图片是RGB8，尝试转换为调色板模式以减少文件大小
    if let image::DynamicImage::ImageRgb8(rgb_img) = img {
        // 检查是否可以使用调色板模式
        let unique_colors = count_unique_colors(rgb_img);
        
        if unique_colors <= 256 {
            // 转换为调色板模式
            if let Ok(palette_img) = convert_to_palette(rgb_img) {
                return image::DynamicImage::ImageRgba8(palette_img);
            }
        }
    }
    
    // 如果图片有透明度，确保使用RGBA8格式
    if img.color().has_alpha() {
        img.to_rgba8().into()
    } else {
        // 对于RGB图片，转换为RGBA8以获得更好的压缩
        img.to_rgba8().into()
    }
}

/// 计算图片中唯一颜色的数量
fn count_unique_colors(rgb_img: &image::RgbImage) -> usize {
    use std::collections::HashSet;
    
    let mut colors = HashSet::new();
    for pixel in rgb_img.pixels() {
        colors.insert((pixel[0], pixel[1], pixel[2]));
    }
    colors.len()
}

/// 将RGB图片转换为调色板模式
fn convert_to_palette(rgb_img: &image::RgbImage) -> Result<image::RgbaImage, image::ImageError> {
    use std::collections::HashMap;
    
    let (width, height) = rgb_img.dimensions();
    let mut palette = HashMap::new();
    let mut palette_vec = Vec::new();
    
    // 构建调色板
    for pixel in rgb_img.pixels() {
        let rgb = (pixel[0], pixel[1], pixel[2]);
        if !palette.contains_key(&rgb) {
            palette.insert(rgb, palette_vec.len() as u8);
            palette_vec.push(rgb);
        }
    }
    
    // 创建RGBA图片
    let mut rgba_img = image::RgbaImage::new(width, height);
    
    for (x, y, pixel) in rgb_img.enumerate_pixels() {
        let rgb = (pixel[0], pixel[1], pixel[2]);
        let index = palette[&rgb];
        let palette_color = palette_vec[index as usize];
        
        rgba_img.put_pixel(x, y, image::Rgba([
            palette_color.0,
            palette_color.1,
            palette_color.2,
            255, // 完全不透明
        ]));
    }
    
    Ok(rgba_img)
}

/// 优化的PNG保存函数，使用更高级的压缩技术
fn save_png_optimized(img: &image::DynamicImage, path: &str, _compression_level: u8) -> Result<()> {
    use std::fs::File;
    use image::codecs::png::{PngEncoder, CompressionType, FilterType};
    
    // 首先尝试使用最高压缩设置
    let file = File::create(path)?;
    let encoder = PngEncoder::new_with_quality(
        file,
        CompressionType::Best,
        FilterType::Adaptive,
    );
    
    
    img.write_with_encoder(encoder)?;
    Ok(())
}

/// 使用png crate的高级压缩保存PNG
fn save_png_advanced(img: &image::DynamicImage, path: &str, compression_level: u8) -> Result<()> {
    use std::fs::File;
    use png::{Encoder, Compression, FilterType};
    
    let file = File::create(path)?;
    let mut encoder = Encoder::new(file, img.width(), img.height());
    
    // 设置颜色类型
    encoder.set_color(png::ColorType::Rgba);
    encoder.set_depth(png::BitDepth::Eight);
    
    // 设置压缩级别
    let compression = match compression_level {
        0..=2 => Compression::Fast,
        3..=6 => Compression::Default,
        7..=9 => Compression::Best,
        _ => Compression::Best,
    };
    encoder.set_compression(compression);
    
    // 设置过滤器
    encoder.set_filter(FilterType::Paeth);
    
    // 写入图片数据
    let mut writer = encoder.write_header()?;
    let rgba_img = img.to_rgba8();
    writer.write_image_data(&rgba_img)?;
    
    Ok(())
}

/// 使用指定质量保存WebP
fn save_webp_with_quality(img: &image::DynamicImage, path: &str, quality: u8) -> Result<()> {
    use webp::Encoder;
    
    // 将图片转换为RGBA格式
    let rgba_img = img.to_rgba8();
    let (width, height) = rgba_img.dimensions();
    
    // 创建WebP编码器
    let encoder = Encoder::from_rgba(&rgba_img, width, height);
    
    // 设置质量（0-100转换为0.0-1.0）
    let quality_f32 = quality as f32 / 100.0;
    
    // 使用质量设置编码WebP
    let webp_data = encoder.encode(quality_f32);
    
    // 保存到文件
    std::fs::write(path, &*webp_data)?;
    
    Ok(())
}
