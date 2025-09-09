use crate::types::{GridSliceSettings, GlobalSettings, ProcessingResult};
use anyhow::Result;
use image::GenericImageView;
use std::path::Path;

/// 宫格切图处理
pub async fn grid_slice_images(
    input_paths: Vec<String>,
    settings: GridSliceSettings,
    global_settings: GlobalSettings,
) -> ProcessingResult {

    let mut processed_files = Vec::new();
    let mut total_original_size = 0u64;
    let mut total_processed_size = 0u64;

    for (_index, input_path) in input_paths.iter().enumerate() {

        match grid_slice_single_image(input_path, &settings, &global_settings).await {
            Ok(output_paths) => {
                // 统计文件大小
                if let Ok(original) = crate::utils::get_file_size(input_path) {
                    total_original_size += original;
                    
                    // 统计所有切片的文件大小
                    for output_path in &output_paths {
                        if let Ok(processed) = crate::utils::get_file_size(output_path) {
                            total_processed_size += processed;
                        }
                    }
                }

                processed_files.extend(output_paths);
            }
            Err(e) => {
                return ProcessingResult {
                    success: false,
                    processed_files: vec![],
                    error: Some(format!("宫格切图失败: {}", e)),
                };
            }
        }
    }

    // 计算总体处理率
    let _total_processing_ratio = if total_original_size > 0 {
        (total_processed_size as f64 / total_original_size as f64) * 100.0
    } else {
        0.0
    };


    ProcessingResult {
        success: true,
        processed_files,
        error: None,
    }
}

/// 处理单张图片的宫格切图
async fn grid_slice_single_image(
    input_path: &str,
    settings: &GridSliceSettings,
    global_settings: &GlobalSettings,
) -> Result<Vec<String>> {

    // 加载图片
    let img = image::open(input_path)?;
    let (width, height) = img.dimensions();


    // 计算每个切片的尺寸
    let slice_width = width / settings.columns as u32;
    let slice_height = height / settings.rows as u32;


    // 确定输出格式
    let output_format = if global_settings.output_format == "original" {
        let path = Path::new(input_path);
        path.extension().unwrap_or_default().to_str().unwrap_or("jpg").to_string()
    } else {
        global_settings.output_format.clone()
    };

    let format = crate::utils::get_image_format(&output_format)?;

    // 生成输出文件名基础部分（去掉临时文件时间戳）
    let path = Path::new(input_path);
    let stem = path.file_stem().unwrap_or_default().to_str().unwrap_or("image");
    
    // 如果文件名包含时间戳（格式：原文件名_时间戳），去掉时间戳部分
    let clean_stem = if stem.contains('_') {
        // 检查是否以数字结尾（时间戳格式）
        if let Some(last_underscore) = stem.rfind('_') {
            let potential_timestamp = &stem[last_underscore + 1..];
            // 如果下划线后的部分是纯数字且长度>=10，认为是时间戳
            if potential_timestamp.chars().all(|c| c.is_ascii_digit()) && potential_timestamp.len() >= 10 {
                &stem[..last_underscore]
            } else {
                stem
            }
        } else {
            stem
        }
    } else {
        stem
    };

    let mut output_paths = Vec::new();

    // 生成切片
    for row in 0..settings.rows {
        for col in 0..settings.columns {
            let x = col as u32 * slice_width;
            let y = row as u32 * slice_height;
            let w = if col == settings.columns - 1 { width - x } else { slice_width };
            let h = if row == settings.rows - 1 { height - y } else { slice_height };

            // 裁剪切片
            let slice = img.crop_imm(x, y, w, h);

            // 生成输出文件名（去掉时间戳）
            let slice_name = settings.naming_pattern
                .replace("{row}", &(row + 1).to_string())
                .replace("{col}", &(col + 1).to_string());

            let output_filename = format!("{}_{}.{}", clean_stem, slice_name, output_format);
            let output_path = if global_settings.output_directory.is_empty() {
                output_filename
            } else {
                let output_path = Path::new(&global_settings.output_directory).join(&output_filename);
                output_path.to_string_lossy().to_string()
            };

            // 检查文件覆盖
            crate::utils::check_file_overwrite(&output_path, global_settings.overwrite_existing)?;

            // 确保输出目录存在
            crate::utils::ensure_output_directory(&output_path)?;

            // 保存切片
            match format {
                image::ImageFormat::Jpeg => {
                    let mut output = std::fs::File::create(&output_path)?;
                    let encoder = image::codecs::jpeg::JpegEncoder::new_with_quality(
                        &mut output,
                        settings.quality as u8,
                    );
                    slice.write_with_encoder(encoder)?;
                }
                image::ImageFormat::Png => {
                    let mut output = std::fs::File::create(&output_path)?;
                    let encoder = image::codecs::png::PngEncoder::new(&mut output);
                    slice.write_with_encoder(encoder)?;
                }
                image::ImageFormat::WebP => {
                    slice.save_with_format(&output_path, format)?;
                }
                _ => {
                    slice.save_with_format(&output_path, format)?;
                }
            }

            output_paths.push(output_path);
        }
    }

    // 如果设置包含原图，复制原图（去掉时间戳）
    if settings.include_original {
        let original_filename = format!("{}_original.{}", clean_stem, output_format);
        let original_output_path = if global_settings.output_directory.is_empty() {
            original_filename
        } else {
            let output_path = Path::new(&global_settings.output_directory).join(&original_filename);
            output_path.to_string_lossy().to_string()
        };

        // 检查文件覆盖
        crate::utils::check_file_overwrite(&original_output_path, global_settings.overwrite_existing)?;

        // 确保输出目录存在
        crate::utils::ensure_output_directory(&original_output_path)?;

        // 保存原图
        match format {
            image::ImageFormat::Jpeg => {
                let mut output = std::fs::File::create(&original_output_path)?;
                let encoder = image::codecs::jpeg::JpegEncoder::new_with_quality(
                    &mut output,
                    settings.quality as u8,
                );
                img.write_with_encoder(encoder)?;
            }
            image::ImageFormat::Png => {
                let mut output = std::fs::File::create(&original_output_path)?;
                let encoder = image::codecs::png::PngEncoder::new(&mut output);
                img.write_with_encoder(encoder)?;
            }
            image::ImageFormat::WebP => {
                img.save_with_format(&original_output_path, format)?;
            }
            _ => {
                img.save_with_format(&original_output_path, format)?;
            }
        }

        output_paths.push(original_output_path);
    }



    Ok(output_paths)
} 