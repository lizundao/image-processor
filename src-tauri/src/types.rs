use serde::{Deserialize, Serialize};

// 处理结果
#[derive(Debug, Serialize, Deserialize)]
pub struct ProcessingResult {
    pub success: bool,
    pub processed_files: Vec<String>,
    pub error: Option<String>,
}

// 压缩设置
#[derive(Debug, Serialize, Deserialize)]
pub struct CompressSettings {
    pub quality: u8,
    pub format: String,
}

// 水印设置
#[derive(Debug, Serialize, Deserialize)]
pub struct WatermarkSettings {
    pub watermark_type: String, // "text" or "image"
    // 文字水印设置
    pub text: Option<String>,
    pub font_size: Option<u32>,
    pub font_color: Option<String>, // 十六进制颜色，如 "#000000"
    pub font_weight: Option<String>, // "normal" or "bold"
    pub font_family: Option<String>, // 字体名称
    pub font_path: Option<String>, // 字体文件路径
    // 图片水印设置
    pub image_path: Option<String>,
    pub image_scale: Option<f32>, // 0.1 - 2.0
    // 通用设置
    pub position: String, // "top-left", "top-center", "top-right", "middle-left", "center", "middle-right", "bottom-left", "bottom-center", "bottom-right"
    pub opacity: f32, // 0.0 - 1.0
    pub margin_x: Option<u32>, // 水平边距，像素
    pub margin_y: Option<u32>, // 垂直边距，像素
}



// 裁剪设置
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CropSettings {
    pub mode: Option<String>,           // "ratio" 或 "pixel" 或 "manual"
    pub aspect_ratio: Option<f32>,     // 宽高比
    pub custom_ratio_width: Option<u32>, // 自定义比例宽度
    pub custom_ratio_height: Option<u32>, // 自定义比例高度
    pub x: Option<u32>,                // 裁剪起始X坐标
    pub y: Option<u32>,                // 裁剪起始Y坐标
    pub width: Option<u32>,            // 裁剪宽度
    pub height: Option<u32>,           // 裁剪高度
    pub output_format: Option<String>, // 输出格式
    pub quality: Option<u8>,           // 输出质量
    // 手动裁剪相关
    pub manual_crops: Option<Vec<ManualCrop>>,
    pub current_image_index: Option<u32>,
}

// 手动裁剪参数
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ManualCrop {
    pub image_id: String,
    pub x: u32,
    pub y: u32,
    pub width: u32,
    pub height: u32,
    pub aspect_ratio: Option<f32>,
}

