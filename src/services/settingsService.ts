import { GlobalSettings } from '../types';

// Tauri API imports
import { writeTextFile, readTextFile, exists, createDir } from '@tauri-apps/api/fs';
import { appDataDir, join } from '@tauri-apps/api/path';

export class SettingsService {
  private static readonly SETTINGS_FILE_NAME = 'settings.json';
  private static settingsCache: GlobalSettings | null = null;

  /**
   * 获取设置文件路径
   */
  private static async getSettingsFilePath(): Promise<string> {
    const appDataPath = await appDataDir();
    return await join(appDataPath, this.SETTINGS_FILE_NAME);
  }

  /**
   * 获取默认设置
   */
  private static getDefaultSettings(): GlobalSettings {
    return {
      outputDirectory: '',
      outputFormat: 'original',
      quality: 80,
      overwriteExisting: false,
      createSubfolders: true,
      filenamePattern: '{name}_{timestamp}',
      autoOpenOutputFolder: true,
      language: 'zh-CN',
      // 添加水印默认设置
      watermark: {
        type: 'text',
        text: 'Watermark',
        fontSize: 24,
        fontColor: '#000000',
        fontWeight: 'normal',
        fontFamily: 'Arial',
        position: 'bottom-right',
        opacity: 0.5,
        marginX: 20,
        marginY: 20,
      },

    };
  }

  /**
   * 检查是否在Tauri环境中
   */
  private static isTauriEnvironment(): boolean {
    return typeof window !== 'undefined' && '__TAURI__' in window;
  }

  /**
   * 加载设置
   */
  static async loadSettings(): Promise<GlobalSettings> {
    try {
      // 如果有缓存，直接返回
      if (this.settingsCache) {
        return this.settingsCache;
      }

      if (!this.isTauriEnvironment()) {
        // 浏览器环境：使用localStorage
        const stored = localStorage.getItem('imageProcessor_settings');
        if (stored) {
          const settings = JSON.parse(stored);
          this.settingsCache = { ...this.getDefaultSettings(), ...settings };
          console.log('📱 从localStorage加载设置:', this.settingsCache);
          return this.settingsCache!;
        }
      } else {
        // Tauri环境：使用文件系统
        const settingsPath = await this.getSettingsFilePath();
        const fileExists = await exists(settingsPath);

        if (fileExists) {
          const content = await readTextFile(settingsPath);
          const settings = JSON.parse(content);
          this.settingsCache = { ...this.getDefaultSettings(), ...settings };
          console.log('💾 从文件加载设置:', this.settingsCache);
          return this.settingsCache!;
        }
      }

      // 如果没有保存的设置，返回默认设置
      this.settingsCache = this.getDefaultSettings();
      console.log('🆕 使用默认设置:', this.settingsCache);
      return this.settingsCache;

    } catch (error) {
      console.error('❌ 加载设置失败:', error);
      this.settingsCache = this.getDefaultSettings();
      return this.settingsCache;
    }
  }

  /**
   * 保存设置
   */
  static async saveSettings(settings: GlobalSettings): Promise<boolean> {
    try {
      // 更新缓存
      this.settingsCache = settings;

      if (!this.isTauriEnvironment()) {
        // 浏览器环境：使用localStorage
        localStorage.setItem('imageProcessor_settings', JSON.stringify(settings));
        console.log('📱 设置已保存到localStorage');
      } else {
        // Tauri环境：保存到文件
        const settingsPath = await this.getSettingsFilePath();
        
        // 确保应用数据目录存在
        const appDataPath = await appDataDir();
        const dirExists = await exists(appDataPath);

        if (!dirExists) {
          await createDir(appDataPath, { recursive: true });
        }

        // 保存设置到文件
        const content = JSON.stringify(settings, null, 2);
        await writeTextFile(settingsPath, content);

        console.log('💾 设置已保存到文件:', settingsPath);
      }

      return true;

    } catch (error) {
      console.error('❌ 保存设置失败:', error);
      return false;
    }
  }

  /**
   * 自动保存设置（防抖）
   */
  private static autoSaveTimeout: ReturnType<typeof setTimeout> | null = null;

  static autoSaveSettings(settings: GlobalSettings, delay: number = 1000): void {
    // 清除之前的定时器
    if (this.autoSaveTimeout) {
      clearTimeout(this.autoSaveTimeout);
    }

    // 设置新的定时器
    this.autoSaveTimeout = setTimeout(async () => {
      try {
        await this.saveSettings(settings);
        console.log('🔄 自动保存完成');
      } catch (error) {
        console.error('❌ 自动保存失败:', error);
      }
    }, delay);
  }

  /**
   * 更新部分设置
   */
  static async updateSettings(partialSettings: Partial<GlobalSettings>): Promise<GlobalSettings> {
    const currentSettings = await this.loadSettings();
    const newSettings = { ...currentSettings, ...partialSettings };
    await this.saveSettings(newSettings);
    return newSettings;
  }

  /**
   * 重置设置为默认值
   */
  static async resetSettings(): Promise<GlobalSettings> {
    const defaultSettings = this.getDefaultSettings();
    await this.saveSettings(defaultSettings);
    return defaultSettings;
  }

  /**
   * 清除缓存（用于测试或强制重新加载）
   */
  static clearCache(): void {
    this.settingsCache = null;
  }

  /**
   * 验证设置的有效性
   */
  static validateSettings(settings: GlobalSettings): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // 检查输出目录
    if (settings.outputDirectory && typeof settings.outputDirectory !== 'string') {
      errors.push('输出目录必须是字符串');
    }

    // 检查质量值
    if (settings.quality < 1 || settings.quality > 100) {
      errors.push('质量值必须在1-100之间');
    }

    // 检查文件名模式
    if (!settings.filenamePattern || settings.filenamePattern.trim() === '') {
      errors.push('文件名模式不能为空');
    }

    // 检查输出格式
    const validFormats = ['original', 'JPEG', 'PNG', 'WEBP', 'GIF', 'BMP'];
    if (!validFormats.includes(settings.outputFormat)) {
      errors.push('无效的输出格式');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * 导出设置（用于备份）
   */
  static async exportSettings(): Promise<string> {
    const settings = await this.loadSettings();
    return JSON.stringify(settings, null, 2);
  }

  /**
   * 导入设置（用于恢复）
   */
  static async importSettings(settingsJson: string): Promise<boolean> {
    try {
      const settings = JSON.parse(settingsJson);
      const validation = this.validateSettings(settings);
      
      if (!validation.valid) {
        console.error('导入的设置无效:', validation.errors);
        return false;
      }

      await this.saveSettings(settings);
      return true;
    } catch (error) {
      console.error('导入设置失败:', error);
      return false;
    }
  }
}
