/**
 * Custom brand kit asset source (colors + logo) — checklist 38 / 63.
 */

import type CreativeEditorSDK from '@cesdk/cesdk-js';

const BRAND_SOURCE_ID = 'ly.img.experiment.brand';

export function registerBrandAssetSource(cesdk: CreativeEditorSDK): void {
  cesdk.engine.asset.addLocalSource(BRAND_SOURCE_ID, undefined, async (asset) => {
    if (asset.id === 'brand-logo') {
      return cesdk.engine.asset.defaultApplyAsset(asset);
    }
    const page = cesdk.engine.scene.getCurrentPage();
    if (page == null) return undefined;
    const meta = asset.meta as { r?: string; g?: string; b?: string } | undefined;
    const r = Number(meta?.r ?? 0.15);
    const g = Number(meta?.g ?? 0.39);
    const b = Number(meta?.b ?? 0.92);
    const fill = cesdk.engine.block.createFill('color');
    cesdk.engine.block.setColor(fill, 'fill/color/value', { r, g, b, a: 1 });
    cesdk.engine.block.setFill(page, fill);
    return page;
  });

  cesdk.engine.asset.addAssetToSource(BRAND_SOURCE_ID, {
    id: 'brand-blue',
    label: { en: 'Brand Blue' },
    meta: { r: '0.15', g: '0.39', b: '0.92' },
  });
  cesdk.engine.asset.addAssetToSource(BRAND_SOURCE_ID, {
    id: 'brand-orange',
    label: { en: 'Brand Orange' },
    meta: { r: '0.98', g: '0.45', b: '0.09' },
  });
  cesdk.engine.asset.addAssetToSource(BRAND_SOURCE_ID, {
    id: 'brand-logo',
    label: { en: 'Brand mark' },
    meta: {
      uri: 'https://img.ly/static/ubq_samples/sample_1.jpg',
      thumbUri: 'https://img.ly/static/ubq_samples/sample_1.jpg',
      blockType: '//ly.img.ubq/graphic',
    },
  });
}
