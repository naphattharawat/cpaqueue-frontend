export function appRouteUrl(path = '') {
  const base = appBasePath();
  const normalizedBase = base.endsWith('/') ? base : `${base}/`;
  const normalizedPath = path.replace(/^\/+/, '');
  return `${normalizedBase}${normalizedPath}`;
}

export function appBasePath() {
  const base = document.querySelector('base')?.getAttribute('href') || '';
  if (base && base !== '/' && base !== './') return base;
  const firstSegment = location.pathname.split('/').filter(Boolean)[0] || '';
  return firstSegment === 'queue' ? '/queue/' : '/';
}

export function appAbsoluteUrl(path = '') {
  return new URL(appRouteUrl(path), location.origin).toString();
}

export function appUrl(base = '', path = '') {
  const normalizedBase = String(base || '').replace(/\/+$/, '');
  const normalizedPath = String(path || '').replace(/^\/+/, '');
  if (!normalizedBase) return `/${normalizedPath}`;
  if (!normalizedPath) return normalizedBase;
  return `${normalizedBase}/${normalizedPath}`;
}

export function wsUrl(base = '', path = '') {
  if (base) return appUrl(base, path);
  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${proto}://${location.host}${cleanPath}`;
}
