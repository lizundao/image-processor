import React, { useEffect, useRef, useState } from 'react';
import { Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter, Button, HStack, VStack, Text, IconButton, Image, useToast, Progress } from '@chakra-ui/react';
import { ChevronLeftIcon, ChevronRightIcon } from '@chakra-ui/icons';
import { useTranslation } from 'react-i18next';
import { ImageFile, ProcessingSettings } from '../../types';
import { TauriImageProcessingService } from '../../services/tauriImageProcessing';

interface EnhanceModalProps {
	isOpen: boolean;
	onClose: () => void;
	images: ImageFile[];
	params: NonNullable<ProcessingSettings['enhance']>;
}

const EnhanceModal: React.FC<EnhanceModalProps> = ({ isOpen, onClose, images, params }) => {
	const { t } = useTranslation();
	const [currentIndex, setCurrentIndex] = useState(0);
	const [loading, setLoading] = useState(false);
	const [previewPath, setPreviewPath] = useState<string | null>(null);

	const reqIdRef = useRef(0);
	const toast = useToast();

	const currentImage = images[currentIndex];

	useEffect(() => {
		if (!isOpen) return;
		if (!currentImage) return;
		let cancelled = false;
		const id = ++reqIdRef.current;
		setLoading(true);
		const run = async () => {
			try {
				const localPath = await TauriImageProcessingService.ensureLocalPathForImage(currentImage);
				const res = await TauriImageProcessingService.previewEnhance(localPath, params, 1400);
				if (cancelled || id !== reqIdRef.current) return;
				setPreviewPath(res.previewPath);
			} catch (e: any) {
				if (!cancelled) {
					toast({ status: 'error', title: t('toast.previewGenerationFailed'), description: String(e), duration: 3000 });
				}
			} finally {
				if (!cancelled) setLoading(false);
			}
		};
		// 防抖
		const timeoutId = setTimeout(run, 180);
		return () => { cancelled = true; clearTimeout(timeoutId); };
	}, [isOpen, currentIndex, currentImage?.url, params.strength, params.autoExposure, params.autoWhiteBalance, params.localContrast, params.sharpen, t, toast]);

	useEffect(() => {
		if (!isOpen) {
			setPreviewPath(null);
			// 当模态框关闭时，清理临时预览文件
			TauriImageProcessingService.cleanupPreviewFiles().then(count => {
				if (count > 0) {
				}
			}).catch(error => {
			});
		}
	}, [isOpen]);

	if (!isOpen) return null;

	return (
		<Modal isOpen={isOpen} onClose={onClose} size="6xl">
			<ModalOverlay />
			<ModalContent>
				<ModalHeader>
					<HStack justify="space-between" align="center">
						<Text>{t('enhance.enhancePreview', { current: currentIndex + 1, total: images.length })}</Text>
						<HStack>
							<IconButton aria-label="prev" icon={<ChevronLeftIcon />} onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))} isDisabled={currentIndex === 0} />
							<IconButton aria-label="next" icon={<ChevronRightIcon />} onClick={() => setCurrentIndex((i) => Math.min(images.length - 1, i + 1))} isDisabled={currentIndex >= images.length - 1} />
						</HStack>
					</HStack>
				</ModalHeader>
				<ModalBody>
					<VStack spacing={3} align="center">
						{loading && <Progress size="xs" isIndeterminate w="100%" />}
						{previewPath ? (
							<Image src={previewPath} maxH="70vh" objectFit="contain" />
						) : (
							<Text fontSize="sm" color="gray.500">{t('enhance.generatingPreview')}</Text>
						)}
					</VStack>
				</ModalBody>
				<ModalFooter>
					<Button onClick={onClose}>{t('enhance.close')}</Button>
				</ModalFooter>
			</ModalContent>
		</Modal>
	);
};

export default EnhanceModal; 