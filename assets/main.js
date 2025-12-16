async function getTranslations() {
    try {
        const response = await fetch('/assets/i18n/language.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error("Failed to load translations:", error);
        return null;
    }
}

function getLanguage() {
    let lang = localStorage.getItem('language');
    if (!lang) {
        lang = navigator.language.split('-')[0];
    }
    return lang;
}

async function applyTranslations() {
    const translationsData = await getTranslations();
    if (!translationsData) return;

    const lang = getLanguage();
    const toolName = document.body.dataset.tool;

    if (!toolName) {
        console.error("Tool name is not set in body's data-tool attribute.");
        return;
    }

    const toolTranslations = translationsData.translations[toolName];
    if (!toolTranslations) return;

    document.querySelectorAll('[data-i18n]').forEach(element => {
        const key = element.getAttribute('data-i18n');
        if (toolTranslations[key] && toolTranslations[key][lang]) {
            element.textContent = toolTranslations[key][lang];
        }
    });

    // Translate title
    if (translationsData.translations.toolNames[toolName] && translationsData.translations.toolNames[toolName][lang]) {
        document.title = translationsData.translations.toolNames[toolName][lang];
    }
}

document.addEventListener('DOMContentLoaded', applyTranslations);