export type UiLocale = 'en' | 'de'

const STRINGS: Record<UiLocale, Record<string, string>> = {
  en: {
    text: 'Text',
    export: 'Export',
    download: 'Download',
    templates: 'Templates',
    saveTemplate: 'Save template',
    layers: 'Layers',
    fit: 'Fit',
  },
  de: {
    text: 'Text',
    export: 'Exportieren',
    download: 'Herunterladen',
    templates: 'Vorlagen',
    saveTemplate: 'Als Vorlage speichern',
    layers: 'Ebenen',
    fit: 'Einpassen',
  },
}

export function t(locale: UiLocale, key: string): string {
  return STRINGS[locale][key] ?? STRINGS.en[key] ?? key
}
