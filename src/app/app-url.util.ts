export function appUrl(baseUrl: string, path: string) {
  const cleanBase = String(baseUrl || '').replace(/\/$/, '');
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${cleanBase}${cleanPath}`;
}

export function wsUrl(baseUrl: string, path: string) {
  if (baseUrl) return appUrl(baseUrl, path);
  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  return `${proto}://${location.host}${path.startsWith('/') ? path : `/${path}`}`;
}
