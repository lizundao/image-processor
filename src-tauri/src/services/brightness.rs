use crate::types::*;
use crate::utils::*;
use anyhow::{Result, anyhow};
use image::{DynamicImage, ImageFormat};
use std::path::Path;

pub struct BrightnessService;

impl BrightnessService {
    pub async fn adjust_brightness_single(
        input_path: &str,
        settings: &BrightnessSettings,
        global_settings: &GlobalSettings,
        file_index: Option<usize>,
    ) -> Result<String> {
        validate_image_file(input_path)?;
        validate_brightness(settings.value)?;

        if global_settings.output_directory.is_empty() {
            return Err(anyhow!("输出目录未设置"));
        }

        let img = image::open(input_path)?;
        let adjusted = Self::apply_brightness_adjustment(img, settings.value);
        let (output_format, extension) = resolve_output_format(input_path, global_settings)?;

        let suffix = format!("brightness_{}", settings.value);
        let output_path = generate_output_filename(
            input_path,
            global_settings,
            &suffix,
            &extension,
            file_index,
        );

        check_file_overwrite(&output_path, global_settings.overwrite_existing)?;
        ensure_output_directory(&output_path)?;
        save_image(&adjusted, &output_path, output_format, global_settings.quality)?;

        Ok(output_path)
    }

    pub async fn adjust_brightness_batch(
        input_paths: Vec<String>,
        settings: BrightnessSettings,
        global_settings: GlobalSettings,
    ) -> ProcessingResult {
        let mut processed_files = Vec::new();

        for (index, input_path) in input_paths.iter().enumerate() {
            match Self::adjust_brightness_single(
                input_path,
                &settings,
                &global_settings,
                Some(index),
            )
            .await
            {
                Ok(output_path) => processed_files.push(output_path),
                Err(e) => {
                    return ProcessingResult {
                        success: false,
                        processed_files,
                        error: Some(format!("亮度调整失败: {}", e)),
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

    fn apply_brightness_adjustment(img: DynamicImage, brightness: i32) -> DynamicImage {
        let mut adjusted = img.to_rgba8();

        for pixel in adjusted.pixels_mut() {
            pixel[0] = ((pixel[0] as i32 + brightness).clamp(0, 255)) as u8;
            pixel[1] = ((pixel[1] as i32 + brightness).clamp(0, 255)) as u8;
            pixel[2] = ((pixel[2] as i32 + brightness).clamp(0, 255)) as u8;
        }

        DynamicImage::ImageRgba8(adjusted)
    }
}

fn validate_brightness(value: i32) -> Result<()> {
    if !(-100..=100).contains(&value) {
        return Err(anyhow!("亮度值必须在 -100 到 100 之间"));
    }
    Ok(())
}

fn resolve_output_format(
    input_path: &str,
    global_settings: &GlobalSettings,
) -> Result<(ImageFormat, String)> {
    if global_settings.output_format == "original" {
        let path = Path::new(input_path);
        let ext = path
            .extension()
            .and_then(|e| e.to_str())
            .unwrap_or("jpg");
        let format = get_image_format(ext)?;
        return Ok((format, ext.to_lowercase()));
    }

    let format = get_image_format(&global_settings.output_format)?;
    Ok((
        format,
        global_settings.output_format.to_lowercase(),
    ))
}

fn save_image(
    img: &DynamicImage,
    output_path: &str,
    format: ImageFormat,
    quality: u8,
) -> Result<()> {
    match format {
        ImageFormat::Jpeg => {
            let rgb = img.to_rgb8();
            let mut output = std::fs::File::create(output_path)?;
            let encoder = image::codecs::jpeg::JpegEncoder::new_with_quality(&mut output, quality);
            rgb.write_with_encoder(encoder)?;
        }
        ImageFormat::Png => img.save_with_format(output_path, ImageFormat::Png)?,
        ImageFormat::WebP => img.save_with_format(output_path, ImageFormat::WebP)?,
        ImageFormat::Gif => img.save_with_format(output_path, ImageFormat::Gif)?,
        ImageFormat::Bmp => img.save_with_format(output_path, ImageFormat::Bmp)?,
        _ => img.save_with_format(output_path, format)?,
    }

    Ok(())
}

pub async fn adjust_brightness_batch(
    input_paths: Vec<String>,
    settings: BrightnessSettings,
    global_settings: GlobalSettings,
) -> ProcessingResult {
    BrightnessService::adjust_brightness_batch(input_paths, settings, global_settings).await
}

pub async fn adjust_brightness_single(
    input_path: &str,
    settings: &BrightnessSettings,
    global_settings: &GlobalSettings,
    file_index: Option<usize>,
) -> Result<String> {
    BrightnessService::adjust_brightness_single(
        input_path,
        settings,
        global_settings,
        file_index,
    )
    .await
}