// 格式转换设置
#[derive(Debug, Serialize, Deserialize)]
pub struct ConvertSettings {
    pub format: String, // "JPEG", "PNG", "WEBP", "GIF", "BMP", "TIFF", "ICO"
    pub quality: Option<u32>, // 1-100, 仅适用于有损格式
    pub preserve_transparency: Option<bool>, // 是否保持透明度
    pub preserve_metadata: Option<bool>, // 是否保留元数据
    pub background_color: Option<String>, // 透明背景替换颜色，如 "#FFFFFF"
    pub compression_level: Option<u8>, // PNG压缩级别 0-9
    pub progressive: Option<bool>, // JPEG是否使用渐进式编码
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ResizeSimpleSettings {
    pub width: Option<u32>,
    pub height: Option<u32>,
}


// 旋转设置
#[derive(Debug, Serialize, Deserialize)]
pub struct RotateSettings {
    pub angle: f32, // 旋转角度（度）
}

// 翻转设置
#[derive(Debug, Serialize, Deserialize)]
pub struct FlipSettings {
    pub horizontal: bool,
    pub vertical: bool,
}

// 宫格切图设置
#[derive(Debug, Serialize, Deserialize)]
pub struct GridSliceSettings {
    pub rows: u32,
    pub columns: u32,
    pub output_format: String,
    pub quality: u8,
    pub include_original: bool,
    pub naming_pattern: String,
}

// 亮度调整设置
#[derive(Debug, Serialize, Deserialize)]
pub struct BrightnessSettings {
    pub value: i32, // -100 到 100
}

// 对比度调整设置
#[derive(Debug, Serialize, Deserialize)]
pub struct ContrastSettings {
    pub value: f32, // 0.0 到 2.0，1.0为原始
}

// 饱和度调整设置
#[derive(Debug, Serialize, Deserialize)]
pub struct SaturationSettings {
    pub value: f32, // 0.0 到 2.0，1.0为原始
}

// 一键美化设置
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct EnhanceSettings {
    pub strength: u32, // 0-100
    pub auto_exposure: Option<bool>,
    pub auto_white_balance: Option<bool>,
    pub local_contrast: Option<bool>,
    pub sharpen: Option<bool>,
}

// 边框设置
#[derive(Debug, Serialize, Deserialize)]
pub struct BorderSettings {
    pub width: u32,
    pub color: String, // 十六进制颜色，如 "#FF0000"
    pub style: String, // "solid", "dashed", "dotted"
    pub opacity: f32,  // 透明度 0.0-1.0，0.0完全透明，1.0完全不透明
    pub overlay_mode: bool, // true: 边框覆盖在图片上, false: 边框加在图片外边
    pub enable_transparency: bool, // true: 启用透明度, false: 禁用透明度
    pub border_radius: Option<u32>, // 边框圆角半径，None表示无圆角
}

// 圆角设置
#[derive(Debug, Serialize, Deserialize)]
pub struct RoundedSettings {
    pub radius: u32,
}

// 合并设置
#[derive(Debug, Serialize, Deserialize)]
pub struct MergeSettings {
    pub direction: String, // "horizontal" 或 "vertical"
    pub spacing: u32,      // 图片间距，像素
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GifSettings {
    pub fps: u32,           // 帧率 (1-30)
    pub loop_count: u32,    // 循环次数 (0=无限循环, 1-100)
    pub quality: u32,       // 输出质量 (1-100)
}

// 全局设置
#[derive(Debug, Serialize, Deserialize)]
pub struct GlobalSettings {
    pub output_directory: String,
    pub output_format: String, // 输出格式
    pub quality: u8,           // 默认质量
    pub filename_pattern: String,
    pub overwrite_existing: bool,
    #[serde(default)]
    pub create_subfolders: bool,
}

// 批处理任务
#[derive(Debug, Serialize, Deserialize)]
pub struct BatchTask {
    pub id: String,
    pub input_paths: Vec<String>,
    pub operation: String,
    pub settings: serde_json::Value,
    pub global_settings: GlobalSettings,
}

// 处理进度
#[derive(Debug, Serialize, Deserialize)]
pub struct ProcessingProgress {
    pub task_id: String,
    pub current: usize,
    pub total: usize,
    pub current_file: String,
    pub status: String, // "processing", "completed", "error"
}

// 图片信息
#[derive(Debug, Serialize, Deserialize)]
pub struct ImageInfo {
    pub path: String,
    pub width: u32,
    pub height: u32,
    pub format: String,
    pub size_bytes: u64,
}

// 错误类型
#[derive(Debug, Serialize, Deserialize)]
pub enum ProcessingError {
    FileNotFound(String),
    UnsupportedFormat(String),
    InvalidSettings(String),
    IoError(String),
    ImageError(String),
}

impl std::fmt::Display for ProcessingError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            ProcessingError::FileNotFound(path) => write!(f, "文件未找到: {}", path),
            ProcessingError::UnsupportedFormat(format) => write!(f, "不支持的格式: {}", format),
            ProcessingError::InvalidSettings(msg) => write!(f, "无效的设置: {}", msg),
            ProcessingError::IoError(msg) => write!(f, "IO错误: {}", msg),
            ProcessingError::ImageError(msg) => write!(f, "图片处理错误: {}", msg),
        }
    }
}

impl std::error::Error for ProcessingError {}
