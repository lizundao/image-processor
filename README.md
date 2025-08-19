# 图片处理器 (Image Processor)

一个功能强大的桌面端图片处理应用，基于 React + Tauri + Rust 技术栈构建，提供专业的图片编辑和处理功能。

## ✨ 功能特性

### 🖼️ 图片压缩
- 支持质量调节（1-100%）
- 多种输出格式选择
- 批量处理支持

### 💧 水印功能
- **文字水印**：系统字体选择、字体大小/颜色/粗细、9种位置、透明度控制、精确边距
- **图片水印**：PNG/JPG支持、缩放调节、位置控制

### 🔄 格式转换
- 支持多种图片格式转换
- 保持图片质量
- 批量转换支持

### 📏 尺寸调整
- **基础调整**：自定义宽高、保持宽高比、多种缩放模式
- **高级设置**：5种缩放算法、放大控制、尺寸限制
- **智能预设**：Web优化、打印优化、缩略图、社交媒体
- **百分比缩放**：按比例快速调整尺寸
- **批量生成**：响应式尺寸、社交媒体尺寸、缩略图尺寸

### ✂️ 图片裁剪
- **手动裁剪**：精确指定坐标和尺寸
- **智能裁剪**：自动计算最佳裁剪区域
- **宽高比裁剪**：保持指定比例进行裁剪
- **预设比例**：正方形、16:9、4:3、黄金比例等
- **社交媒体预设**：Instagram、Facebook、Twitter等平台尺寸
- **实时预览**：裁剪前可预览效果

### 🔄 图片旋转与翻转
- 90度旋转功能
- 水平和垂直翻转

### 🖼️ 边框与圆角
- **边框功能**：自定义边框样式、宽度、颜色、透明度
- **圆角处理**：可调节圆角半径

### 🔗 图片合并
- 多图片合并功能
- 支持水平和垂直排列
- 可调节图片间距

### 🎬 GIF合成
- 创建动态GIF
- 支持帧率调节
- 循环播放控制

### 🎨 图片增强
- **亮度调整**：图片亮度调节
- **对比度调整**：对比度增强
- **饱和度调整**：色彩饱和度调节
- **自动曝光**：智能曝光调整
- **自动白平衡**：自动色彩校正

## 🛠️ 技术栈

- **前端框架**: React 18 + TypeScript
- **UI组件库**: Chakra UI
- **桌面应用**: Tauri
- **构建工具**: Vite
- **状态管理**: React Hooks
- **后端语言**: Rust
- **图片处理**: image + imageproc + rusttype
- **字体管理**: fontdb (系统字体扫描)
- **文件处理**: Tauri文件系统API

## 📦 安装使用

### 环境要求

- Node.js 16+
- Rust 1.70+
- 操作系统: Windows, macOS, Linux

### 快速开始

1. **克隆项目**
   ```bash
   git clone https://github.com/lizundao/image-processing.git
   cd image-processing
   ```

2. **安装依赖**
   ```bash
   npm install
   ```

3. **启动开发环境**
   ```bash
   npm run dev:tauri
   ```

4. **构建应用**
   ```bash
   npm run build:tauri
   ```

## 🏗️ 项目结构

```
image-processing/
├── src/                    # React前端源码
│   ├── components/         # React组件
│   │   ├── FunctionPanel/  # 功能设置面板
│   │   ├── ImageList/      # 图片列表管理
│   │   └── Navigation.tsx  # 导航组件
│   ├── services/           # 服务层
│   ├── utils/              # 工具函数
│   ├── types.ts            # TypeScript类型定义
│   └── App.tsx             # 主应用组件
├── src-tauri/              # Rust后端源码
│   ├── src/
│   │   ├── commands/       # Tauri命令
│   │   ├── services/       # 业务逻辑
│   │   └── main.rs         # 主程序入口
│   └── Cargo.toml          # Rust依赖配置
└── package.json            # Node.js依赖配置
```

## 🚀 开发指南

### 常用命令

```bash
# 开发模式
npm run dev:tauri

# 构建应用
npm run build:tauri

# 预览构建结果
npm run preview
```

### 代码规范

- 使用 TypeScript 进行类型检查
- 遵循 React 最佳实践
- 使用 Chakra UI 组件库
- Rust 代码遵循 Rust 命名规范

## 📄 许可证

本项目采用 [MIT 许可证](LICENSE) 开源。

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📞 联系方式

如有问题或建议，请通过以下方式联系：

- GitHub Issues: [提交问题](https://github.com/lizundao/image-processing/issues)
- 项目地址: [https://github.com/lizundao/image-processing](https://github.com/lizundao/image-processing)

---

⭐ 如果这个项目对你有帮助，请给它一个星标！