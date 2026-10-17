/**
 * Internationalization Configuration - Customize Labels and Translations
 *
 * @see https://img.ly/docs/cesdk/js/user-interface/localization-508e20/
 */

import type CreativeEditorSDK from '@cesdk/cesdk-js';

/**
 * Register EN/DE label overrides used by the experiment chrome (locale switch).
 */
export function setupTranslations(cesdk: CreativeEditorSDK): void {
  cesdk.i18n.setTranslations({
    en: {
      'libraries.ly.img.templates.label': 'Templates',
      'libraries.ly.img.image.label': 'Photos',
      'component.fileOperation.export': 'Download',
    },
    de: {
      'libraries.ly.img.templates.label': 'Vorlagen',
      'libraries.ly.img.image.label': 'Fotos',
      'component.fileOperation.export': 'Herunterladen',
      'common.done': 'Fertig',
    },
  });
}
