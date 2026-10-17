import type { AssetSourceConfig } from '../types/document'
import type { StockAsset } from './stockAssets'
import { STOCK_ASSETS } from './stockAssets'

export async function fetchAssetsFromSource(config?: AssetSourceConfig): Promise<StockAsset[]> {
  if (!config || config.kind === 'builtin' || !config.baseUrl) {
    return STOCK_ASSETS
  }
  try {
    const res = await fetch(`${config.baseUrl.replace(/\/$/, '')}/manifest.json`)
    if (!res.ok) return STOCK_ASSETS
    const data = (await res.json()) as { assets?: StockAsset[] }
    if (data.assets?.length) return data.assets
  } catch {
    /* fall back */
  }
  return STOCK_ASSETS
}
