const DEFAULT_QUEUE_COLORS = {
  active_text: '#7c2d12',
  active_border: '#f59e0b',
  previous_text: '#7c2d12',
  previous_border: '#f59e0b',
  called_text: '#64748b',
  called_border: '#cbd5e1',
};

export function queueColorVariables(value: any, fontWeight: any = '900'): Record<string, string> {
  const colors = { ...DEFAULT_QUEUE_COLORS, ...(value || {}) };
  return {
    '--queue-active-text': colors.active_text,
    '--queue-active-border': colors.active_border,
    '--queue-previous-text': colors.previous_text,
    '--queue-previous-border': colors.previous_border,
    '--queue-called-text': colors.called_text,
    '--queue-called-border': colors.called_border,
    '--queue-font-weight': ['400', '700', '900'].includes(String(fontWeight)) ? String(fontWeight) : '900',
  };
}

const DISPLAY_FONTS: Record<string, string> = {
  kanit: "'Kanit', sans-serif",
  anuphan: "'Anuphan', sans-serif",
  'ibm-plex-sans-thai': "'IBM Plex Sans Thai', sans-serif",
  'noto-sans-thai': "'Noto Sans Thai', sans-serif",
  prompt: "'Prompt', sans-serif",
  sarabun: "'Sarabun', sans-serif",
};

export function displayFontVariables(value: any): Record<string, string> {
  return { '--display-font-family': DISPLAY_FONTS[String(value)] || DISPLAY_FONTS['kanit'] };
}

export function displayFontFamily(value: any) {
  return DISPLAY_FONTS[String(value)] || DISPLAY_FONTS['kanit'];
}
