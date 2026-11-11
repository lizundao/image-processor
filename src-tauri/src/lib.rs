mod types;
mod utils;
mod services;
mod commands;

use commands::*;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            compress_images,
            compress_single_image,
            add_watermark,
            add_single_watermark,
            convert_format,
            check_format_compatibility,
            convert_to_web_optimized,
            grid_slice_images,
            crop_images,
            crop_single_image,
            rotate_images,
            rotate_single_image,
            flip_images,
            flip_single_image,
            adjust_brightness,
            adjust_brightness_single_image,
            add_border,
            add_single_border,
            add_rounded_corners,
            add_single_rounded_corners,
            merge_images,
            create_gif,
            merge_single_images,
            get_image_info,
            get_images_info,
            validate_image_files,
            get_supported_formats,
            estimate_compressed_size,
            get_recommended_compress_settings,
            get_system_fonts,
            resize_images_simple,
            enhance_preview,
            enhance_images,
            enhance_single_image,
            cleanup_preview_files
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
