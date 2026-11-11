use crate::types::*;
use crate::utils::*;
use anyhow::Result;
use image::{DynamicImage, GenericImageView, ImageFormat};

pub struct FlipService;

impl FlipService {
    /// 批量翻转图片
    pub async fn flip_images_batch(
        input_paths: Vec<String>,
        settings: FlipSettings,
        global_settings: GlobalSettings,
    ) -> ProcessingResult {
        let mut processed_files: Vec<String> = Vec::new();
        let mut errors: Vec<String> = Vec::new();

        for (index, path) in input_paths.iter().enumerate() {
            match Self::flip_single_image(path, &settings, &global_settings, Some(index)).await {
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

    /// 翻转单张图片
    pub async fn flip_single_image(
        input_path: &str,
        settings: &FlipSettings,
        global_settings: &GlobalSettings,
        file_index: Option<usize>,
    ) -> Result<String> {
        // 验证输入文件
        validate_image_file(input_path)?;

        // 检查是否有翻转设置
        if !settings.horizontal && !settings.vertical {
            return Err(anyhow::anyhow!("没有选择翻转方向"));
        }

        // 打开图片
        let img = image::open(input_path)?;
        let (_width, _height) = img.dimensions();

        // 执行翻转
        let flipped = Self::apply_flip(img, settings);

        // 生成输出路径
        let mut suffix_parts = Vec::new();
        if settings.horizontal {
            suffix_parts.push("h_flip");
        }
        if settings.vertical {
            suffix_parts.push("v_flip");
        }
        let suffix = suffix_parts.join("_");
        
        let output_path = generate_output_filename(
            input_path,
            global_settings,
            &suffix,
            "jpg",
            file_index,
        );

        // 检查文件覆盖
        check_file_overwrite(&output_path, global_settings.overwrite_existing)?;
        ensure_output_directory(&output_path)?;

        // 保存图片
        flipped.save_with_format(&output_path, ImageFormat::Jpeg)?;


        Ok(output_path)
    }

    /// 应用翻转效果
    fn apply_flip(img: DynamicImage, settings: &FlipSettings) -> DynamicImage {
        let mut flipped = img;

        // 应用水平翻转
        if settings.horizontal {
            flipped = flipped.fliph();
        }

        // 应用垂直翻转
        if settings.vertical {
            flipped = flipped.flipv();
        }

        flipped
    }
}

/// 批量翻转图片
pub async fn flip_images_batch(
    input_paths: Vec<String>,
    settings: FlipSettings,
    global_settings: GlobalSettings,
) -> ProcessingResult {
    FlipService::flip_images_batch(input_paths, settings, global_settings).await
}

/// 翻转单张图片
pub async fn flip_single_image(
    input_path: &str,
    settings: &FlipSettings,
    global_settings: &GlobalSettings,
    file_index: Option<usize>,
) -> Result<String> {
    FlipService::flip_single_image(input_path, settings, global_settings, file_index).await
}
