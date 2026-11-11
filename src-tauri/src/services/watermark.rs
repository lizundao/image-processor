use crate::types::*;
use crate::utils::*;
use anyhow::Result;
use image::{ImageFormat, RgbaImage};
use imageproc::drawing::draw_text_mut;
use rusttype::{Font, Scale};
use fontdb::Database;
use std::fs;

/// 添加水印到单张图片
pub async fn add_watermark_single(
    input_path: &str,
    settings: &WatermarkSettings,
    global_settings: &GlobalSettings,
    file_index: Option<usize>,
) -> Result<String> {
    
    // 验证输入
    validate_image_file(input_path)?;
    validate_opacity(settings.opacity)?;
    
    // 加载图片并转换为RGBA格式
    let mut img = image::open(input_path)?.to_rgba8();
    
    // 获取原始图片格式
    let original_format = image::ImageFormat::from_path(input_path)
        .unwrap_or(ImageFormat::Jpeg);

    // 确定输出格式和扩展名
    let (output_format, extension) = match original_format {
        ImageFormat::Png => (ImageFormat::Png, "png"),
        ImageFormat::Jpeg => (ImageFormat::Jpeg, "jpg"),
        ImageFormat::WebP => (ImageFormat::WebP, "webp"),
        _ => (ImageFormat::Png, "png"), // 其他格式默认转为PNG
    };

    // 生成输出文件名
          let output_path = generate_output_filename(
        input_path,
        global_settings,
        "watermarked",
        extension,
        file_index,
    );
    
    // 检查文件覆盖
    check_file_overwrite(&output_path, global_settings.overwrite_existing)?;
    
    // 确保输出目录存在
    ensure_output_directory(&output_path)?;
    
    // 根据水印类型进行处理
    match settings.watermark_type.as_str() {
        "text" => {
            let default_text = "Watermark".to_string();
            let text = settings.text.as_ref().unwrap_or(&default_text);
            let font_size = settings.font_size.unwrap_or(24);
            let _font_color = settings.font_color.as_ref().unwrap_or(&"#000000".to_string());
            let default_font = "Arial".to_string();
            let font_family = settings.font_family.as_ref().unwrap_or(&default_font);
            let margin_x = settings.margin_x.unwrap_or(20);
            let margin_y = settings.margin_y.unwrap_or(20);

            // 计算文字位置
            let (text_x, text_y) = calculate_text_position_with_margin(
                text,
                &settings.position,
                img.width(),
                img.height(),
                font_size,
                margin_x,
                margin_y,
            );

            // 解析颜色
            let default_color = "#000000".to_string();
            let font_color = settings.font_color.as_ref().unwrap_or(&default_color);
            let (r, g, b) = parse_hex_color(font_color).unwrap_or((0, 0, 0));
            
            
            // 添加文字水印
            add_text_watermark(&mut img, text, text_x, text_y, settings.opacity, font_size, Some(font_family), r, g, b);
        }
        "image" => {
            if let Some(image_path) = &settings.image_path {
                let scale = settings.image_scale.unwrap_or(1.0);
                let margin_x = settings.margin_x.unwrap_or(20);
                let margin_y = settings.margin_y.unwrap_or(20);

                // 添加图片水印
                add_image_watermark_to_image(&mut img, image_path, &settings.position, settings.opacity, scale, margin_x, margin_y)?;
            } else {
                return Err(anyhow::anyhow!("图片水印路径未设置"));
            }
        }
        _ => {
            return Err(anyhow::anyhow!("不支持的水印类型: {}", settings.watermark_type));
        }
    }
    
    // 保存图片，使用原始格式
    let dynamic_img = image::DynamicImage::ImageRgba8(img);

    // 根据原始格式保存，保持文件大小
    match output_format {
        ImageFormat::Jpeg => {
            // JPEG不支持透明度，需要转换为RGB
            let rgb_img = dynamic_img.to_rgb8();
            let rgb_dynamic = image::DynamicImage::ImageRgb8(rgb_img);
            rgb_dynamic.save_with_format(&output_path, ImageFormat::Jpeg)?;
        }
        _ => {
            // PNG、WebP等支持透明度的格式
            dynamic_img.save_with_format(&output_path, output_format)?;
        }
    }
    
    Ok(output_path)
}

