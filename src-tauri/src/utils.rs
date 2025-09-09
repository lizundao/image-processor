use std::path::Path;
use image::ImageFormat;
use anyhow::{Result, anyhow};
use chrono;

/// 获取图片格式
pub fn get_image_format(format_str: &str) -> Result<ImageFormat> {
    match format_str.to_uppercase().as_str() {
        "JPEG" | "JPG" => Ok(ImageFormat::Jpeg),
        "PNG" => Ok(ImageFormat::Png),
        "WEBP" => Ok(ImageFormat::WebP),
        "GIF" => Ok(ImageFormat::Gif),
        "BMP" => Ok(ImageFormat::Bmp),
        "TIFF" | "TIF" => Ok(ImageFormat::Tiff),
        "ICO" => Ok(ImageFormat::Ico),
        _ => Err(anyhow!("不支持的图片格式: {}", format_str)),
    }
}

/// 生成输出文件名
pub fn generate_output_filename(
    input_path: &str,
    output_directory: &str,
    filename_pattern: &str,
    suffix: &str,
    extension: &str,
) -> String {
    let path = Path::new(input_path);
    // 确保获取的是不带扩展名的文件名
    let stem = path.file_stem().unwrap_or_default().to_str().unwrap_or("image");
    
    // 如果 stem 包含扩展名（比如从临时文件路径），需要清理
    let clean_stem = if stem.contains('.') {
        // 找到最后一个点，取前面的部分
        if let Some(last_dot) = stem.rfind('.') {
            &stem[..last_dot]
        } else {
            stem
        }
    } else {
        stem
    };
    
    // 获取当前时间戳
    let now: chrono::DateTime<chrono::Utc> = chrono::Utc::now();
    let timestamp = now.format("%Y%m%d_%H%M%S").to_string();
    
    // 调试输出
    println!("🔍 文件名生成调试:");
    println!("  input_path: {}", input_path);
    println!("  stem: {}", stem);
    println!("  clean_stem: {}", clean_stem);
    println!("  filename_pattern: {}", filename_pattern);
    println!("  suffix: {}", suffix);
    println!("  extension: {}", extension);
    println!("  timestamp: {}", timestamp);
    
    // 生成文件名
    let filename = if filename_pattern.contains("{timestamp}") || filename_pattern.contains("{name}") || filename_pattern.contains("{original}") {
        let base_filename = filename_pattern
            .replace("{original}", clean_stem)
            .replace("{name}", clean_stem)  // 同时支持 {name} 和 {original}
            .replace("{timestamp}", &timestamp)
            .replace("{suffix}", suffix);
        
        // println!("  base_filename after replacement: {}", base_filename);
        
        // 确保文件名有正确的扩展名（转换为小写）
        let final_filename = if !base_filename.contains('.') {
            format!("{}.{}", base_filename, extension.to_lowercase())
        } else {
            // 如果已经包含扩展名，确保扩展名是小写的
            if let Some(last_dot) = base_filename.rfind('.') {
                let name_part = &base_filename[..last_dot];
                let ext_part = &base_filename[last_dot + 1..];
                format!("{}.{}", name_part, ext_part.to_lowercase())
            } else {
                base_filename
            }
        };
        
        // println!("  final_filename: {}", final_filename);
        final_filename
    } else {
        // 使用默认模式：原文件名_后缀_时间戳.扩展名（转换为小写）
        let default_filename = format!("{}_{}_{}.{}", clean_stem, suffix, timestamp, extension.to_lowercase());
        // println!("  default_filename: {}", default_filename);
        default_filename
    };
    
    // 构建完整路径
    let result = if output_directory.is_empty() {
        filename
    } else {
        let output_path = Path::new(output_directory).join(&filename);
        output_path.to_string_lossy().to_string()
    };
    
    println!("  final result: {}", result);
    result
}

/// 检查文件是否已存在，如果存在且不允许覆盖则返回错误
pub fn check_file_overwrite(output_path: &str, overwrite_existing: bool) -> Result<()> {
    if Path::new(output_path).exists() && !overwrite_existing {
        return Err(anyhow::anyhow!("文件已存在: {}", output_path));
    }
    Ok(())
}

