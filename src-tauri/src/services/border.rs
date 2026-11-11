use crate::types::*;
use crate::utils::*;
use anyhow::Result;
use image::{DynamicImage, GenericImageView, Rgba, RgbaImage};

pub struct BorderService;

impl BorderService {
    /// 批量添加边框
    pub async fn add_border_batch(
        input_paths: Vec<String>,
        settings: BorderSettings,
        global_settings: GlobalSettings,
    ) -> ProcessingResult {
        let mut processed_files: Vec<String> = Vec::new();
        let mut errors: Vec<String> = Vec::new();

        for (index, path) in input_paths.iter().enumerate() {
            match Self::add_border_single_image(path, &settings, &global_settings, Some(index)).await {
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

    /// 为单张图片添加边框
    pub async fn add_border_single_image(
        input_path: &str,
        settings: &BorderSettings,
        global_settings: &GlobalSettings,
        file_index: Option<usize>,
    ) -> Result<String> {
        // 验证输入文件
        validate_image_file(input_path)?;

        // 验证边框设置
        if settings.width == 0 {
            return Err(anyhow::anyhow!("边框宽度不能为0"));
        }

        // 打开图片
        let img = image::open(input_path)?;
        let (_width, _height) = img.dimensions();

        // 添加边框
        let bordered = Self::apply_border(img, settings)?;

        // 根据透明度和圆角设置选择输出格式
        let (output_format, file_extension) = if settings.enable_transparency || settings.border_radius.is_some() {
            // 如果启用透明度或有圆角，强制使用PNG格式
            (image::ImageFormat::Png, "png")
        } else {
            // 尝试从原文件扩展名推断格式
            let path = std::path::Path::new(input_path);
            let ext = path.extension().and_then(|e| e.to_str()).unwrap_or("jpg");
            match ext.to_lowercase().as_str() {
                "png" => (image::ImageFormat::Png, "png"),
                "webp" => (image::ImageFormat::WebP, "webp"),
                "gif" => (image::ImageFormat::Gif, "gif"),
                "bmp" => (image::ImageFormat::Bmp, "bmp"),
                _ => (image::ImageFormat::Jpeg, "jpg"),
            }
        };

        // 生成输出路径
        let mode_suffix = if settings.overlay_mode { "overlay" } else { "expand" };
        let radius_suffix = if let Some(radius) = settings.border_radius {
            if radius > 0 { format!("_radius{}px", radius) } else { String::new() }
        } else {
            String::new()
        };
        let suffix = format!("border_{}px_{}_{}_opacity{:.1}{}",
            settings.width, settings.style, mode_suffix, settings.opacity, radius_suffix);
        let output_path = generate_output_filename(
            input_path,
            global_settings,
            &suffix,
            file_extension,
            file_index,
        );

        // 检查文件覆盖
        check_file_overwrite(&output_path, global_settings.overwrite_existing)?;
        ensure_output_directory(&output_path)?;

        // 保存图片 - 根据设置选择格式
        bordered.save_with_format(&output_path, output_format)?;


        Ok(output_path)
    }

    /// 应用边框效果
    fn apply_border(img: DynamicImage, settings: &BorderSettings) -> Result<DynamicImage> {


        let mut result = if settings.overlay_mode {
            // 覆盖模式：边框覆盖在图片上，不改变尺寸
            Self::apply_overlay_border(img, settings)
        } else {
            // 扩展模式：边框加在图片外边，改变尺寸
            Self::apply_expand_border(img, settings)?
        };

        // 应用圆角效果 - 分层处理：先内边圆角，再整体圆角
        if let Some(radius) = settings.border_radius {
            if radius > 0 {
                result = Self::apply_layered_rounded_corners(result, radius, settings);
            }
        }

        Ok(result)
    }

    /// 覆盖模式：边框覆盖在图片上
    fn apply_overlay_border(img: DynamicImage, settings: &BorderSettings) -> DynamicImage {
        let (width, height) = img.dimensions();
        // 覆盖模式边框不能超过图片较短边，否则绘制下/右边框时 height/width - border_width 会下溢
        let _border_width = settings.width.min(width.min(height));


        // 创建与原图相同尺寸的画布
        let mut bordered = RgbaImage::new(width, height);

        // 解析边框颜色
        let border_color = Self::parse_color(&settings.color, settings.opacity);

        // 复制原图内容
        for y in 0..height {
            for x in 0..width {
                bordered.put_pixel(x, y, img.get_pixel(x, y));
            }
        }

        // 在边缘绘制边框
        Self::draw_overlay_border(&mut bordered, _border_width, &border_color, &settings.style);

        DynamicImage::ImageRgba8(bordered)
    }

    /// 扩展模式：边框加在图片外边
    fn apply_expand_border(img: DynamicImage, settings: &BorderSettings) -> Result<DynamicImage> {
        let (width, height) = img.dimensions();
        let _border_width = settings.width;


        // 计算新尺寸（checked 运算 + 像素上限，防止 u32 溢出与内存耗尽）
        const MAX_BORDER_PIXELS: u64 = 268_435_456;
        let doubled = _border_width
            .checked_mul(2)
            .ok_or_else(|| anyhow::anyhow!("边框宽度过大"))?;
        let new_width = width
            .checked_add(doubled)
            .ok_or_else(|| anyhow::anyhow!("边框宽度过大，图片宽度溢出"))?;
        let new_height = height
            .checked_add(doubled)
            .ok_or_else(|| anyhow::anyhow!("边框宽度过大，图片高度溢出"))?;
        if (new_width as u64) * (new_height as u64) > MAX_BORDER_PIXELS {
            return Err(anyhow::anyhow!("加边框后的图片尺寸过大，超出安全上限"));
        }


        // 创建新画布
        let mut bordered = RgbaImage::new(new_width, new_height);

        // 解析边框颜色
        let border_color = Self::parse_color(&settings.color, settings.opacity);

        // 填充边框区域
        for y in 0..new_height {
            for x in 0..new_width {
                let pixel = if x < _border_width || x >= width + _border_width ||
                              y < _border_width || y >= height + _border_width {
                    // 边框区域
                    border_color
                } else {
                    // 图片区域 - 保持原图片的透明度
                    let img_x = x - _border_width;
                    let img_y = y - _border_width;
                    let img_pixel = img.get_pixel(img_x, img_y);

                    // 如果原图片有透明像素，保持其透明度
                    if img_pixel[3] < 255 {
                        img_pixel
                    } else {
                        // 完全不透明的像素，直接使用
                        img_pixel
                    }
                };
                bordered.put_pixel(x, y, pixel);
            }
        }

        // 应用边框样式效果（虚线、点线等）
        if settings.style != "default" {
            Self::apply_border_style(&mut bordered, _border_width, &border_color, &settings.style);
        }

        Ok(DynamicImage::ImageRgba8(bordered))
    }

    /// 绘制覆盖模式的边框
    fn draw_overlay_border(
        image: &mut RgbaImage,
        border_width: u32,
        border_color: &Rgba<u8>,
        style: &str,
    ) {
        let (width, height) = image.dimensions();

        // 绘制上边框
        for y in 0..border_width {
            for x in 0..width {
                Self::blend_pixel(image, x, y, border_color);
            }
        }

        // 绘制下边框
        for y in (height - border_width)..height {
            for x in 0..width {
                Self::blend_pixel(image, x, y, border_color);
            }
        }

        // 绘制左边框
        for y in 0..height {
            for x in 0..border_width {
                Self::blend_pixel(image, x, y, border_color);
            }
        }

        // 绘制右边框
        for y in 0..height {
            for x in (width - border_width)..width {
                Self::blend_pixel(image, x, y, border_color);
            }
        }

        // 应用边框样式效果
        if style != "solid" {
            Self::apply_overlay_border_style(image, border_width, border_color, style);
        }
    }

    /// 像素混合（支持透明度）
    fn blend_pixel(image: &mut RgbaImage, x: u32, y: u32, border_color: &Rgba<u8>) {
        let original_pixel = image.get_pixel(x, y);
        let border_alpha = border_color[3] as f32 / 255.0;

        if border_alpha > 0.0 {
            let blended_pixel = Rgba([
                ((1.0 - border_alpha) * original_pixel[0] as f32 + border_alpha * border_color[0] as f32) as u8,
                ((1.0 - border_alpha) * original_pixel[1] as f32 + border_alpha * border_color[1] as f32) as u8,
                ((1.0 - border_alpha) * original_pixel[2] as f32 + border_alpha * border_color[2] as f32) as u8,
                original_pixel[3], // 保持原图的Alpha通道
            ]);
            image.put_pixel(x, y, blended_pixel);
        }
    }

    /// 解析颜色字符串
    fn parse_color(color_str: &str, opacity: f32) -> Rgba<u8> {
        let color_str = color_str.trim_start_matches('#');

        // 先确认全为 ASCII 十六进制字符，避免按字节切片切在 UTF-8 多字节字符中间触发 panic
        if color_str.len() == 6 && color_str.bytes().all(|b| b.is_ascii_hexdigit()) {
            if let (Ok(r), Ok(g), Ok(b)) = (
                u8::from_str_radix(&color_str[0..2], 16),
                u8::from_str_radix(&color_str[2..4], 16),
                u8::from_str_radix(&color_str[4..6], 16),
            ) {
                let alpha = (opacity.clamp(0.0, 1.0) * 255.0).round() as u8;
                return Rgba([r, g, b, alpha]);
            }
        }

        // 默认黑色，带透明度
        let alpha = (opacity.clamp(0.0, 1.0) * 255.0).round() as u8;
        Rgba([0, 0, 0, alpha])
    }

    /// 应用覆盖模式的边框样式
    fn apply_overlay_border_style(
        image: &mut RgbaImage,
        border_width: u32,
        border_color: &Rgba<u8>,
        style: &str,
    ) {
        let (width, height) = image.dimensions();

        match style {
            "dashed" => {
                // 虚线效果：每隔一定距离绘制边框
                let dash_length = 10;
                let gap_length = 5;
                let total_length = dash_length + gap_length;

                // 上边框
                for x in (0..width).step_by(total_length as usize) {
                    for dx in 0..dash_length.min(width - x) {
                        for dy in 0..border_width {
                            if x + dx < width && dy < height {
                                Self::blend_pixel(image, x + dx, dy, border_color);
                            }
                        }
                    }
                }

                // 下边框
                for x in (0..width).step_by(total_length as usize) {
                    for dx in 0..dash_length.min(width - x) {
                        for dy in 0..border_width {
                            if x + dx < width && height - 1 - dy < height {
                                Self::blend_pixel(image, x + dx, height - 1 - dy, border_color);
                            }
                        }
                    }
                }

                // 左边框
                for y in (0..height).step_by(total_length as usize) {
                    for dy in 0..dash_length.min(height - y) {
                        for dx in 0..border_width {
                            if dx < width && y + dy < height {
                                Self::blend_pixel(image, dx, y + dy, border_color);
                            }
                        }
                    }
                }

                // 右边框
                for y in (0..height).step_by(total_length as usize) {
                    for dy in 0..dash_length.min(height - y) {
                        for dx in 0..border_width {
                            if width - 1 - dx < width && y + dy < height {
                                Self::blend_pixel(image, width - 1 - dx, y + dy, border_color);
                            }
                        }
                    }
                }
            }
            "dotted" => {
                // 点线效果：每隔一定距离绘制点
                let dot_spacing = 8;

                // 上边框
                for x in (0..width).step_by(dot_spacing) {
                    for dx in 0..2.min(width - x) {
                        for dy in 0..2.min(border_width) {
                            if x + dx < width && dy < height {
                                Self::blend_pixel(image, x + dx, dy, border_color);
                            }
                        }
                    }
                }

                // 下边框
                for x in (0..width).step_by(dot_spacing) {
                    for dx in 0..2.min(width - x) {
                        for dy in 0..2.min(border_width) {
                            if x + dx < width && height - 1 - dy < height {
                                Self::blend_pixel(image, x + dx, height - 1 - dy, border_color);
                            }
                        }
                    }
                }

                // 左边框
                for y in (0..height).step_by(dot_spacing) {
                    for dy in 0..2.min(height - y) {
                        for dx in 0..2.min(border_width) {
                            if dx < width && y + dy < height {
                                Self::blend_pixel(image, dx, y + dy, border_color);
                            }
                        }
                    }
                }

                // 右边框
                for y in (0..height).step_by(dot_spacing) {
                    for dy in 0..2.min(height - y) {
                        for dx in 0..2.min(border_width) {
                            if width - 1 - dx < width && y + dy < height {
                                Self::blend_pixel(image, width - 1 - dx, y + dy, border_color);
                            }
                        }
                    }
                }
            }
            _ => {
                // solid样式不需要额外处理
            }
        }
    }

    /// 应用边框样式
    fn apply_border_style(
        image: &mut RgbaImage,
        border_width: u32,
        border_color: &Rgba<u8>,
        style: &str,
    ) {
        let (width, height) = image.dimensions();

        match style {
            "dashed" => {
                // 虚线效果：每隔一定距离绘制边框
                let dash_length = 10;
                let gap_length = 5;
                let total_length = dash_length + gap_length;

                // 上边框
                for x in (0..width).step_by(total_length as usize) {
                    for dx in 0..dash_length.min(width - x) {
                        for dy in 0..border_width {
                            if x + dx < width && dy < height {
                                image.put_pixel(x + dx, dy, *border_color);
                            }
                        }
                    }
                }

                // 下边框
                for x in (0..width).step_by(total_length as usize) {
                    for dx in 0..dash_length.min(width - x) {
                        for dy in 0..border_width {
                            if x + dx < width && height - 1 - dy < height {
                                image.put_pixel(x + dx, height - 1 - dy, *border_color);
                            }
                        }
                    }
                }

                // 左边框
                for y in (0..height).step_by(total_length as usize) {
                    for dy in 0..dash_length.min(height - y) {
                        for dx in 0..border_width {
                            if dx < width && y + dy < height {
                                image.put_pixel(dx, y + dy, *border_color);
                            }
                        }
                    }
                }

                // 右边框
                for y in (0..height).step_by(total_length as usize) {
                    for dy in 0..dash_length.min(height - y) {
                        for dx in 0..border_width {
                            if width - 1 - dx < width && y + dy < height {
                                image.put_pixel(width - 1 - dx, y + dy, *border_color);
                            }
                        }
                    }
                }
            }
            "dotted" => {
                // 点线效果：每隔一定距离绘制点
                let dot_spacing = 8;

                // 上边框
                for x in (0..width).step_by(dot_spacing) {
                    for dx in 0..2.min(width - x) {
                        for dy in 0..2.min(border_width) {
                            if x + dx < width && dy < height {
                                image.put_pixel(x + dx, dy, *border_color);
                            }
                        }
                    }
                }

                // 下边框
                for x in (0..width).step_by(dot_spacing) {
                    for dx in 0..2.min(width - x) {
                        for dy in 0..2.min(border_width) {
                            if x + dx < width && height - 1 - dy < height {
                                image.put_pixel(x + dx, height - 1 - dy, *border_color);
                            }
                        }
                    }
                }

                // 左边框
                for y in (0..height).step_by(dot_spacing) {
                    for dy in 0..2.min(height - y) {
                        for dx in 0..2.min(border_width) {
                            if dx < width && y + dy < height {
                                image.put_pixel(dx, y + dy, *border_color);
                            }
                        }
                    }
                }

                // 右边框
                for y in (0..height).step_by(dot_spacing) {
                    for dy in 0..2.min(height - y) {
                        for dx in 0..2.min(border_width) {
                            if width - 1 - dx < width && y + dy < height {
                                image.put_pixel(width - 1 - dx, y + dy, *border_color);
                            }
                        }
                    }
                }
            }
            _ => {
                // solid样式不需要额外处理
            }
        }
    }

    /// 应用圆角效果 - 对整个图片（包括边框）应用圆角
    #[allow(dead_code)]
    fn apply_rounded_corners(img: DynamicImage, radius: u32) -> DynamicImage {
        let (width, height) = img.dimensions();

        // 智能圆角限制：确保圆角不会过大，但保持可见效果
        let max_radius = (width.min(height) as f32 * 0.3) as u32; // 最大为较小边的30%
        let effective_radius = if radius > max_radius {
            max_radius
        } else {
            radius
        };


        // 如果圆角太小，不应用
        if effective_radius < 5 {
            return img;
        }

        // 创建圆形遮罩 - 对整个图片应用圆角
        let mut mask = RgbaImage::new(width, height);

        for y in 0..height {
            for x in 0..width {
                let alpha = if Self::is_inside_rounded_rect(x, y, width, height, effective_radius) {
                    255 // 圆角矩形内部，保持不透明
                } else {
                    0 // 圆角矩形外部，完全透明
                };
                mask.put_pixel(x, y, Rgba([255, 255, 255, alpha]));
            }
        }

        // 应用遮罩到原图 - 这样内外都会有圆角
        let mut result = img.to_rgba8();
        for y in 0..height {
            for x in 0..width {
                let mask_pixel = mask.get_pixel(x, y);
                let img_pixel = result.get_pixel(x, y);

                // 根据遮罩的alpha值调整图片的alpha值
                let new_alpha = (img_pixel[3] as u32 * mask_pixel[3] as u32 / 255) as u8;
                result.put_pixel(x, y, Rgba([img_pixel[0], img_pixel[1], img_pixel[2], new_alpha]));
            }
        }

        DynamicImage::ImageRgba8(result)
    }

    /// 分层圆角处理 - 先内边圆角，再整体圆角
    fn apply_layered_rounded_corners(img: DynamicImage, radius: u32, settings: &BorderSettings) -> DynamicImage {
        let (width, height) = img.dimensions();
        let border_width = settings.width as u32;

        // 智能圆角限制
        let max_radius = (width.min(height) as f32 * 0.3) as u32;
        let effective_radius = if radius > max_radius {
            max_radius
        } else {
            radius
        };

        if effective_radius < 5 {
            return img;
        }



        // 第一步：给内边（图片内容区域）添加圆角
        let mut result = img.to_rgba8();

        if settings.overlay_mode {
            // 覆盖模式：内边就是整个图片
            result = Self::apply_inner_rounded_corners(&result, effective_radius);
        } else {
            // 扩展模式：内边是图片内容区域（排除边框）
            result = Self::apply_inner_rounded_corners_with_border(&result, effective_radius, border_width);
        }

        // 第二步：给整体（包括边框）添加圆角
        result = Self::apply_outer_rounded_corners(&result, effective_radius);

        DynamicImage::ImageRgba8(result)
    }

    /// 给内边（图片内容区域）添加圆角
    fn apply_inner_rounded_corners(img: &RgbaImage, radius: u32) -> RgbaImage {
        let (width, height) = img.dimensions();
        let mut result = img.clone();

        // 创建内边圆角遮罩
        for y in 0..height {
            for x in 0..width {
                if !Self::is_inside_rounded_rect(x, y, width, height, radius) {
                    // 圆角外部区域，设置为透明
                    let pixel = result.get_pixel(x, y);
                    result.put_pixel(x, y, Rgba([pixel[0], pixel[1], pixel[2], 0]));
                }
            }
        }

        result
    }

    /// 给内边（图片内容区域）添加圆角（考虑边框）
    fn apply_inner_rounded_corners_with_border(img: &RgbaImage, radius: u32, border_width: u32) -> RgbaImage {
        let (width, height) = img.dimensions();
        let mut result = img.clone();

        // 内边区域（排除边框，saturating 防止下溢）
        let inner_width = width.saturating_sub(border_width.saturating_mul(2));
        let inner_height = height.saturating_sub(border_width.saturating_mul(2));

        // 创建内边圆角遮罩
        for y in 0..height {
            for x in 0..width {
                if x >= border_width && x < width - border_width &&
                   y >= border_width && y < height - border_width {
                    // 内边区域
                    let inner_x = x - border_width;
                    let inner_y = y - border_width;
                    if !Self::is_inside_rounded_rect(inner_x, inner_y, inner_width, inner_height, radius) {
                        // 内边圆角外部，设置为透明
                        let pixel = result.get_pixel(x, y);
                        result.put_pixel(x, y, Rgba([pixel[0], pixel[1], pixel[2], 0]));
                    }
                }
            }
        }

        result
    }

    /// 给整体（包括边框）添加圆角
    fn apply_outer_rounded_corners(img: &RgbaImage, radius: u32) -> RgbaImage {
        let (width, height) = img.dimensions();
        let mut result = img.clone();

        // 创建整体圆角遮罩
        for y in 0..height {
            for x in 0..width {
                if !Self::is_inside_rounded_rect(x, y, width, height, radius) {
                    // 整体圆角外部，设置为透明
                    let pixel = result.get_pixel(x, y);
                    result.put_pixel(x, y, Rgba([pixel[0], pixel[1], pixel[2], 0]));
                }
            }
        }

        result
    }

    /// 判断点是否在圆角矩形内部
    fn is_inside_rounded_rect(x: u32, y: u32, width: u32, height: u32, radius: u32) -> bool {
        if width == 0 || height == 0 {
            return false;
        }
        // 圆角半径不得超过边长的一半，否则 width/height - radius 会下溢
        let r = radius.min(width / 2).min(height / 2);
        if r == 0 {
            return true;
        }
        // 检查是否在基本矩形内（距离用 i64，避免大半径下 i32 平方溢出）
        if x < r || x >= width - r || y < r || y >= height - r {
            if x < r && y < r {
                let dx = x as i64 - r as i64;
                let dy = y as i64 - r as i64;
                dx * dx + dy * dy <= (r as i64) * (r as i64)
            } else if x >= width - r && y < r {
                let dx = x as i64 - (width as i64 - r as i64);
                let dy = y as i64 - r as i64;
                dx * dx + dy * dy <= (r as i64) * (r as i64)
            } else if x < r && y >= height - r {
                let dx = x as i64 - r as i64;
                let dy = y as i64 - (height as i64 - r as i64);
                dx * dx + dy * dy <= (r as i64) * (r as i64)
            } else if x >= width - r && y >= height - r {
                let dx = x as i64 - (width as i64 - r as i64);
                let dy = y as i64 - (height as i64 - r as i64);
                dx * dx + dy * dy <= (r as i64) * (r as i64)
            } else {
                true
            }
        } else {
            true
        }
    }
}

/// 批量添加边框
pub async fn add_border_batch(
    input_paths: Vec<String>,
    settings: BorderSettings,
    global_settings: GlobalSettings,
) -> ProcessingResult {
    BorderService::add_border_batch(input_paths, settings, global_settings).await
}

/// 为单张图片添加边框
pub async fn add_border_single_image(
    input_path: &str,
    settings: &BorderSettings,
    global_settings: &GlobalSettings,
    file_index: Option<usize>,
) -> Result<String> {
    BorderService::add_border_single_image(input_path, settings, global_settings, file_index).await
}
