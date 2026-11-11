use crate::types::*;
use crate::utils::*;
use anyhow::Result;
use image::{DynamicImage, GenericImageView, ImageFormat, Rgba, RgbaImage};
use image::imageops::FilterType;
use imageproc::filter::gaussian_blur_f32;
use std::path::{Path, PathBuf};
use chrono::Utc;

/// 获取应用可写的临时预览目录。
/// 优先使用系统应用数据目录（LOCALAPPDATA/APPDATA/XDG_DATA_HOME），
/// 避免使用 current_exe() 所在目录——安装版位于 Program Files 时无写权限。
fn preview_temp_dir() -> PathBuf {
    let base = std::env::var_os("LOCALAPPDATA")
        .map(PathBuf::from)
        .or_else(|| std::env::var_os("APPDATA").map(PathBuf::from))
        .or_else(|| std::env::var_os("XDG_DATA_HOME").map(PathBuf::from))
        .or_else(|| {
            std::env::var_os("HOME").map(|h| PathBuf::from(h).join(".local").join("share"))
        })
        .unwrap_or_else(std::env::temp_dir);
    base.join("image-processor").join("temp")
}

fn map_strength_to_params(strength: u32) -> (i32, f32, f32, f32, f32) {
	let s = (strength.min(100) as f32) / 100.0;
	let brightness = (s * 10.0).round() as i32; // +0..+10
	let contrast = 1.0 + 0.12 * s;              // 1.00..1.12
	let saturation = 1.0 + 0.18 * s;            // 1.00..1.18
	let gamma = 1.0 - 0.04 * s;                 // 1.00..0.96
	let sharpen_amount = 0.3 * s;               // 0..0.3
	(brightness, contrast as f32, saturation as f32, gamma as f32, sharpen_amount as f32)
}

fn apply_gamma(img: &DynamicImage, gamma: f32) -> DynamicImage {
	let gamma = if gamma <= 0.001 { 0.001 } else { gamma };
	let inv = 1.0 / gamma;
	let mut out = img.to_rgba8();
	for p in out.pixels_mut() {
		let r = (p[0] as f32 / 255.0).powf(inv);
		let g = (p[1] as f32 / 255.0).powf(inv);
		let b = (p[2] as f32 / 255.0).powf(inv);
		p[0] = (r * 255.0).clamp(0.0, 255.0) as u8;
		p[1] = (g * 255.0).clamp(0.0, 255.0) as u8;
		p[2] = (b * 255.0).clamp(0.0, 255.0) as u8;
	}
	DynamicImage::ImageRgba8(out)
}

fn apply_brightness(img: &DynamicImage, value: i32) -> DynamicImage {
	let mut out = img.to_rgba8();
	for p in out.pixels_mut() {
		let r = (p[0] as i32 + value).clamp(0, 255) as u8;
		let g = (p[1] as i32 + value).clamp(0, 255) as u8;
		let b = (p[2] as i32 + value).clamp(0, 255) as u8;
		p[0] = r; p[1] = g; p[2] = b;
	}
	DynamicImage::ImageRgba8(out)
}

fn apply_contrast(img: &DynamicImage, value: f32) -> DynamicImage {
	let mut out = img.to_rgba8();
	let c = value;
	for p in out.pixels_mut() {
		let r = (((p[0] as f32 - 128.0) * c) + 128.0).clamp(0.0, 255.0) as u8;
		let g = (((p[1] as f32 - 128.0) * c) + 128.0).clamp(0.0, 255.0) as u8;
		let b = (((p[2] as f32 - 128.0) * c) + 128.0).clamp(0.0, 255.0) as u8;
		p[0] = r; p[1] = g; p[2] = b;
	}
	DynamicImage::ImageRgba8(out)
}

fn apply_saturation(img: &DynamicImage, value: f32) -> DynamicImage {
	let mut out = img.to_rgba8();
	for p in out.pixels_mut() {
		let r = p[0] as f32 / 255.0;
		let g = p[1] as f32 / 255.0;
		let b = p[2] as f32 / 255.0;
		let l = 0.299 * r + 0.587 * g + 0.114 * b; // 亮度近似
		let nr = (l + (r - l) * value).clamp(0.0, 1.0);
		let ng = (l + (g - l) * value).clamp(0.0, 1.0);
		let nb = (l + (b - l) * value).clamp(0.0, 1.0);
		p[0] = (nr * 255.0) as u8;
		p[1] = (ng * 255.0) as u8;
		p[2] = (nb * 255.0) as u8;
	}
	DynamicImage::ImageRgba8(out)
}

fn apply_unsharp_mask(img: &DynamicImage, amount: f32) -> DynamicImage {
	if amount <= 0.0 { return img.clone(); }
	let sigma = 0.6f32; // 小半径
	let src = img.to_rgba8();
	let blurred = gaussian_blur_f32(&src, sigma);
	let (w, h) = src.dimensions();
	let mut out: RgbaImage = RgbaImage::new(w, h);
	for y in 0..h {
		for x in 0..w {
			let p = src.get_pixel(x, y);
			let q = blurred.get_pixel(x, y);
			let dr = p[0] as f32 - q[0] as f32;
			let dg = p[1] as f32 - q[1] as f32;
			let db = p[2] as f32 - q[2] as f32;
			let r = (p[0] as f32 + amount * dr).clamp(0.0, 255.0) as u8;
			let g = (p[1] as f32 + amount * dg).clamp(0.0, 255.0) as u8;
			let b = (p[2] as f32 + amount * db).clamp(0.0, 255.0) as u8;
			out.put_pixel(x, y, Rgba([r, g, b, p[3]]));
		}
	}
	DynamicImage::ImageRgba8(out)
}

