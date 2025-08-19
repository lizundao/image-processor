use crate::types::{GifSettings, GlobalSettings, ProcessingResult};
use crate::utils::{check_file_overwrite, ensure_output_directory, generate_output_filename};
use anyhow::Result;
use gif::{Encoder, Frame, Repeat};
use image::{DynamicImage, GenericImageView};
use std::fs::File;
use std::io::BufWriter;

pub struct GifService;

impl GifService {
    /// 批量创建GIF
    pub async fn create_gif_batch(
        input_paths: Vec<String>,
        settings: GifSettings,
        global_settings: GlobalSettings,
    ) -> ProcessingResult {
        if input_paths.len() < 2 {
            return ProcessingResult {
                success: false,
                processed_files: vec![],
                error: Some("创建GIF至少需要2张图片".to_string()),
            };
        }

        // 调用真正的GIF合成函数
        match Self::create_gif(input_paths, settings, global_settings).await {
            Ok(output_path) => {
                ProcessingResult {
                    success: true,
                    processed_files: vec![output_path],
                    error: None,
                }
            }
            Err(e) => {
                let error_msg = format!("创建GIF失败: {}", e);
                ProcessingResult {
                    success: false,
                    processed_files: vec![],
                    error: Some(error_msg),
                }
            }
        }
    }

    /// 从多张图片创建GIF
    pub async fn create_gif(
        input_paths: Vec<String>,
        settings: GifSettings,
        global_settings: GlobalSettings,
    ) -> Result<String> {
        if input_paths.len() < 2 {
            return Err(anyhow::anyhow!("创建GIF至少需要2张图片"));
        }

        // 读取所有图片
        let mut images: Vec<DynamicImage> = Vec::new();
        for input_path in &input_paths {
            let img = image::open(input_path)?;
            images.push(img);
        }

        // 统一尺寸（使用第一张图片的尺寸）
        let first_dimensions = images[0].dimensions();
        let unified_images: Vec<DynamicImage> = images
            .into_iter()
            .map(|img| {
                if img.dimensions() != first_dimensions {
                    img.resize_exact(first_dimensions.0, first_dimensions.1, image::imageops::FilterType::Lanczos3)
                } else {
                    img
                }
            })
            .collect();

        // 生成输出文件名
        let output_filename = generate_output_filename(
            &input_paths[0],
            &global_settings.output_directory,
            &global_settings.filename_pattern,
            "merged_gif",
            "gif",
        );

        // 检查文件覆盖
        check_file_overwrite(&output_filename, global_settings.overwrite_existing)?;
        ensure_output_directory(&output_filename)?;

        // 创建GIF文件
        let file = File::create(&output_filename)?;
        let mut writer = BufWriter::new(file);
        let mut encoder = Encoder::new(&mut writer, first_dimensions.0 as u16, first_dimensions.1 as u16, &[])?;

        // 设置GIF参数
        encoder.set_repeat(Repeat::Finite(settings.loop_count as u16))?;

        // 计算帧延迟（毫秒）
        let frame_delay = (1000 / settings.fps) as u16;

        // 为每张图片创建帧
        for (_i, img) in unified_images.iter().enumerate() {
            let mut pixels = img.to_rgba8().into_raw();
            let frame = Frame::from_rgba(first_dimensions.0 as u16, first_dimensions.1 as u16, &mut pixels);
            let mut frame_with_delay = frame;
            frame_with_delay.delay = frame_delay;

            // 编码帧
            encoder.write_frame(&frame_with_delay)?;

        }

        Ok(output_filename)
    }
}

/// 批量创建GIF
pub async fn create_gif_batch(
    input_paths: Vec<String>,
    settings: GifSettings,
    global_settings: GlobalSettings,
) -> ProcessingResult {
    GifService::create_gif_batch(input_paths, settings, global_settings).await
}

/// 创建GIF
#[allow(dead_code)]
pub async fn create_gif(
    input_paths: Vec<String>,
    settings: GifSettings,
    global_settings: GlobalSettings,
) -> Result<String> {
    GifService::create_gif(input_paths, settings, global_settings).await
} 