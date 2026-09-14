const DEFAULT_QUEUE_COLORS = {
  active_text: '#7c2d12',
  active_border: '#f59e0b',
  active_text_stroke: '',
  active_pulse1: '',
  active_pulse2: '',
  previous_text: '#7c2d12',
  previous_border: '#f59e0b',
  previous_text_stroke: '',
  previous_bg: '',
  called_text: '#64748b',
  called_border: '#cbd5e1',
  called_text_stroke: '',
  called_bg: '',
  page_bg: '',
  text_stroke_width: '',
};

export function queueColorVariables(value: any, fontWeight: any = '900'): Record<string, string> {
  const colors = { ...DEFAULT_QUEUE_COLORS, ...(value || {}) };
  const vars: Record<string, string> = {
    '--queue-active-text': colors.active_text,
    '--queue-active-border': colors.active_border,
    '--queue-previous-text': colors.previous_text,
    '--queue-previous-border': colors.previous_border,
    '--queue-called-text': colors.called_text,
    '--queue-called-border': colors.called_border,
    '--queue-font-weight': ['400', '700', '900'].includes(String(fontWeight)) ? String(fontWeight) : '900',
  };
  // Box background, text-stroke and pulse colors are opt-in: an empty value leaves the current default alone.
  if (colors.previous_bg) vars['--queue-previous-bg'] = colors.previous_bg;
  if (colors.called_bg) vars['--queue-called-bg'] = colors.called_bg;
  if (colors.active_pulse1) vars['--queue-active-pulse1'] = colors.active_pulse1;
  if (colors.active_pulse2) vars['--queue-active-pulse2'] = colors.active_pulse2;
  if (colors.active_text_stroke) vars['--queue-active-text-stroke'] = colors.active_text_stroke;
  if (colors.previous_text_stroke) vars['--queue-previous-text-stroke'] = colors.previous_text_stroke;
  if (colors.called_text_stroke) vars['--queue-called-text-stroke'] = colors.called_text_stroke;
  if (colors.text_stroke_width !== '' && colors.text_stroke_width != null) vars['--queue-text-stroke-width'] = `${colors.text_stroke_width}px`;
  return vars;
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

// Whole-page background is opt-in: an empty value leaves each screen's current default gradient alone.
export function displayBackgroundVariables(displaySettings: any): Record<string, string> {
  const background = displaySettings?.queue_colors?.page_bg;
  return background ? { '--display-bg': background } : {};
}

// Combined CSS variables for a display screen's root element (font + optional page background).
export function displayPageVariables(displaySettings: any): Record<string, string> {
  return {
    ...displayFontVariables(displaySettings?.display_font_family),
    ...displayBackgroundVariables(displaySettings),
  };
}
