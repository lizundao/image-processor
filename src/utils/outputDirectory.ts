import { ProcessingFunction } from '../types';
import { GlobalSettings } from '../types';
import { isTauriEnv } from './tauriEnv';

const OUTPUT_SUFFIX_BY_FUNCTION: Record<ProcessingFunction, string> = {
  compress: 'compressed',
  watermark: 'watermarked',
  convert: 'converted',
  resize: 'resized',
  crop: 'cropped',
  rotate: 'rotated',
  flip: 'flipped',
  brightness: 'brightness',
  border: 'bordered',
  rounded: 'rounded',
  merge: 'merged',
  gif: 'merged_gif',
  enhance: 'enhanced',
  gridSlice: 'grid_slice',
};

export function getOutputSuffixForFunction(functionName: ProcessingFunction): string {
  return OUTPUT_SUFFIX_BY_FUNCTION[functionName] ?? 'output';
}

export async function resolveOutputDirectoryForFunction(
  globalSettings: GlobalSettings,
  functionName: ProcessingFunction
): Promise<string> {
  if (!globalSettings.outputDirectory) {
    return '';
  }

  if (!globalSettings.createSubfolders) {
    return globalSettings.outputDirectory;
  }

  const suffix = getOutputSuffixForFunction(functionName);

  if (isTauriEnv()) {
    const { join } = await import('@tauri-apps/api/path');
    return join(globalSettings.outputDirectory, suffix);
  }

  return `${globalSettings.outputDirectory.replace(/[/\\]+$/, '')}/${suffix}`;
}
