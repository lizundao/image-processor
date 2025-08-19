import { useTranslation } from 'react-i18next';
import { useCallback } from 'react';

export const useLanguage = () => {
  const { i18n, t } = useTranslation();

  const changeLanguage = useCallback((language: 'zh-CN' | 'en-US') => {
    i18n.changeLanguage(language);
    // 保存到localStorage
    localStorage.setItem('i18nextLng', language);
  }, [i18n]);

  const getCurrentLanguage = useCallback(() => {
    return i18n.language as 'zh-CN' | 'en-US';
  }, [i18n.language]);

  return {
    currentLanguage: getCurrentLanguage(),
    changeLanguage,
    t,
  };
}; 