import React, { Suspense } from 'react';
import { Box, VStack, Text, useColorModeValue, FormControl, FormLabel, Input, Spinner, Center } from '@chakra-ui/react';
import { useTranslation } from 'react-i18next';
import { ProcessingFunction, ProcessingSettings, ImageFile } from '../../types';

// 先只对常用组件进行懒加载，其他组件保持正常导入
import CompressSettings from './CompressSettings';
import WatermarkSettings from './WatermarkSettings';
import ConvertSettings from './ConvertSettings';
import RotateSettings from './RotateSettings';
import FlipSettings from './FlipSettings';
import BorderSettings from './BorderSettings';
import RoundedSettings from './RoundedSettings';
import MergeSettings from './MergeSettings';
import GifSettings from './GifSettings';
import EnhanceSettings from './EnhanceSettings';
import GridSliceSettings from './GridSliceSettings';

// 懒加载较重的组件
const CropSettings = React.lazy(() => import('./CropSettings'));

interface FunctionPanelProps {
	currentFunction: ProcessingFunction;
	settings: ProcessingSettings;
	onSettingsChange: (newSettings: Partial<ProcessingSettings>) => void;
	images: ImageFile[]; // 添加图片列表参数
}

const FunctionPanel: React.FC<FunctionPanelProps> = ({
	currentFunction,
	settings,
	onSettingsChange,
	images,
}) => {

	const borderColor = useColorModeValue('gray.200', 'gray.700');
	const { t } = useTranslation();

	// 加载指示器组件
	const LoadingSpinner = () => (
		<Center py={8}>
			<Spinner size="md" />
		</Center>
	);

	const renderSettings = () => {
		switch (currentFunction) {
			case 'compress':
				return (
					<CompressSettings
						settings={settings.compress}
						onChange={(compress) => onSettingsChange({ compress })}
					/>
				);
			case 'watermark':
				return (
					<WatermarkSettings
						settings={settings}
						onSettingsChange={onSettingsChange}
					/>
				);
			case 'convert':
				return (
					<ConvertSettings
						settings={settings.convert}
						onChange={(convert) => onSettingsChange({ convert })}
					/>
				);

			case 'resize':
				return (
					<VStack align="stretch" spacing={4}>
						<Text fontSize="sm" color="gray.600">{t('resize.proportionalScaling')}</Text>
						<FormControl>
							<FormLabel>{t('resize.targetWidth')}</FormLabel>
							<Input
								type="number"
								min={1}
								value={settings.resize?.width ?? ''}
								onChange={(e) => {
									const width = e.target.value ? Number(e.target.value) : undefined;
									onSettingsChange({ 
										resize: { 
											width, 
											height: width ? undefined : settings.resize?.height 
										} 
									});
								}}
							/>
						</FormControl>
						<FormControl>
							<FormLabel>{t('resize.targetHeight')}</FormLabel>
							<Input
								type="number"
								min={1}
								value={settings.resize?.height ?? ''}
								onChange={(e) => {
									const height = e.target.value ? Number(e.target.value) : undefined;
									onSettingsChange({ 
										resize: { 
											height, 
											width: height ? undefined : settings.resize?.width 
										} 
									});
								}}
							/>
						</FormControl>
					</VStack>
				);

			case 'crop':
				return (
					<Suspense fallback={<LoadingSpinner />}>
						<CropSettings
							settings={settings.crop || { mode: 'ratio', aspectRatio: 1.0, quality: 85, outputFormat: 'JPEG' }}
							onChange={(crop) => onSettingsChange({ crop })}
							images={images}
						/>
					</Suspense>
				);

			case 'rotate':
				return (
					<RotateSettings
						settings={settings.rotate || { angle: 0 }}
						onChange={(rotate) => onSettingsChange({ rotate })}
					/>
				);
			case 'flip':
				return (
					<FlipSettings
						settings={settings.flip || { horizontal: false, vertical: false }}
						onChange={(flip) => onSettingsChange({ flip })}
					/>
				);
			case 'border':
				return (
					<BorderSettings
						settings={settings.border || { width: 10, color: '#000000', style: 'solid', opacity: 1.0, overlay_mode: false, enable_transparency: false }}
						onChange={(border) => onSettingsChange({ border })}
					/>
				);
			case 'rounded':
				return (
					<RoundedSettings
						settings={settings.rounded}
						onChange={(rounded) => onSettingsChange({ rounded })}
					/>
				);
			case 'merge':
				return (
					<MergeSettings
						settings={settings.merge}
						onChange={(merge) => onSettingsChange({ merge })}
					/>
				);
			case 'gif':
				return (
					<GifSettings
						settings={settings.gif}
						onChange={(gif) => onSettingsChange({ gif })}
					/>
				);

			case 'enhance':
				return (
					<EnhanceSettings
						settings={settings.enhance || { strength: 50, autoExposure: true, autoWhiteBalance: false, localContrast: false, sharpen: true }}
						onChange={(enhance: NonNullable<ProcessingSettings['enhance']>) => onSettingsChange({ enhance })}
						images={images}
					/>
				);

			case 'gridSlice':
				return (
					<GridSliceSettings
						settings={settings.gridSlice || { rows: 3, columns: 3, outputFormat: 'JPEG', quality: 85, includeOriginal: false, namingPattern: 'grid_{row}_{col}' }}
						onChange={(gridSlice) => onSettingsChange({ gridSlice })}
					/>
				);

			default:
				return <Text>{t('common.settings')}</Text>;
		}
	};

	const getFunctionTitle = () => {
		const titles: Record<string, string> = {
			compress: t('compress.title'),
			watermark: t('watermark.title'),
			convert: t('convert.title'),
			resize: t('navigation.resize'),
			crop: t('crop.title'),
			rotate: t('rotate.title'),
			flip: t('flip.title'),
			border: t('border.title'),
			rounded: t('rounded.title'),
			merge: t('merge.title'),
			gif: t('gif.title'),
			enhance: t('enhance.title'),
			gridSlice: t('gridSlice.title'),
		};
		return titles[currentFunction as string] || t('common.settings');
	};

	return (
		<Box h="100%" borderRight="1px" borderColor={borderColor} display="flex" flexDirection="column">
			{/* 标题区域 - 固定高度 */}
			<Box p={4} borderBottom="1px" borderColor={borderColor} flexShrink={0}>
				<Text fontSize="lg" fontWeight="bold">{getFunctionTitle()}</Text>
			</Box>
			
			{/* 设置内容区域 - 可滚动 */}
			<Box flex={1} overflowY="auto">
				<Box p={4}>
					<VStack align="stretch" spacing={4}>
						{renderSettings()}
					</VStack>
				</Box>
			</Box>
		</Box>
	);
};

export default FunctionPanel; 