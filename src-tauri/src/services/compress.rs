use crate::types::*;
use crate::utils::*;
use anyhow::Result;
use image::ImageFormat;
use std::path::Path;

/// 压缩单张图片
pub async fn compress_single_image(
    input_path: &str,
    settings: &CompressSettings,
    global_settings: &GlobalSettings,
) -> Result<String> {

    // 验证输入
    validate_image_file(input_path)?;
    // 使用settings中的质量
    let quality = settings.quality;
    validate_quality(quality)?;

    // 验证输出目录
    if global_settings.output_directory.is_empty() {
        return Err(anyhow::anyhow!("输出目录未设置"));
    }
    
    // 验证文件是否存在
    if !std::path::Path::new(input_path).exists() {
        return Err(anyhow::anyhow!("文件不存在: {}", input_path));
    }

    // 获取文件大小
    let metadata = std::fs::metadata(input_path)?;
    let file_size = metadata.len();

    if file_size == 0 {
        return Err(anyhow::anyhow!("文件大小为0: {}", input_path));
    }

    // 加载图片
    let img = match image::open(input_path) {
        Ok(img) => {
            img
        }
        Err(e) => {
            return Err(anyhow::anyhow!("无法加载图片 {}: {}", input_path, e));
        }
    };

    
    // 统一获取输出格式和扩展名
    let (format_str, extension) = if global_settings.output_format == "original" {
        // 保持原格式
        let path = Path::new(input_path);
        let ext = path.extension().unwrap_or_default().to_str().unwrap_or("jpg");
        (ext.to_string(), ext)
    } else {
        (global_settings.output_format.clone(), global_settings.output_format.as_str())
    };
    
   
    
    let output_path = generate_output_filename(
        input_path,
        &global_settings.output_directory,
        &global_settings.filename_pattern,
        "compressed",
        extension,
    );
    
    // 检查文件覆盖
    check_file_overwrite(&output_path, global_settings.overwrite_existing)?;
    
    // 确保输出目录存在
    ensure_output_directory(&output_path)?;
    
    let format = get_image_format(&format_str)?;
    
    // 保存图片
    match format {
        ImageFormat::Jpeg => {
            // JPEG格式需要特殊处理质量参数
            let mut output = std::fs::File::create(&output_path)?;
            let encoder = image::codecs::jpeg::JpegEncoder::new_with_quality(&mut output, quality);
            img.write_with_encoder(encoder)?;
        }
        ImageFormat::Png => {
            // PNG格式的压缩
            let mut output = std::fs::File::create(&output_path)?;
            let encoder = image::codecs::png::PngEncoder::new(&mut output);
            img.write_with_encoder(encoder)?;
        }
        ImageFormat::WebP => {
            // WebP格式的压缩 - 使用默认保存方法
            img.save_with_format(&output_path, format)?;
        }
        _ => {
            // 其他格式使用默认保存
            img.save_with_format(&output_path, format)?;
        }
    }
    
    // 获取压缩后的文件大小
    let original_size = get_file_size(input_path)?;
    let compressed_size = get_file_size(&output_path)?;
    let _compression_ratio = (1.0 - (compressed_size as f64 / original_size as f64)) * 100.0;
    
    Ok(output_path)
}

/// 批量压缩图片
pub async fn compress_images_batch(
    input_paths: Vec<String>,
    settings: CompressSettings,
    global_settings: GlobalSettings,
) -> ProcessingResult {
    
    let mut processed_files = Vec::new();
    let mut total_original_size = 0u64;
    let mut total_compressed_size = 0u64;
    
    for (_index, input_path) in input_paths.iter().enumerate() {
        
        match compress_single_image(input_path, &settings, &global_settings).await {
            Ok(output_path) => {
                // 统计文件大小
                if let (Ok(original), Ok(compressed)) = (get_file_size(input_path), get_file_size(&output_path)) {
                    total_original_size += original;
                    total_compressed_size += compressed;
                }
                
                processed_files.push(output_path);
            }
            Err(e) => {
                return ProcessingResult {
                    success: false,
                    processed_files: vec![],
                    error: Some(format!("压缩失败: {}", e)),
                };
            }
        }
    }
    
    // 计算总体压缩率
    let _total_compression_ratio = if total_original_size > 0 {
        (1.0 - (total_compressed_size as f64 / total_original_size as f64)) * 100.0
    } else {
        0.0
    };
    

    
    ProcessingResult {
        success: true,
        processed_files,
        error: None,
    }
}

/// 获取推荐的压缩设置
pub fn get_recommended_compress_settings(file_size: u64) -> CompressSettings {
    let quality = if file_size > 10 * 1024 * 1024 {
        // 大于10MB的文件，使用较低质量
        60
    } else if file_size > 5 * 1024 * 1024 {
        // 5-10MB的文件，使用中等质量
        75
    } else {
        // 小于5MB的文件，使用较高质量
        85
    };
    
    CompressSettings {
        quality,
        format: "original".to_string(), // 使用默认格式，实际格式由全局设置决定
    }
}

/// 预估压缩后的文件大小
pub fn estimate_compressed_size(original_size: u64, quality: u8, format: &str) -> u64 {
    let compression_factor = match format.to_uppercase().as_str() {
        "JPEG" | "JPG" => {
            // JPEG压缩率基于质量
            let factor = (quality as f64 / 100.0) * 0.8 + 0.1;
            factor
        }
        "PNG" => {
            // PNG是无损压缩，压缩率相对固定
            0.7
        }
        "WEBP" => {
            // WebP通常有更好的压缩率
            let factor = (quality as f64 / 100.0) * 0.6 + 0.1;
            factor
        }
        _ => 0.8,
    };
    
    (original_size as f64 * compression_factor) as u64
}
