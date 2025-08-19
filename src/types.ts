export interface ImageFile {
	id: string;
	name: string;
	size: number;
	type: string;
	url: string;
	file: File;
	// 处理状态
	processing?: {
		status: 'idle' | 'processing' | 'completed' | 'error';
		progress?: number; // 0-100
		message?: string;
	};
}

export type ProcessingFunction = 
	| 'compress'
	| 'watermark'
	| 'convert'
	| 'resize'
	| 'crop'
	| 'rotate'
	| 'flip'
	| 'border'
	| 'rounded'
	| 'merge'
	| 'gif'
	| 'brightness'
	| 'contrast'
	| 'saturation'
	| 'enhance'
	| 'gridSlice';

export interface ProcessingSettings {
	compress?: {
		quality: number;
	};
	watermark?: {
		type: 'text' | 'image';
		// 文字水印设置
		text?: string;
		fontSize?: number;
		fontColor?: string;
		fontWeight?: 'normal' | 'bold';
		fontFamily?: string; // 字体名称
		fontPath?: string; // 字体文件路径
		// 图片水印设置
		imagePath?: string;
		imageScale?: number; // 0.1 - 2.0
		// 通用设置
		position: 'top-left' | 'top-center' | 'top-right' |
		          'middle-left' | 'center' | 'middle-right' |
		          'bottom-left' | 'bottom-center' | 'bottom-right';
		opacity: number; // 0.0 - 1.0
		marginX?: number; // 水平边距，像素
		marginY?: number; // 垂直边距，像素
	};
	convert?: {
		format: 'JPEG' | 'PNG' | 'WEBP' | 'GIF' | 'BMP' | 'TIFF' | 'ICO';
		quality?: number; // 1-100, 仅适用于有损格式
		preserveTransparency?: boolean; // 是否保持透明度
		preserveMetadata?: boolean; // 是否保留元数据
		backgroundColor?: string; // 透明背景替换颜色，如 "#FFFFFF"
		compressionLevel?: number; // PNG压缩级别 0-9
		progressive?: boolean; // JPEG是否使用渐进式编码
	};
	resize?: ResizeSimpleSettings;
	crop?: CropSettings;
	rotate?: {
		angle: number;
	};
	flip?: {
		horizontal: boolean;
		vertical: boolean;
	};
	border?: {
		width: number;
		color: string;
		style: 'solid' | 'dashed' | 'dotted';
		opacity: number;
		overlay_mode: boolean;
		enable_transparency: boolean;
		border_radius?: number;
	};
	rounded?: {
		radius: number;
	};
	merge?: {
		direction: 'horizontal' | 'vertical';
		spacing: number;
	};
	gif?: {
		fps: number;        // 帧率 (1-30)
		loop_count: number; // 循环次数 (0=无限循环, 1-100)
		quality: number;    // 输出质量 (1-100)
	};
	brightness?: {
		value: number;
	};
	contrast?: {
		value: number;
	};
	saturation?: {
		value: number;
	};
	enhance?: {
		strength: number; // 0-100
		autoExposure?: boolean;
		autoWhiteBalance?: boolean;
		localContrast?: boolean;
		sharpen?: boolean;
	};
	gridSlice?: {
		rows: number;
		columns: number;
		outputFormat: string;
		quality: number;
		includeOriginal: boolean;
		namingPattern: string;
	};
}



export interface GlobalSettings {
	outputDirectory: string;
	outputFormat: 'JPEG' | 'PNG' | 'WEBP' | 'GIF' | 'BMP' | 'original';
	quality: number;
	overwriteExisting: boolean;
	createSubfolders: boolean;
	filenamePattern: string;
	autoOpenOutputFolder: boolean;
	language: 'zh-CN' | 'en-US';
	// 水印设置
	watermark?: {
		type: 'text' | 'image';
		text?: string;
		fontSize?: number;
		fontColor?: string;
		fontWeight?: 'normal' | 'bold';
		fontFamily?: string;
		position: 'top-left' | 'top-center' | 'top-right' |
		          'middle-left' | 'center' | 'middle-right' |
		          'bottom-left' | 'bottom-center' | 'bottom-right';
		opacity: number;
		marginX?: number;
		marginY?: number;
	};

}

export interface ResizeSimpleSettings {
	width?: number; // 仅填一项：宽或高
	height?: number; // 仅填一项：宽或高
}

export interface CropSettings {
	mode?: 'ratio' | 'pixel' | 'manual';
	aspectRatio?: number;
	customRatioWidth?: number;
	customRatioHeight?: number;
	x?: number;
	y?: number;
	width?: number;
	height?: number;
	outputFormat?: string;
	quality?: number;
	// 手动裁剪相关
	manualCrops?: ManualCrop[];
	currentImageIndex?: number;
}

export interface ManualCrop {
	imageId: string;
	x: number;
	y: number;
	width: number;
	height: number;
	aspectRatio?: number;
}

export interface ImageInfo {
	path: string;
	width: number;
	height: number;
	format: string;
	sizeBytes: number;
}