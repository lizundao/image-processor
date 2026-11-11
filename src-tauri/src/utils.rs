use std::path::Path;
use image::ImageFormat;
use anyhow::{Result, anyhow};
use chrono;
use crate::types::GlobalSettings;

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

/// 根据全局设置解析实际输出目录（可选按操作类型分子文件夹）
pub fn resolve_output_directory(global_settings: &GlobalSettings, suffix: &str) -> String {
    if global_settings.output_directory.is_empty() {
        return String::new();
    }

    if global_settings.create_subfolders {
        Path::new(&global_settings.output_directory)
            .join(suffix)
            .to_string_lossy()
            .to_string()
    } else {
        global_settings.output_directory.clone()
    }
}

/// 生成输出文件名
pub fn generate_output_filename(
    input_path: &str,
    global_settings: &GlobalSettings,
    suffix: &str,
    extension: &str,
    file_index: Option<usize>,
) -> String {
    let output_directory = resolve_output_directory(global_settings, suffix);
    let filename_pattern = &global_settings.filename_pattern;

    let path = Path::new(input_path);
    let stem = path.file_stem().unwrap_or_default().to_str().unwrap_or("image");

    let clean_stem = if stem.contains('.') {
        if let Some(last_dot) = stem.rfind('.') {
            &stem[..last_dot]
        } else {
            stem
        }
    } else {
        stem
    };

    let timestamp = chrono::Utc::now().format("%Y%m%d_%H%M%S").to_string();
    let index_str = file_index
        .map(|i| (i + 1).to_string())
        .unwrap_or_else(|| "1".to_string());

    let filename = if filename_pattern.contains("{timestamp}")
        || filename_pattern.contains("{name}")
        || filename_pattern.contains("{original}")
        || filename_pattern.contains("{index}")
    {
        let base_filename = filename_pattern
            .replace("{original}", clean_stem)
            .replace("{name}", clean_stem)
            .replace("{timestamp}", &timestamp)
            .replace("{suffix}", suffix)
            .replace("{index}", &index_str);

        if !base_filename.contains('.') {
            format!("{}.{}", base_filename, extension.to_lowercase())
        } else if let Some(last_dot) = base_filename.rfind('.') {
            let name_part = &base_filename[..last_dot];
            let ext_part = &base_filename[last_dot + 1..];
            format!("{}.{}", name_part, ext_part.to_lowercase())
        } else {
            base_filename
        }
    } else {
        format!(
            "{}_{}_{}.{}",
            clean_stem,
            suffix,
            timestamp,
            extension.to_lowercase()
        )
    };

    if output_directory.is_empty() {
        filename
    } else {
        Path::new(&output_directory)
            .join(&filename)
            .to_string_lossy()
            .to_string()
    }
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

    image::open(path)?;
    Ok(())
}

/// 图片单维像素上限：防止超大画布导致内存耗尽或编码器溢出
pub const MAX_IMAGE_DIMENSION: u32 = 32767;

/// 解析十六进制颜色
///
/// 安全要点：先确认字符串是「恰好 6 个 ASCII 十六进制字符」再按字节切片。
/// 若直接 `&hex[0..2]`，当输入含中文等多字节 UTF-8 字符时会切在字符边界中间，
/// 触发 panic；而 Release profile 为 `panic = "abort"`，会导致整个进程闪退。
pub fn parse_hex_color(hex: &str) -> Result<(u8, u8, u8)> {
    let hex = hex.trim_start_matches('#');
    if hex.len() != 6 || !hex.bytes().all(|b| b.is_ascii_hexdigit()) {
        return Err(anyhow!("无效的颜色格式: {}（应为 #RRGGBB）", hex));
    }

    // 此时 hex 全为单字节 ASCII，切片必然落在字符边界，安全
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
    // 用字符数而非字节数估算中文宽度，避免中文水印整体偏右
    let text_width = text.chars().count() as u32 * font_size;
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
    // NaN 与任何数比较都为 false，会绕过范围校验，需显式拦截
    if !opacity.is_finite() || !(0.0..=1.0).contains(&opacity) {
        return Err(anyhow!("透明度必须在0.0-1.0之间"));
    }
    Ok(())
}
