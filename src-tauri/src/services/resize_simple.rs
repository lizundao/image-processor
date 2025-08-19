use crate::types::*;
use crate::utils::*;
use anyhow::{Result, anyhow};
use image::imageops::FilterType;
use image::ImageFormat;

pub async fn resize_images_simple(
	input_paths: Vec<String>,
	settings: ResizeSimpleSettings,
	global_settings: GlobalSettings,
) -> ProcessingResult {
	let mut processed_files: Vec<String> = Vec::new();

	for path in input_paths.iter() {
		match resize_one(path, &settings, &global_settings).await {
			Ok(out) => processed_files.push(out),
			Err(e) => {
				return ProcessingResult {
					success: false,
					processed_files,
					error: Some(e.to_string()),
				}
			}
		}
	}

	ProcessingResult { success: true, processed_files, error: None }
}

async fn resize_one(
	input_path: &str,
	settings: &ResizeSimpleSettings,
	global_settings: &GlobalSettings,
) -> Result<String> {
	validate_image_file(input_path)?;

	let img = image::open(input_path)?;
	let (orig_w, orig_h) = (img.width(), img.height());

	let target_w = settings.width.unwrap_or(0);
	let target_h = settings.height.unwrap_or(0);

	if (target_w == 0 && target_h == 0) || (target_w > 0 && target_h > 0) {
		return Err(anyhow!("请仅填写宽或高中的一个"));
	}

	let (new_w, new_h) = if target_w > 0 {
		let ratio = orig_h as f32 / orig_w as f32;
		let h = (target_w as f32 * ratio).round().max(1.0) as u32;
		(target_w, h)
	} else {
		let ratio = orig_w as f32 / orig_h as f32;
		let w = (target_h as f32 * ratio).round().max(1.0) as u32;
		(w, target_h)
	};

	let resized = img.resize_exact(new_w, new_h, FilterType::Lanczos3);

	let suffix = format!("resized_{}x{}", new_w, new_h);
	let out_path = generate_output_filename(
		input_path,
		&global_settings.output_directory,
		&global_settings.filename_pattern,
		&suffix,
		"jpg",
	);

	check_file_overwrite(&out_path, global_settings.overwrite_existing)?;
	ensure_output_directory(&out_path)?;
	resized.save_with_format(&out_path, ImageFormat::Jpeg)?;

	Ok(out_path)
} 