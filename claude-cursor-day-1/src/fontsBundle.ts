// Open-source (OFL) fonts bundled with the app so they render identically everywhere and can be embedded in PDF.
import inter_400_n from '@fontsource/inter/files/inter-latin-400-normal.woff?url'
import inter_400_i from '@fontsource/inter/files/inter-latin-400-italic.woff?url'
import inter_700_n from '@fontsource/inter/files/inter-latin-700-normal.woff?url'
import inter_700_i from '@fontsource/inter/files/inter-latin-700-italic.woff?url'
import '@fontsource/inter/latin-400.css'
import '@fontsource/inter/latin-700.css'
import '@fontsource/inter/latin-400-italic.css'
import '@fontsource/inter/latin-700-italic.css'
import playfair_display_400_n from '@fontsource/playfair-display/files/playfair-display-latin-400-normal.woff?url'
import playfair_display_400_i from '@fontsource/playfair-display/files/playfair-display-latin-400-italic.woff?url'
import playfair_display_700_n from '@fontsource/playfair-display/files/playfair-display-latin-700-normal.woff?url'
import playfair_display_700_i from '@fontsource/playfair-display/files/playfair-display-latin-700-italic.woff?url'
import '@fontsource/playfair-display/latin-400.css'
import '@fontsource/playfair-display/latin-700.css'
import '@fontsource/playfair-display/latin-400-italic.css'
import '@fontsource/playfair-display/latin-700-italic.css'
import oswald_400_n from '@fontsource/oswald/files/oswald-latin-400-normal.woff?url'
import oswald_700_n from '@fontsource/oswald/files/oswald-latin-700-normal.woff?url'
import '@fontsource/oswald/latin-400.css'
import '@fontsource/oswald/latin-700.css'
import lora_400_n from '@fontsource/lora/files/lora-latin-400-normal.woff?url'
import lora_400_i from '@fontsource/lora/files/lora-latin-400-italic.woff?url'
import lora_700_n from '@fontsource/lora/files/lora-latin-700-normal.woff?url'
import lora_700_i from '@fontsource/lora/files/lora-latin-700-italic.woff?url'
import '@fontsource/lora/latin-400.css'
import '@fontsource/lora/latin-700.css'
import '@fontsource/lora/latin-400-italic.css'
import '@fontsource/lora/latin-700-italic.css'
import roboto_mono_400_n from '@fontsource/roboto-mono/files/roboto-mono-latin-400-normal.woff?url'
import roboto_mono_400_i from '@fontsource/roboto-mono/files/roboto-mono-latin-400-italic.woff?url'
import roboto_mono_700_n from '@fontsource/roboto-mono/files/roboto-mono-latin-700-normal.woff?url'
import roboto_mono_700_i from '@fontsource/roboto-mono/files/roboto-mono-latin-700-italic.woff?url'
import '@fontsource/roboto-mono/latin-400.css'
import '@fontsource/roboto-mono/latin-700.css'
import '@fontsource/roboto-mono/latin-400-italic.css'
import '@fontsource/roboto-mono/latin-700-italic.css'
import pacifico_400_n from '@fontsource/pacifico/files/pacifico-latin-400-normal.woff?url'
import '@fontsource/pacifico/latin-400.css'

export interface BundledFont {
  label: string
  family: string
  css: string
  files: Record<string, string> // `${weight}-${italic?1:0}` -> url
}

export const BUNDLED_FONTS: BundledFont[] = [
  { label: 'Inter', family: 'Inter', css: '"Inter", sans-serif', files: { '400-0': inter_400_n, '400-1': inter_400_i, '700-0': inter_700_n, '700-1': inter_700_i } },
  { label: 'Playfair Display', family: 'Playfair Display', css: '"Playfair Display", serif', files: { '400-0': playfair_display_400_n, '400-1': playfair_display_400_i, '700-0': playfair_display_700_n, '700-1': playfair_display_700_i } },
  { label: 'Oswald', family: 'Oswald', css: '"Oswald", sans-serif', files: { '400-0': oswald_400_n, '700-0': oswald_700_n } },
  { label: 'Lora', family: 'Lora', css: '"Lora", serif', files: { '400-0': lora_400_n, '400-1': lora_400_i, '700-0': lora_700_n, '700-1': lora_700_i } },
  { label: 'Roboto Mono', family: 'Roboto Mono', css: '"Roboto Mono", monospace', files: { '400-0': roboto_mono_400_n, '400-1': roboto_mono_400_i, '700-0': roboto_mono_700_n, '700-1': roboto_mono_700_i } },
  { label: 'Pacifico', family: 'Pacifico', css: '"Pacifico", cursive', files: { '400-0': pacifico_400_n } },
]
