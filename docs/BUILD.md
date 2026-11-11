# 桌面端打包指南

本文说明如何将「图片处理器」从源码构建为可安装的桌面应用（Windows / macOS / Linux）。

## 一、技术说明

本项目使用 [Tauri 1.5](https://tauri.app/v1/) 将 React 前端与 Rust 后端打包为原生桌面程序：

```
npm run build        → 编译前端到 dist/
npm run build:tauri  → 编译 Rust + 打包安装程序
```

打包配置位于：

| 文件 | 作用 |
|------|------|
| `package.json` | npm 脚本 |
| `src-tauri/tauri.conf.json` | 应用名、版本、图标、权限等 |
| `src-tauri/Cargo.toml` | Rust 依赖与 Release 优化 |

---

## 二、环境准备

### 通用依赖

1. **Node.js 18+**（推荐 LTS）
   - 验证：`node -v`、`npm -v`

2. **Rust 1.70+**
   - 安装：https://rustup.rs/
   - 验证：`rustc -V`、`cargo -V`

3. **项目依赖**
   ```bash
   cd /path/to/images
   npm install
   ```

### Windows 额外依赖

| 依赖 | 用途 | 说明 |
|------|------|------|
| **Visual Studio Build Tools** | 编译 Rust 原生代码 | 安装时勾选「使用 C++ 的桌面开发」 |
| **WebView2** | 渲染界面 | Windows 10/11 通常已内置；缺失时 [点此下载](https://developer.microsoft.com/microsoft-edge/webview2/) |
| **WiX Toolset 3.11**（可选） | 生成 `.msi` 安装包 | 仅打 MSI 时需要；[下载 WiX 3.11](https://wixtoolset.org/docs/wysiwyg/) |

推荐使用 **x64** 工具链：

```powershell
rustup default stable-x86_64-pc-windows-msvc
```

### macOS 额外依赖

```bash
xcode-select --install
```

打包 `.dmg` / `.app` 需在 macOS 上执行（无法跨平台编译 macOS 包）。

### Linux 额外依赖

以 Debian/Ubuntu 为例：

```bash
sudo apt update
sudo apt install -y \
  libwebkit2gtk-4.0-dev \
  build-essential \
  curl \
  wget \
  file \
  libssl-dev \
  libgtk-3-dev \
  libayatana-appindicator3-dev \
  librsvg2-dev
```

---

## 三、开发模式（不打包）

用于日常调试，支持热更新：

```bash
npm run dev:tauri
```

首次运行会编译 Rust，耗时较长，属正常现象。

---

## 四、正式打包

### 4.1 一键打包（推荐）

在项目根目录执行：

```bash
npm run build:tauri
```

该命令会自动：

1. 运行 `npm run build`（TypeScript 检查 + Vite 构建前端）
2. 以 Release 模式编译 Rust
3. 生成当前平台可用的安装包

### 4.2 打包产物位置

构建完成后，安装包位于：

```
src-tauri/target/release/bundle/
```

默认安装路径为英文目录（避免 `Program Files` 下出现中文路径）：

```
C:\Program Files\ImageProcessor\
```

安装界面、快捷方式名称仍为「图片处理器」。自定义模板见 `src-tauri/windows/wix/main.wxs` 与 `src-tauri/windows/nsis/installer.nsi`。

#### Windows

| 目录 | 文件类型 | 说明 |
|------|----------|------|
| `bundle/msi/` | `.msi` | Windows Installer，适合企业分发 |
| `bundle/nsis/` | `-setup.exe` | NSIS 安装程序，适合普通用户 |

同时会生成可执行文件：

```
src-tauri/target/release/图片处理器.exe
```

> 注意：仅复制 `.exe` 在没有 WebView2 的机器上可能无法运行，建议分发安装包。

#### macOS

```
bundle/macos/图片处理器.app
bundle/dmg/图片处理器_x.x.x_x64.dmg   # 或 aarch64
```

#### Linux

```
bundle/deb/   → .deb 包
bundle/appimage/ → .AppImage
```

### 4.4 免安装便携版（发布用）

仅编译可执行文件，不打安装包：

```bash
npx tauri build --bundles none
```

产物位于 `src-tauri/target/release/`：

```
图片处理器.exe
resources/
  icon.ico
```

**打包为 zip**（需同时包含 exe 与 `resources` 文件夹）：

```powershell
# 在项目根目录执行（PowerShell）
$version = "1.0.0"
$outDir = "release/ImageProcessor-$version-x64-portable"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null
Copy-Item "src-tauri/target/release/*.exe" $outDir
Copy-Item "src-tauri/target/release/resources" $outDir -Recurse
Compress-Archive -Path $outDir -DestinationPath "release/ImageProcessor-$version-x64-portable.zip" -Force
```

便携版说明与用户文档见 [RELEASE.md](RELEASE.md)。

### 4.5 只打某一种安装包（可选）

```bash
# 仅 NSIS（Windows 常用）
npm run tauri build -- --bundles nsis

# 仅 MSI
npm run tauri build -- --bundles msi

# 仅 DMG（macOS）
npm run tauri build -- --bundles dmg
```

---

## 五、发布前检查清单

打包前建议确认以下项：

- [ ] **版本号**已更新（至少两处保持一致）：
  - `package.json` → `"version"`
  - `src-tauri/tauri.conf.json` → `package.version`
  - `src-tauri/Cargo.toml` → `version`
  - `src/constants/app.ts` → `APP_VERSION`（关于对话框显示）
- [ ] `npm run build` 无报错
- [ ] `npm run build:tauri` 无报错
- [ ] 安装包能正常安装、启动
- [ ] 核心功能抽测：选输出目录、拖入图片、批量处理、设置保存
- [ ] 图标正常：`src-tauri/icons/` 下各尺寸图标齐全

---

## 六、修改应用信息

### 应用名称

`src-tauri/tauri.conf.json`：

```json
"package": {
  "productName": "图片处理器",
  "version": "1.0.0"
}
```

### 应用图标

替换 `src-tauri/icons/` 下文件，需包含：

- `32x32.png`
- `128x128.png`
- `128x128@2x.png`
- `icon.ico`（Windows）
- `icon.icns`（macOS）

前端标题栏图标同步更新：`src/assets/app-icon.png`。

### 应用 ID（安装标识）

```json
"identifier": "com.image-processor.app"
```

修改后相当于新应用，旧版不会自动覆盖升级。

---

## 七、常见问题

### 1. `link.exe` / `MSVC` 相关错误（Windows）

未安装 C++ 构建工具。请安装 Visual Studio Build Tools，并勾选「使用 C++ 的桌面开发」。

### 2. `light.exe` / MSI 打包失败（中文应用名）

若日志类似：

```
Running light to produce ...\图片处理器_1.0.0_x64_en-US.msi
Error failed to bundle project: error running light.exe
```

**原因**：WiX 默认使用英文代码页（1252），无法处理 `productName` 里的中文（如「图片处理器」），`candle` 能过但 `light` 链接失败。

**解决**（本项目已配置）：

```json
"bundle": {
  "windows": {
    "wix": {
      "language": "zh-CN"
    }
  }
}
```

**替代方案**：只打 NSIS 安装包（对中文名更友好）：

```bash
npx tauri build --bundles nsis
```

产物：`bundle/nsis/图片处理器_1.0.0_x64-setup.exe`

### 3. WiX / MSI 环境缺失

- 安装 WiX Toolset 3.11 并加入 PATH
- 或改用 NSIS：`npx tauri build --bundles nsis`

### 4. 首次打包非常慢

Release 编译 Rust 依赖（image、webp 等）耗时较长，后续有缓存会快很多。

### 4. 白屏或窗口空白

- 确认 `npm run build` 已成功生成 `dist/`
- 开发模式用 `npm run dev:tauri`，不要直接用浏览器打开 `dist/index.html`

### 5. 杀毒软件误报

未签名的 exe 可能被误报。正式发布建议：
- 使用代码签名证书对安装包签名（Windows Authenticode / Apple Notarization）

### 6. 清理构建缓存

```bash
# 清理 Rust 构建产物
cd src-tauri
cargo clean

# 清理前端
cd ..
rm -rf dist node_modules/.vite
```

Windows PowerShell 删除 dist：

```powershell
Remove-Item -Recurse -Force dist
```

---

## 八、命令速查

| 命令 | 说明 |
|------|------|
| `npm install` | 安装前端依赖 |
| `npm run dev:tauri` | 开发模式（热更新） |
| `npm run build` | 仅构建前端 |
| `npm run build:tauri` | **完整桌面端打包** |
| `npm run tauri build -- --bundles nsis` | 仅打 NSIS 安装包 |
| `cargo check`（在 `src-tauri/`） | 仅检查 Rust 能否编译 |

---

## 九、分发给用户

构建完成后，将 `src-tauri/target/release/bundle/` 下对应平台的安装包发给用户即可：

- **Windows 用户**：推荐 `.exe`（NSIS）或 `.msi`
- **macOS 用户**：`.dmg`
- **Linux 用户**：`.AppImage` 或 `.deb`

本软件为离线工具，安装后无需联网即可使用。

更多说明与更新日志：[inkdot.cn](https://inkdot.cn)
