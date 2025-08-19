import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// 导入语言包
import zhCN from './locales/zh-CN.json';
import enUS from './locales/en-US.json';

const resources = {
  'zh-CN': { translation: zhCN },
  'en-US': { translation: enUS },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'zh-CN',
    debug: false,
    
    interpolation: {
      escapeValue: false,
    },
    
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
    },
  });

// 导出一个函数供非React上下文使用（如服务层）
export const t = (key: string, options?: any) => {
  return i18n.t(key, options);
};

export default i18n; 