use crate::types::*;
use crate::utils::*;
use anyhow::Result;
use image::{DynamicImage, GenericImageView, GenericImage, ImageFormat};

pub struct RotateService;

impl RotateService {
    /// 批量旋转图片
    pub async fn rotate_images_batch(
        input_paths: Vec<String>,
        settings: RotateSettings,
        global_settings: GlobalSettings,
    ) -> ProcessingResult {
        let mut processed_files: Vec<String> = Vec::new();
        let mut errors: Vec<String> = Vec::new();

        for path in input_paths.iter() {
            match Self::rotate_single_image(path, &settings, &global_settings).await {
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

    /// 旋转单张图片
    pub async fn rotate_single_image(
        input_path: &str,
        settings: &RotateSettings,
        global_settings: &GlobalSettings,
    ) -> Result<String> {
        // 验证输入文件
        validate_image_file(input_path)?;

        // 打开图片
        let img = image::open(input_path)?;
        let (_width, _height) = img.dimensions();

        // 计算旋转角度（转换为弧度）
        let _angle_rad = settings.angle.to_radians();

        // 执行旋转
        let rotated = match settings.angle {
            // 特殊角度优化
            90.0 => img.rotate90(),
            180.0 => img.rotate180(),
            270.0 => img.rotate270(),
            -90.0 => img.rotate270(),
            -180.0 => img.rotate180(),
            -270.0 => img.rotate90(),
            _ => {
                // 自定义角度旋转
                Self::rotate_by_angle(img, settings.angle)?
            }
        };

        // 生成输出路径
        let suffix = format!("rotated_{}deg", settings.angle);
        let output_path = generate_output_filename(
            input_path,
            &global_settings.output_directory,
            &global_settings.filename_pattern,
            &suffix,
            "jpg",
        );

        // 检查文件覆盖
        check_file_overwrite(&output_path, global_settings.overwrite_existing)?;
        ensure_output_directory(&output_path)?;

        // 保存图片
        rotated.save_with_format(&output_path, ImageFormat::Jpeg)?;

        Ok(output_path)
    }

    /// 按自定义角度旋转图片
    fn rotate_by_angle(img: DynamicImage, angle: f32) -> Result<DynamicImage> {
        // 将角度标准化到 0-360 度
        let normalized_angle = angle % 360.0;
        let angle_rad = normalized_angle.to_radians();

        // 获取图片尺寸
        let (_width, _height) = img.dimensions();

        // 计算旋转后的尺寸
        let cos_angle = angle_rad.cos().abs();
        let sin_angle = angle_rad.sin().abs();
        let new_width = (_width as f32 * cos_angle + _height as f32 * sin_angle).round() as u32;
        let new_height = (_width as f32 * sin_angle + _height as f32 * cos_angle).round() as u32;

        // 创建新的画布
        let mut rotated = DynamicImage::new_rgba8(new_width, new_height);

        // 计算旋转中心
        let center_x = new_width as f32 / 2.0;
        let center_y = new_height as f32 / 2.0;

        // 对每个像素进行旋转变换
        for y in 0..new_height {
            for x in 0..new_width {
                // 计算在原图中的位置
                let dx = x as f32 - center_x;
                let dy = y as f32 - center_y;
                
                let src_x = (dx * angle_rad.cos() - dy * angle_rad.sin() + _width as f32 / 2.0).round() as i32;
                let src_y = (dx * angle_rad.sin() + dy * angle_rad.cos() + _height as f32 / 2.0).round() as i32;

                // 检查边界
                if src_x >= 0 && src_x < _width as i32 && src_y >= 0 && src_y < _height as i32 {
                    let pixel = img.get_pixel(src_x as u32, src_y as u32);
                    rotated.put_pixel(x, y, pixel);
                }
            }
        }

        Ok(rotated)
    }
}

/// 批量旋转图片
pub async fn rotate_images_batch(
    input_paths: Vec<String>,
    settings: RotateSettings,
    global_settings: GlobalSettings,
) -> ProcessingResult {
    RotateService::rotate_images_batch(input_paths, settings, global_settings).await
}

/// 旋转单张图片
pub async fn rotate_single_image(
    input_path: &str,
    settings: &RotateSettings,
    global_settings: &GlobalSettings,
) -> Result<String> {
    RotateService::rotate_single_image(input_path, settings, global_settings).await
}