/// 批量添加水印
pub async fn add_watermark_batch(
    input_paths: Vec<String>,
    settings: WatermarkSettings,
    global_settings: GlobalSettings,
) -> ProcessingResult {
    
    let mut processed_files = Vec::new();
    
    for (index, input_path) in input_paths.iter().enumerate() {
        
        match add_watermark_single(input_path, &settings, &global_settings, Some(index)).await {
            Ok(output_path) => {
                processed_files.push(output_path);
            }
            Err(e) => {
                return ProcessingResult {
                    success: false,
                    processed_files: vec![],
                    error: Some(format!("水印添加失败: {}", e)),
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

/// 添加文字水印（使用系统字体）
fn add_text_watermark(
    img: &mut RgbaImage,
    text: &str,
    x: u32,
    y: u32,
    opacity: f32,
    font_size: u32,
    preferred_font: Option<&str>,
    r: u8,
    g: u8,
    b: u8,
) {
    // 尝试使用系统默认字体
    let mut db = Database::new();
    db.load_system_fonts();

    // 查找合适的字体
    let mut font_data: Option<Vec<u8>> = None;

    // 构建字体优先级列表
    let mut preferred_fonts = Vec::new();

    // 如果指定了首选字体，优先使用
    if let Some(font) = preferred_font {
        preferred_fonts.push(font);
    }

    // 添加常用字体作为备选
    preferred_fonts.extend_from_slice(&[
        "Microsoft YaHei", "SimSun", "SimHei", "PingFang SC",
        "Hiragino Sans GB", "Source Han Sans CN", "Noto Sans CJK SC",
        "Arial", "Times New Roman", "Helvetica", "Verdana"
    ]);

    for font_name in preferred_fonts {
        for face in db.faces() {
            for family in &face.families {
                if family.0.eq_ignore_ascii_case(font_name) {
                    if let fontdb::Source::File(ref path) = face.source {
                        if let Ok(data) = fs::read(path) {
                            font_data = Some(data);
                            break;
                        }
                    }
                }
            }
            if font_data.is_some() { break; }
        }
        if font_data.is_some() { break; }
    }

    // 如果找到字体，使用它渲染
    if let Some(data) = font_data {
        if let Some(font) = Font::try_from_vec(data) {
            let scale = Scale::uniform(font_size as f32);
            let color = image::Rgba([r, g, b, (opacity * 255.0) as u8]);

            // 使用imageproc绘制文字
            draw_text_mut(img, color, x as i32, y as i32, scale, &font, text);
            return;
        }
    }

    // 如果字体加载失败，使用简化的绘制方法
    add_simple_text_watermark(img, text, x, y, opacity, font_size, r, g, b);
}

/// 简化的文字水印（改进版本，支持中文显示）
fn add_simple_text_watermark(
    img: &mut RgbaImage,
    text: &str,
    x: u32,
    y: u32,
    opacity: f32,
    font_size: u32,
    r: u8,
    g: u8,
    b: u8,
) {
    let alpha = (opacity * 255.0) as u8;
    let char_width = font_size; // 中文字符宽度
    let char_height = font_size;

    // 创建一个简单的字符背景矩形
    let text_width = text.chars().count() as u32 * char_width;
    let text_height = char_height;

    // 绘制文字背景矩形
    for dx in 0..text_width {
        for dy in 0..text_height {
            let px = x + dx;
            let py = y.saturating_sub(text_height) + dy;

            if px < img.width() && py < img.height() {
                let pixel = img.get_pixel_mut(px, py);

                // 创建一个半透明的深色背景
                let is_border = dx < 2 || dx >= text_width - 2 || dy < 2 || dy >= text_height - 2;
                let is_text_area = !is_border;

                if is_text_area {
                    // 文字区域：深色
                    let bg_alpha = pixel[3] as f32 / 255.0;
                    let fg_alpha = alpha as f32 / 255.0;
                    let final_alpha = fg_alpha + bg_alpha * (1.0 - fg_alpha);

                    if final_alpha > 0.0 {
                        pixel[0] = ((r as f32 * fg_alpha + pixel[0] as f32 * bg_alpha * (1.0 - fg_alpha)) / final_alpha) as u8;
                        pixel[1] = ((g as f32 * fg_alpha + pixel[1] as f32 * bg_alpha * (1.0 - fg_alpha)) / final_alpha) as u8;
                        pixel[2] = ((b as f32 * fg_alpha + pixel[2] as f32 * bg_alpha * (1.0 - fg_alpha)) / final_alpha) as u8;
                        pixel[3] = (final_alpha * 255.0) as u8;
                    }
                }
            }
        }
    }

    // 在矩形中央添加文字标识
    let center_x = x + text_width / 2;
    let center_y = y.saturating_sub(text_height / 2);

    // 绘制一个简单的"文"字形状来表示这是文字
    for i in 0..3 {
        for j in 0..font_size / 4 {
            let px = center_x.saturating_sub(font_size / 8) + j;
            let py = center_y + i * font_size / 8;

            if px < img.width() && py < img.height() {
                let pixel = img.get_pixel_mut(px, py);
                pixel[0] = r; // 使用指定的颜色
                pixel[1] = g;
                pixel[2] = b;
                pixel[3] = alpha;
            }
        }
    }
}

/// 添加图片水印
#[allow(dead_code)]
pub async fn add_image_watermark(
    input_path: &str,
    watermark_path: &str,
    position: &str,
    opacity: f32,
    scale: f32,
    global_settings: &GlobalSettings,
) -> Result<String> {
    
    // 验证输入
    validate_image_file(input_path)?;
    validate_image_file(watermark_path)?;
    validate_opacity(opacity)?;
    
    // 加载主图片和水印图片
    let mut main_img = image::open(input_path)?.to_rgba8();
    let watermark_img = image::open(watermark_path)?.to_rgba8();
    
    // 计算水印尺寸
    let watermark_width = (watermark_img.width() as f32 * scale) as u32;
    let watermark_height = (watermark_img.height() as f32 * scale) as u32;
    
    // 调整水印大小
    let resized_watermark = image::imageops::resize(
        &watermark_img,
        watermark_width,
        watermark_height,
        image::imageops::FilterType::Lanczos3,
    );
    
    // 计算水印位置
    let (watermark_x, watermark_y) = calculate_watermark_position(
        position,
        main_img.width(),
        main_img.height(),
        watermark_width,
        watermark_height,
    );
    
    // 混合图片
    blend_images(&mut main_img, &resized_watermark, watermark_x, watermark_y, opacity);
    
    // 生成输出文件名
    let output_path = generate_output_filename(
        input_path,
        global_settings,
        "img_watermarked",
        "png",
        None,
    );
    
    // 检查文件覆盖
    check_file_overwrite(&output_path, global_settings.overwrite_existing)?;
    
    // 确保输出目录存在
    ensure_output_directory(&output_path)?;
    
    // 保存图片
    let dynamic_img = image::DynamicImage::ImageRgba8(main_img);
    dynamic_img.save_with_format(&output_path, ImageFormat::Png)?;
    
    Ok(output_path)
}

/// 计算水印位置
#[allow(dead_code)]
fn calculate_watermark_position(
    position: &str,
    main_width: u32,
    main_height: u32,
    watermark_width: u32,
    watermark_height: u32,
) -> (u32, u32) {
    let margin = 20;
    
    match position {
        "top-left" => (margin, margin),
        "top-right" => (main_width.saturating_sub(watermark_width + margin), margin),
        "bottom-left" => (margin, main_height.saturating_sub(watermark_height + margin)),
        "bottom-right" => (
            main_width.saturating_sub(watermark_width + margin),
            main_height.saturating_sub(watermark_height + margin),
        ),
        "center" => (
            (main_width.saturating_sub(watermark_width)) / 2,
            (main_height.saturating_sub(watermark_height)) / 2,
        ),
        _ => (margin, margin),
    }
}

/// 混合两张图片
#[allow(dead_code)]
fn blend_images(
    main_img: &mut RgbaImage,
    watermark: &RgbaImage,
    x: u32,
    y: u32,
    opacity: f32,
) {
    for (wx, wy, watermark_pixel) in watermark.enumerate_pixels() {
        let main_x = x + wx;
        let main_y = y + wy;
        
        if main_x < main_img.width() && main_y < main_img.height() {
            let main_pixel = main_img.get_pixel_mut(main_x, main_y);
            
            // Alpha混合
            let watermark_alpha = (watermark_pixel[3] as f32 / 255.0) * opacity;
            let main_alpha = main_pixel[3] as f32 / 255.0;
            let final_alpha = watermark_alpha + main_alpha * (1.0 - watermark_alpha);
            
            if final_alpha > 0.0 {
                for i in 0..3 {
                    main_pixel[i] = ((watermark_pixel[i] as f32 * watermark_alpha + 
                                     main_pixel[i] as f32 * main_alpha * (1.0 - watermark_alpha)) / final_alpha) as u8;
                }
                main_pixel[3] = (final_alpha * 255.0) as u8;
            }
        }
    }
}

/// 添加图片水印到现有图片
fn add_image_watermark_to_image(
    main_img: &mut RgbaImage,
    watermark_path: &str,
    position: &str,
    opacity: f32,
    scale: f32,
    margin_x: u32,
    margin_y: u32,
) -> Result<()> {
    // 加载水印图片
    let watermark_img = image::open(watermark_path)?.to_rgba8();

    // 计算水印尺寸
    let watermark_width = (watermark_img.width() as f32 * scale) as u32;
    let watermark_height = (watermark_img.height() as f32 * scale) as u32;

    // 调整水印大小
    let resized_watermark = image::imageops::resize(
        &watermark_img,
        watermark_width,
        watermark_height,
        image::imageops::FilterType::Lanczos3,
    );

    // 计算水印位置
    let (watermark_x, watermark_y) = calculate_watermark_position_with_margin(
        position,
        main_img.width(),
        main_img.height(),
        watermark_width,
        watermark_height,
        margin_x,
        margin_y,
    );

    // 混合图片
    blend_images_with_opacity(main_img, &resized_watermark, watermark_x, watermark_y, opacity);

    Ok(())
}

/// 计算水印位置（带边距）
fn calculate_watermark_position_with_margin(
    position: &str,
    main_width: u32,
    main_height: u32,
    watermark_width: u32,
    watermark_height: u32,
    margin_x: u32,
    margin_y: u32,
) -> (u32, u32) {
    match position {
        "top-left" => (margin_x, margin_y),
        "top-center" => (
            (main_width.saturating_sub(watermark_width)) / 2,
            margin_y,
        ),
        "top-right" => (
            main_width.saturating_sub(watermark_width + margin_x),
            margin_y,
        ),
        "middle-left" => (
            margin_x,
            (main_height.saturating_sub(watermark_height)) / 2,
        ),
        "center" => (
            (main_width.saturating_sub(watermark_width)) / 2,
            (main_height.saturating_sub(watermark_height)) / 2,
        ),
        "middle-right" => (
            main_width.saturating_sub(watermark_width + margin_x),
            (main_height.saturating_sub(watermark_height)) / 2,
        ),
        "bottom-left" => (
            margin_x,
            main_height.saturating_sub(watermark_height + margin_y),
        ),
        "bottom-center" => (
            (main_width.saturating_sub(watermark_width)) / 2,
            main_height.saturating_sub(watermark_height + margin_y),
        ),
        "bottom-right" => (
            main_width.saturating_sub(watermark_width + margin_x),
            main_height.saturating_sub(watermark_height + margin_y),
        ),
        _ => (margin_x, margin_y),
    }
}

/// 混合两张图片（带透明度）
fn blend_images_with_opacity(
    main_img: &mut RgbaImage,
    watermark: &RgbaImage,
    x: u32,
    y: u32,
    opacity: f32,
) {
    for (wx, wy, watermark_pixel) in watermark.enumerate_pixels() {
        let main_x = x + wx;
        let main_y = y + wy;

        if main_x < main_img.width() && main_y < main_img.height() {
            let main_pixel = main_img.get_pixel_mut(main_x, main_y);

            // Alpha混合
            let watermark_alpha = (watermark_pixel[3] as f32 / 255.0) * opacity;
            let main_alpha = main_pixel[3] as f32 / 255.0;
            let final_alpha = watermark_alpha + main_alpha * (1.0 - watermark_alpha);

            if final_alpha > 0.0 {
                for i in 0..3 {
                    main_pixel[i] = ((watermark_pixel[i] as f32 * watermark_alpha +
                                     main_pixel[i] as f32 * main_alpha * (1.0 - watermark_alpha)) / final_alpha) as u8;
                }
                main_pixel[3] = (final_alpha * 255.0) as u8;
            }
        }
    }
}
