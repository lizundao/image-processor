import { GlobalSettings, ProcessingSettings } from '../types';

// Tauri API imports
import { writeTextFile, readTextFile, exists, mkdir } from '@tauri-apps/plugin-fs';
import { appDataDir, join } from '@tauri-apps/api/path';
import { mergeProcessingSettings } from '../utils/defaultProcessingSettings';
import { isTauriEnv } from '../utils/tauriEnv';

export class SettingsService {
  private static readonly SETTINGS_FILE_NAME = 'settings.json';
  private static readonly FUNCTION_SETTINGS_FILE_NAME = 'function-settings.json';
  private static settingsCache: GlobalSettings | null = null;
  private static functionSettingsCache: ProcessingSettings | null = null;
  private static functionAutoSaveTimeout: ReturnType<typeof setTimeout> | null = null;

  /**
   * 获取设置文件路径
   */
  private static async getSettingsFilePath(): Promise<string> {
    const appDataPath = await appDataDir();
    return await join(appDataPath, this.SETTINGS_FILE_NAME);
  }

  private static async getFunctionSettingsFilePath(): Promise<string> {
    const appDataPath = await appDataDir();
    return await join(appDataPath, this.FUNCTION_SETTINGS_FILE_NAME);
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
      theme: 'dark',
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
    return isTauriEnv();
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
          return this.settingsCache!;
        }
      }

      // 如果没有保存的设置，返回默认设置
      this.settingsCache = this.getDefaultSettings();
      return this.settingsCache;

    } catch (error) {
      console.error('加载设置失败:', error);
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
      } else {
        // Tauri环境：保存到文件
        const settingsPath = await this.getSettingsFilePath();
        
        // 确保应用数据目录存在
        const appDataPath = await appDataDir();
        const dirExists = await exists(appDataPath);

        if (!dirExists) {
          await mkdir(appDataPath, { recursive: true });
        }

        // 保存设置到文件
        const content = JSON.stringify(settings, null, 2);
        await writeTextFile(settingsPath, content);
      }

      return true;

    } catch (error) {
      console.error('保存设置失败:', error);
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
      } catch (error) {
        console.error('自动保存失败:', error);
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
    this.functionSettingsCache = null;
  }

  static async loadFunctionSettings(): Promise<ProcessingSettings> {
    try {
      if (this.functionSettingsCache) {
        return this.functionSettingsCache;
      }

      if (!this.isTauriEnvironment()) {
        const stored = localStorage.getItem('imageProcessor_functionSettings');
        if (stored) {
          this.functionSettingsCache = mergeProcessingSettings(JSON.parse(stored));
          return this.functionSettingsCache;
        }
      } else {
        const settingsPath = await this.getFunctionSettingsFilePath();
        if (await exists(settingsPath)) {
          const content = await readTextFile(settingsPath);
          this.functionSettingsCache = mergeProcessingSettings(JSON.parse(content));
          return this.functionSettingsCache;
        }
      }

      this.functionSettingsCache = mergeProcessingSettings(undefined);
      return this.functionSettingsCache;
    } catch (error) {
      console.error('加载功能设置失败:', error);
      this.functionSettingsCache = mergeProcessingSettings(undefined);
      return this.functionSettingsCache;
    }
  }

  static async saveFunctionSettings(settings: ProcessingSettings): Promise<boolean> {
    try {
      this.functionSettingsCache = settings;

      if (!this.isTauriEnvironment()) {
        localStorage.setItem('imageProcessor_functionSettings', JSON.stringify(settings));
      } else {
        const settingsPath = await this.getFunctionSettingsFilePath();
        const appDataPath = await appDataDir();
        if (!(await exists(appDataPath))) {
          await mkdir(appDataPath, { recursive: true });
        }
        await writeTextFile(settingsPath, JSON.stringify(settings, null, 2));
      }

      return true;
    } catch (error) {
      console.error('保存功能设置失败:', error);
      return false;
    }
  }

  static autoSaveFunctionSettings(settings: ProcessingSettings, delay: number = 800): void {
    if (this.functionAutoSaveTimeout) {
      clearTimeout(this.functionAutoSaveTimeout);
    }

    this.functionAutoSaveTimeout = setTimeout(async () => {
      try {
        await this.saveFunctionSettings(settings);
      } catch (error) {
        console.error('自动保存功能设置失败:', error);
      }
    }, delay);
  }

  static async resetFunctionSettings(): Promise<ProcessingSettings> {
    const defaults = mergeProcessingSettings(undefined);
    await this.saveFunctionSettings(defaults);
    return defaults;
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
