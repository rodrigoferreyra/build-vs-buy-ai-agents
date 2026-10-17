/**
 * CE.SDK Design Editor - Initialization Module
 *
 * @see https://img.ly/docs/cesdk/js/get-started/overview-e18f40/
 */

import type CreativeEditorSDK from '@cesdk/cesdk-js';

import {
  BlurAssetSource,
  ImageColorsAssetSource,
  ColorPaletteAssetSource,
  CropPresetsAssetSource,
  DemoAssetSources,
  EffectsAssetSource,
  FiltersAssetSource,
  PagePresetsAssetSource,
  PremiumTemplatesAssetSource,
  StickerAssetSource,
  TextAssetSource,
  TextComponentAssetSource,
  TypefaceAssetSource,
  UploadAssetSources,
  VectorShapeAssetSource,
} from '@cesdk/cesdk-js/plugins';

import BackgroundRemovalPlugin from '@imgly/plugin-background-removal-web';
import VectorizerPlugin from '@imgly/plugin-vectorizer-web';
import AiApps from '@imgly/plugin-ai-apps-web';
import FalAiImage from '@imgly/plugin-ai-image-generation-web/fal-ai';

import { DesignEditorConfig } from './config/plugin';
import { registerBrandAssetSource } from './brandAssets';

export { DesignEditorConfig } from './config/plugin';

const SAMPLE_VIDEO =
  'https://img.ly/static/ubq_video_samples/bbb.mp4';

/**
 * Initialize the CE.SDK editor (design + video-capable feature set).
 */
export async function initDesignEditor(cesdk: CreativeEditorSDK) {
  await cesdk.addPlugin(new DesignEditorConfig());

  // White-label theming (no dark default; custom CSS chrome in App.css)
  cesdk.ui.setTheme('light');
  cesdk.i18n.setLocale('en');
  cesdk.engine.editor.setRole('Creator');

  // Brand spot color for print (id 43)
  cesdk.engine.editor.setSpotColorCMYK('BrandMagenta', 0, 1, 0, 0);
  cesdk.engine.editor.setSpotColorRGB('BrandBlue', 0.15, 0.39, 0.92);

  await Promise.all([
    cesdk.addPlugin(new BlurAssetSource()),
    cesdk.addPlugin(new ImageColorsAssetSource()),
    cesdk.addPlugin(new ColorPaletteAssetSource()),
    cesdk.addPlugin(new CropPresetsAssetSource()),
    cesdk.addPlugin(
      new UploadAssetSources({
        include: [
          'ly.img.image.upload',
          'ly.img.video.upload',
          'ly.img.audio.upload',
        ],
      }),
    ),
    cesdk.addPlugin(
      new DemoAssetSources({
        include: [
          'ly.img.templates.blank.*',
          'ly.img.templates.presentation.*',
          'ly.img.templates.print.*',
          'ly.img.templates.social.*',
          'ly.img.templates.video.*',
          'ly.img.image.*',
          'ly.img.video.*',
          'ly.img.audio.*',
        ],
      }),
    ),
    cesdk.addPlugin(new EffectsAssetSource()),
    cesdk.addPlugin(new FiltersAssetSource()),
    cesdk.addPlugin(new PagePresetsAssetSource()),
    cesdk.addPlugin(new StickerAssetSource()),
    cesdk.addPlugin(new TextAssetSource()),
    cesdk.addPlugin(new TextComponentAssetSource()),
    cesdk.addPlugin(new TypefaceAssetSource()),
    cesdk.addPlugin(new VectorShapeAssetSource()),
    cesdk.addPlugin(
      new PremiumTemplatesAssetSource({
        include: ['ly.img.templates.premium.*'],
      }),
    ),
  ]);

  registerBrandAssetSource(cesdk);

  cesdk.ui.insertOrderComponent(
    { in: 'ly.img.navigation.bar', position: 'end' },
    {
      id: 'ly.img.actions.navigationBar',
      children: [
        'ly.img.saveScene.navigationBar',
        'ly.img.exportImage.navigationBar',
        'ly.img.exportPDF.navigationBar',
        'ly.img.exportVideo.navigationBar',
        'ly.img.exportScene.navigationBar',
        'ly.img.exportArchive.navigationBar',
        'ly.img.importScene.navigationBar',
      ],
    },
  );

  await cesdk.addPlugin(
    BackgroundRemovalPlugin({
      ui: { locations: ['canvasMenu'] },
      provider: {
        type: '@imgly/background-removal',
      },
    }),
  );

  await cesdk.addPlugin(
    VectorizerPlugin({
      ui: { locations: 'canvasMenu' },
    }),
  );

  // Text-to-image + edit-as-layers (dryRun for experiment; set VITE_AI_PROXY_URL for live)
  const proxyUrl =
    (import.meta.env.VITE_AI_PROXY_URL as string | undefined) ||
    'https://example.invalid/ai-proxy';
  await cesdk.addPlugin(
    AiApps({
      providers: {
        text2image: FalAiImage.RecraftV3({ proxyUrl }),
        image2image: FalAiImage.GeminiFlashEdit({ proxyUrl }),
      },
      dryRun: !import.meta.env.VITE_AI_PROXY_URL,
    }),
  );

  // Brand-scoped AI generation features
  cesdk.feature.set('ly.img.plugin-ai-image-generation-web.fromText', true);
  cesdk.feature.set('ly.img.plugin-ai-image-generation-web.fromImage', true);

  // Caption import helper (id 52)
  cesdk.actions.register('importCaptionsSrt', async () => {
    const text = (await cesdk.utils.loadFile({
      accept: '.srt,text/plain',
      returnType: 'text',
    })) as string;
    const blobUrl = URL.createObjectURL(
      new Blob([text], { type: 'text/plain' }),
    );
    try {
      await cesdk.engine.block.createCaptionsFromURI(blobUrl);
    } finally {
      URL.revokeObjectURL(blobUrl);
    }
  });
}

export async function loadDesignDemo(cesdk: CreativeEditorSDK) {
  const { DEMO_ASSETS_BASE_URL } = await import('./demo-assets');
  await cesdk.load(
    `${DEMO_ASSETS_BASE_URL}/assets/4-5-marketing-ad/scene.scene`,
  );
}

export async function loadVideoDemo(cesdk: CreativeEditorSDK) {
  await cesdk.createFromVideo(SAMPLE_VIDEO);
}