fn apply_auto_exposure(img: &DynamicImage) -> DynamicImage {
	let out = img.to_luma8();
	let (w, h) = out.dimensions();
	let mut hist = [0u32; 256];
	for p in out.pixels() { hist[p[0] as usize] += 1; }
	let total = (w * h) as u32;
	let clip = (total as f32 * 0.01) as u32; // 1% 剪裁
	let mut low = 0u32; let mut high = 255u32;
	let mut acc = 0u32;
	for i in 0..256 { acc += hist[i]; if acc > clip { low = i as u32; break; } }
	acc = 0; for i in (0..256).rev() { acc += hist[i]; if acc > clip { high = i as u32; break; } }
	let a = low as f32; let b = (high as f32).max(a + 1.0);
	let mut rgb = img.to_rgba8();
	for p in rgb.pixels_mut() {
		for ch in 0..3 {
			let v = p[ch] as f32;
			let nv = ((v - a) * (255.0 / (b - a))).clamp(0.0, 255.0);
			p[ch] = nv as u8;
		}
	}
	DynamicImage::ImageRgba8(rgb)
}

fn process_pipeline(mut img: DynamicImage, params: &EnhanceSettings) -> DynamicImage {
	let (b, c, s, g, sharp) = map_strength_to_params(params.strength);
	if params.auto_exposure.unwrap_or(false) { img = apply_auto_exposure(&img); }
	img = apply_gamma(&img, g);
	img = apply_brightness(&img, b);
	img = apply_contrast(&img, c);
	img = apply_saturation(&img, s);
	if params.sharpen.unwrap_or(true) { img = apply_unsharp_mask(&img, sharp); }
	img
}

pub async fn enhance_preview(
	input_path: &str,
	params: &EnhanceSettings,
	max_size: u32,
) -> Result<(String, u32, u32)> {
	validate_image_file(input_path)?;
	let img = image::open(input_path)?;
	let (w, h) = img.dimensions();
	let scale = if w.max(h) > max_size { max_size as f32 / w.max(h) as f32 } else { 1.0 };
	let resized = if scale < 1.0 {
		img.resize((w as f32 * scale) as u32, (h as f32 * scale) as u32, FilterType::Lanczos3)
	} else { img };
	let processed = process_pipeline(resized, params);

	// 生成绝对预览路径（应用临时目录）
	let input_stem = Path::new(input_path).file_stem().unwrap_or_default().to_string_lossy().to_string();
	let timestamp = Utc::now().format("%Y%m%d_%H%M%S").to_string();
	let random_id = format!("{}", std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap_or_default().as_millis());
	let suffix = format!("enh_preview_s{}", params.strength);

	// 使用应用数据目录下的 temp 子目录（安装版 Program Files 无写权限，故不放在 exe 旁）
	let out_dir = preview_temp_dir();
	std::fs::create_dir_all(&out_dir)?;
	let out_path = out_dir.join(format!("temp_{}_{}_{}_{}.jpg", random_id, input_stem, timestamp, suffix));

	image::DynamicImage::save_with_format(&processed, &out_path, ImageFormat::Jpeg)?;
	let (pw, ph) = processed.dimensions();
	Ok((out_path.to_string_lossy().to_string(), pw, ph))
}

pub async fn enhance_apply_batch(
	input_paths: Vec<String>,
	params: EnhanceSettings,
	global: GlobalSettings,
) -> ProcessingResult {
	let mut processed_files: Vec<String> = Vec::new();
	for (index, path) in input_paths.iter().enumerate() {
		match enhance_apply_one(path, &params, &global, Some(index)).await {
			Ok(out) => processed_files.push(out),
			Err(e) => {
				return ProcessingResult { success: false, processed_files, error: Some(e.to_string()) };
			}
		}
	}
	ProcessingResult { success: true, processed_files, error: None }
}

pub async fn enhance_apply_one(
	input_path: &str,
	params: &EnhanceSettings,
	global: &GlobalSettings,
	file_index: Option<usize>,
) -> Result<String> {
	validate_image_file(input_path)?;
	let img = image::open(input_path)?;
	let processed = process_pipeline(img, params);
	let suffix = format!("enhanced_s{}", params.strength);
	let out_path = generate_output_filename(input_path, global, &suffix, "jpg", file_index);
	check_file_overwrite(&out_path, global.overwrite_existing)?;
	ensure_output_directory(&out_path)?;
	processed.save_with_format(&out_path, ImageFormat::Jpeg)?;
	Ok(out_path)
}

/// 清理临时预览文件
pub fn cleanup_preview_temp_files() -> Result<u32> {
	let temp_dir = preview_temp_dir();

	if !temp_dir.exists() {
		return Ok(0);
	}

	let mut cleaned_count = 0;

	// 读取临时目录中的所有文件
	if let Ok(entries) = std::fs::read_dir(&temp_dir) {
		for entry in entries.flatten() {
			if let Ok(file_name) = entry.file_name().into_string() {
				// 只删除预览临时文件（包含 enh_preview 的文件）
				if file_name.contains("enh_preview") && file_name.starts_with("temp_") {
					if let Err(_) = std::fs::remove_file(entry.path()) {
						// 忽略删除失败的文件（可能正在使用中）
						continue;
					}
					cleaned_count += 1;
				}
			}
		}
	}

	Ok(cleaned_count)
}