/// 确保输出目录存在
pub fn ensure_output_directory(output_path: &str) -> Result<()> {
    let path = Path::new(output_path);
    if let Some(parent) = path.parent() {
        if !parent.exists() {
            std::fs::create_dir_all(parent)?;
        }
    }
    Ok(())
}

/// 获取文件大小
pub fn get_file_size(path: &str) -> Result<u64> {
    let metadata = std::fs::metadata(path)?;
    Ok(metadata.len())
}

/// 验证图片文件
pub fn validate_image_file(path: &str) -> Result<()> {
    if !Path::new(path).exists() {
        return Err(anyhow!("文件不存在: {}", path));
    }
    
    // 尝试打开图片以验证格式
    image::open(path)?;
    Ok(())
}

/// 解析十六进制颜色
pub fn parse_hex_color(hex: &str) -> Result<(u8, u8, u8)> {
    let hex = hex.trim_start_matches('#');
    if hex.len() != 6 {
        return Err(anyhow!("无效的颜色格式: {}", hex));
    }
    
    let r = u8::from_str_radix(&hex[0..2], 16)?;
    let g = u8::from_str_radix(&hex[2..4], 16)?;
    let b = u8::from_str_radix(&hex[4..6], 16)?;
    
    Ok((r, g, b))
}



/// 计算文字位置（带边距）
pub fn calculate_text_position_with_margin(
    text: &str,
    position: &str,
    img_width: u32,
    img_height: u32,
    font_size: u32,
    margin_x: u32,
    margin_y: u32,
) -> (u32, u32) {
    // 估算文字尺寸（简化计算）
    let text_width = text.len() as u32 * font_size / 2;
    let text_height = font_size;

    match position {
        "top-left" => (margin_x, margin_y + text_height),
        "top-center" => (
            (img_width.saturating_sub(text_width)) / 2,
            margin_y + text_height,
        ),
        "top-right" => (
            img_width.saturating_sub(text_width + margin_x),
            margin_y + text_height,
        ),
        "middle-left" => (
            margin_x,
            (img_height.saturating_sub(text_height)) / 2 + text_height,
        ),
        "center" => (
            (img_width.saturating_sub(text_width)) / 2,
            (img_height.saturating_sub(text_height)) / 2 + text_height,
        ),
        "middle-right" => (
            img_width.saturating_sub(text_width + margin_x),
            (img_height.saturating_sub(text_height)) / 2 + text_height,
        ),
        "bottom-left" => (margin_x, img_height.saturating_sub(margin_y + text_height)),
        "bottom-center" => (
            (img_width.saturating_sub(text_width)) / 2,
            img_height.saturating_sub(margin_y + text_height),
        ),
        "bottom-right" => (
            img_width.saturating_sub(text_width + margin_x),
            img_height.saturating_sub(margin_y + text_height),
        ),
        _ => (margin_x, margin_y + text_height),
    }
}



/// 格式化文件大小
#[allow(dead_code)]
pub fn format_file_size(bytes: u64) -> String {
    const UNITS: &[&str] = &["B", "KB", "MB", "GB", "TB"];
    let mut size = bytes as f64;
    let mut unit_index = 0;
    
    while size >= 1024.0 && unit_index < UNITS.len() - 1 {
        size /= 1024.0;
        unit_index += 1;
    }
    
    if unit_index == 0 {
        format!("{} {}", bytes, UNITS[unit_index])
    } else {
        format!("{:.2} {}", size, UNITS[unit_index])
    }
}

/// 验证设置参数
pub fn validate_quality(quality: u8) -> Result<()> {
    if quality == 0 || quality > 100 {
        return Err(anyhow!("质量值必须在1-100之间"));
    }
    Ok(())
}

#[allow(dead_code)]
pub fn validate_dimensions(width: u32, height: u32) -> Result<()> {
    if width == 0 || height == 0 {
        return Err(anyhow!("宽度和高度必须大于0"));
    }
    if width > 10000 || height > 10000 {
        return Err(anyhow!("尺寸过大，最大支持10000x10000"));
    }
    Ok(())
}

pub fn validate_opacity(opacity: f32) -> Result<()> {
    if opacity < 0.0 || opacity > 1.0 {
        return Err(anyhow!("透明度必须在0.0-1.0之间"));
    }
    Ok(())
}
