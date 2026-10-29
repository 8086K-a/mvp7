import { THEME_PALETTE_STORAGE_KEY } from '@/lib/theme/palette'

export function ThemePaletteScript() {
  const script = `
    (function () {
      try {
        var palette = localStorage.getItem(${JSON.stringify(THEME_PALETTE_STORAGE_KEY)}) || 'default';
        document.documentElement.dataset.palette = palette;
      } catch (error) {
        document.documentElement.dataset.palette = 'default';
      }
    })();
  `

  return <script dangerouslySetInnerHTML={{ __html: script }} />
}
