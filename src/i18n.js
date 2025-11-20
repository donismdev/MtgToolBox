const i18n = {
  lang: localStorage.getItem('selectedLanguage') || 'ko',
  translations: {},
  languages: [],
  
  async init() {
    try {
      const response = await fetch('assets/i18n/language.json');
      if (!response.ok) throw new Error('Network response was not ok');
      const data = await response.json();
      this.translations = data.translations;
      this.languages = data.languages;
    } catch (error) {
      console.error('Failed to load translations:', error);
    }
  },

  t(namespace, key, replacements = {}) {
    const translation = this.translations[namespace]?.[key]?.[this.lang];
    if (!translation) {
      if (namespace === 'toolNames') {
        return key;
      }
      return key;
    }
    let result = translation;
    for (const placeholder in replacements) {
      result = result.replace(`{${placeholder}}`, replacements[placeholder]);
    }
    return result;
  },

  setLang(langCode) {
    this.lang = langCode;
    localStorage.setItem('selectedLanguage', langCode);
  }
};

export default i18n;
