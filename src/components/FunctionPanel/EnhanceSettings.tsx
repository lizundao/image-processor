import React, { useState } from 'react';
import { VStack, HStack, Slider, SliderTrack, SliderFilledTrack, SliderThumb, Switch, FormControl, FormLabel, Button, useDisclosure } from '@chakra-ui/react';
import { useTranslation } from 'react-i18next';
import { ProcessingSettings, ImageFile } from '../../types';
import EnhanceModal from './EnhanceModal';

interface EnhanceSettingsProps {
	settings: NonNullable<ProcessingSettings['enhance']>;
	onChange: (settings: NonNullable<ProcessingSettings['enhance']>) => void;
	images: ImageFile[];
}

const EnhanceSettings: React.FC<EnhanceSettingsProps> = ({ settings, onChange, images }) => {
	const { t } = useTranslation();
	const [local, setLocal] = useState(settings);
	const { isOpen, onOpen, onClose } = useDisclosure();

	const commit = (next: Partial<NonNullable<ProcessingSettings['enhance']>>) => {
		const merged = { ...local, ...next } as NonNullable<ProcessingSettings['enhance']>;
		setLocal(merged);
		onChange(merged);
	};

	return (
		<>
			<VStack align="stretch" spacing={4}>
				<FormControl>
					<FormLabel>{t('enhance.beautyStrength', { strength: local.strength })}</FormLabel>
					<Slider value={local.strength} min={0} max={100} step={1} onChange={(v) => commit({ strength: v })}>
						<SliderTrack>
							<SliderFilledTrack />
						</SliderTrack>
						<SliderThumb />
					</Slider>
				</FormControl>

				<HStack>
					<FormControl display="flex" alignItems="center">
						<FormLabel mb="0">{t('enhance.autoExposure')}</FormLabel>
						<Switch isChecked={!!local.autoExposure} onChange={(e) => commit({ autoExposure: e.target.checked })} />
					</FormControl>
					<FormControl display="flex" alignItems="center">
						<FormLabel mb="0">{t('enhance.autoWhiteBalance')}</FormLabel>
						<Switch isChecked={!!local.autoWhiteBalance} onChange={(e) => commit({ autoWhiteBalance: e.target.checked })} />
					</FormControl>
				</HStack>

				<HStack>
					<FormControl display="flex" alignItems="center">
						<FormLabel mb="0">{t('enhance.localContrast')}</FormLabel>
						<Switch isChecked={!!local.localContrast} onChange={(e) => commit({ localContrast: e.target.checked })} />
					</FormControl>
					<FormControl display="flex" alignItems="center">
						<FormLabel mb="0">{t('enhance.sharpen')}</FormLabel>
						<Switch isChecked={!!local.sharpen} onChange={(e) => commit({ sharpen: e.target.checked })} />
					</FormControl>
				</HStack>

				<HStack justify="flex-end">
					<Button colorScheme="purple" variant="outline" onClick={onOpen}>{t('enhance.openPreview')}</Button>
				</HStack>
			</VStack>

			<EnhanceModal isOpen={isOpen} onClose={onClose} images={images} params={local} />
		</>
	);
};

export default EnhanceSettings; 