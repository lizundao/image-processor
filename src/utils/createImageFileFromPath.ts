import { ImageFile } from '../types';
import { isTauriEnv } from './tauriEnv';

const IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp']);

const MIME_BY_EXT: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  bmp: 'image/bmp',
};

interface ImageInfo {
  path: string;
  width: number;
  height: number;
  format: string;
  size_bytes: number;
}

function getFileName(path: string): string {
  return path.split(/[/\\]/).pop() ?? path;
}

function guessMimeType(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase() ?? '';
  return MIME_BY_EXT[ext] ?? 'image/jpeg';
}

function isImagePath(path: string): boolean {
  const ext = path.split('.').pop()?.toLowerCase() ?? '';
  return IMAGE_EXTENSIONS.has(ext);
}

function isTauriEnvironment(): boolean {
  return isTauriEnv();
}

async function fetchImageInfoMap(paths: string[]): Promise<Map<string, ImageInfo>> {
  const infoMap = new Map<string, ImageInfo>();

  if (!isTauriEnvironment() || paths.length === 0) {
    return infoMap;
  }

  try {
    const { invoke } = await import('@tauri-apps/api/core');
    const results = await invoke<Array<ImageInfo | string>>('get_images_info', {
      filePaths: paths,
    });

    results.forEach((result, index) => {
      if (result && typeof result === 'object' && 'size_bytes' in result) {
        infoMap.set(paths[index], result as ImageInfo);
      }
    });
  } catch {
    // 批量失败时逐个尝试
    await Promise.all(
      paths.map(async (path) => {
        try {
          const { invoke } = await import('@tauri-apps/api/core');
          const info = await invoke<ImageInfo>('get_image_info', { filePath: path });
          infoMap.set(path, info);
        } catch {
          // 忽略单文件失败
        }
      })
    );
  }

  return infoMap;
}

export async function createImageFilesFromPaths(paths: string[]): Promise<ImageFile[]> {
  const imagePaths = paths.filter(isImagePath);
  if (imagePaths.length === 0) {
    return [];
  }

  const infoMap = await fetchImageInfoMap(imagePaths);

  return imagePaths.map((path) => {
    const name = getFileName(path);
    const info = infoMap.get(path);

    return {
      id: Math.random().toString(36).slice(2, 11),
      name,
      size: info?.size_bytes ?? 0,
      type: guessMimeType(name),
      url: path,
      file: new File([], name),
    };
  });
}

export function createImageFileFromBrowserFile(file: File): ImageFile {
  const path = (file as File & { path?: string }).path;
  const hasValidPath = path && !path.startsWith('./');

  return {
    id: Math.random().toString(36).slice(2, 11),
    name: file.name,
    size: file.size,
    type: file.type,
    url: hasValidPath ? path : URL.createObjectURL(file),
    file,
  };
}

export function releaseImageFileUrl(image: ImageFile): void {
  if (image.url.startsWith('blob:')) {
    URL.revokeObjectURL(image.url);
  }
}
