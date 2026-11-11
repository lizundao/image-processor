import { useTranslation } from 'react-i18next';
import { useCallback } from 'react';
import { GlobalSettings } from '../types';

type AppLanguage = GlobalSettings['language'];

export const useLanguage = () => {
  const { i18n, t } = useTranslation();

  const changeLanguage = useCallback((language: AppLanguage) => {
    i18n.changeLanguage(language);
    localStorage.setItem('i18nextLng', language);
  }, [i18n]);

  const getCurrentLanguage = useCallback(() => {
    return i18n.language as AppLanguage;
  }, [i18n.language]);

  return {
    currentLanguage: getCurrentLanguage(),
    changeLanguage,
    t,
  };
};
