import { ProcessingFunction, ProcessingSettings } from '../types';

export function getDefaultFunctionSettings(
  functionName: ProcessingFunction
): Partial<ProcessingSettings> {
  const defaults: Partial<Record<ProcessingFunction, ProcessingSettings[keyof ProcessingSettings]>> = {
    compress: { quality: 80 },
    crop: {
      mode: 'ratio',
      aspectRatio: 1.0,
      quality: 85,
      outputFormat: 'JPEG',
      manualCrops: [],
      currentImageIndex: 0,
    },
    rotate: { angle: 0 },
    flip: { horizontal: false, vertical: false },
    brightness: { value: 0 },
    border: {
      width: 10,
      color: '#000000',
      style: 'solid',
      opacity: 1.0,
      overlay_mode: false,
      enable_transparency: false,
      border_radius: 0,
    },
    rounded: { radius: 0 },
    merge: { direction: 'horizontal', spacing: 0 },
    gif: { fps: 10, loop_count: 0, quality: 80 },
    enhance: {
      strength: 50,
      autoExposure: true,
      autoWhiteBalance: false,
      localContrast: false,
      sharpen: true,
    },
    watermark: {
      type: 'text',
      text: '',
      fontSize: 24,
      fontColor: '#000000',
      opacity: 0.5,
      position: 'bottom-right',
    },
    convert: { format: 'JPEG', quality: 85 },
    resize: { width: undefined, height: undefined },
    gridSlice: {
      rows: 3,
      columns: 3,
      outputFormat: 'JPEG',
      quality: 85,
      includeOriginal: false,
      namingPattern: 'grid_{row}_{col}',
    },
  };

  return { [functionName]: defaults[functionName] } as Partial<ProcessingSettings>;
}

export function getInitialProcessingSettings(): ProcessingSettings {
  return {
    compress: { quality: 80 },
  };
}

export function mergeProcessingSettings(
  saved: Partial<ProcessingSettings> | null | undefined
): ProcessingSettings {
  return {
    ...getInitialProcessingSettings(),
    ...(saved ?? {}),
  };
}
