import { isTauriEnv } from './tauriEnv';

/** 将图片 url/路径转为 WebView 可显示的地址 */
export async function resolveImageDisplayUrl(url: string): Promise<string> {
  if (!url) {
    return '';
  }

  if (url.startsWith('blob:') || url.startsWith('data:') || url.startsWith('http')) {
    return url;
  }

  if (isTauriEnv()) {
    const { convertFileSrc } = await import('@tauri-apps/api/core');
    const path = url.startsWith('file://') ? url.slice('file://'.length) : url;
    return convertFileSrc(path);
  }

  return url;
}

export function isBlobUrl(url: string): boolean {
  return url.startsWith('blob:');
}
