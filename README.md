# 图片处理器（Image Processor）

基于 Tauri 2 的离线桌面端批量图片处理工具：React 18 + TypeScript 前端，Rust 后端处理像素逻辑。所有图片均在本地处理，**不联网、不上传、不收集任何数据**。

> **离线 · 开源（MIT）· 本地处理** · 官网：[inkdot.cn](https://inkdot.cn)

## 功能

| 类别 | 功能 |
|------|------|
| **基础处理** | 压缩、格式转换、等比缩放、旋转、翻转 |
| **裁剪** | 比例裁剪、像素裁剪、手动框选裁剪 |
| **调色** | 亮度调整、一键美化（曝光 / 白平衡 / 对比度 / 锐化） |
| **装饰** | 文字 / 图片水印、边框（实线 / 虚线 / 点线）、圆角 |
| **拼合** | 水平 / 垂直合并、GIF 动画合成、宫格切图 |

- 批量导入、拖拽排序、统一参数批量输出
- 中 / 英双语；浅色 / 深色 / 跟随系统主题
- 输出目录可选按功能分子文件夹，文件名支持 `{name}` `{timestamp}` `{index}` 占位符

## 技术栈

- **前端**：React 18 + TypeScript + Chakra UI + Vite 6
- **后端**：Rust + Tauri 2 + [`image`](https://docs.rs/image) + `imageproc` + `webp` + `gif` + `png` + `fontdb`
- **模块**：`compress` / `watermark` / `convert` / `resize_simple` / `crop` / `rotate` / `flip` / `brightness` / `border` / `rounded` / `merge` / `gif` / `enhance` / `grid_slice`

## 环境要求

- Node.js 18+
- Rust 1.70+
- [Tauri 2 前置要求](https://v2.tauri.app/start/prerequisites/)（Windows 需 WebView2、VS C++ 构建工具）

## 本地开发

```bash
npm install
npm run dev:tauri      # 开发模式（热更新）
npm run build          # 仅构建前端
npm run build:tauri    # 完整打包（输出在 src-tauri/target/release/bundle/）
npm run release:portable  # 编译 + 绿色版 zip（推荐发布）
```

打包产物：

- **绿色版**：`release/ImageProcessor-1.0.0-portable-win-x64.zip`（含 exe + 用户文档 + 许可）
- **安装版**：`src-tauri/target/release/bundle/nsis/图片处理器_1.0.0_x64-setup.exe`

详细打包说明见 [docs/BUILD.md](docs/BUILD.md)。

## 下载（v1.0.0）

从 [GitHub Releases](https://github.com/lizundao/image-processor/releases) 获取：

| 平台 | 文件 | 说明 |
|------|------|------|
| Windows | `ImageProcessor-1.0.0-setup-win-x64.exe` | 安装版，当前用户安装，免管理员权限 |
| Windows | `ImageProcessor-1.0.0-portable-win-x64.zip` | 绿色版，解压即用，不写注册表 |
| macOS | `ImageProcessor-1.0.0-aarch64.dmg` | Apple Silicon（未签名，见下方说明） |

> 未签名程序首次运行会触发 Windows SmartScreen / macOS Gatekeeper 提示，处理方式见 [发布说明](docs/RELEASE.md) 与 [代码审核报告](docs/代码审核报告.md)。

## 使用

1. 在 **设置 → 输出设置** 中指定**输出目录**（必填）
2. 拖放或选择图片（支持窗口级拖放）
3. 左侧选择功能，中间配置参数，右侧为图片列表（GIF / 合并时可拖拽排序）
4. 点击「开始处理」

## 文档

- [用户手册 / 发布说明](docs/RELEASE.md) — 安装、教程、FAQ
- [打包指南](docs/BUILD.md) — 环境准备、产物路径、常见问题
- [代码审核报告](docs/代码审核报告.md) — 安全加固、崩溃边界、Tauri 2 升级记录

## 项目结构

```
images/
├── index.html                 # 应用壳
├── src/                       # React 前端
│   ├── components/            # UI 组件（标题栏 / 功能面板 / 图片列表 / 对话框）
│   ├── services/              # 前端服务层（Tauri 调用封装、i18n）
│   ├── i18n/locales/          # 中英语言包
│   └── utils/                 # 环境检测、显示 URL、输出目录
├── docs/                      # 审核报告 / 发布说明 / 打包指南
└── src-tauri/src/
    ├── lib.rs                 # Tauri 入口 + 插件注册 + 命令表
    ├── commands/              # IPC 命令层
    ├── services/              # 图片处理核心逻辑
    └── utils.rs               # 路径、颜色、格式等工具
```

## 许可证与合规

- **本项目**：[MIT License](LICENSE) © inkdot
- **第三方组件**：见 [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md)
- **隐私**：完全离线运行，不收集、不上传、不追踪任何数据
- **使用**：依据 MIT 许可开放，当前版本可自由使用
