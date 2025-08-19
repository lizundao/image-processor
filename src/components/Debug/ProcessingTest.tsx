import React, { useState } from 'react';
import {
  Box,
  Button,
  VStack,
  HStack,
  Text,
  Input,
  Select,
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
  useToast,
  Alert,
  AlertIcon,
  Code,
  Divider,
} from '@chakra-ui/react';
import { ImageProcessingService } from '../../services/imageProcessing';
import { FileService } from '../../services/fileService';
import { ImageFile } from '../../types';

const ProcessingTest: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [quality, setQuality] = useState(80);
  const [format, setFormat] = useState('JPEG');
  const [isProcessing, setIsProcessing] = useState(false);
  const [debugLog, setDebugLog] = useState<string[]>([]);
  const [processedBlob, setProcessedBlob] = useState<Blob | null>(null);
  const toast = useToast();

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setDebugLog(prev => [...prev, `[${timestamp}] ${message}`]);
    console.log(message);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      addLog(`选择文件: ${file.name}, 大小: ${file.size} bytes, 类型: ${file.type}`);
    }
  };

  const testProcessing = async () => {
    if (!selectedFile) {
      toast({
        title: '请选择文件',
        status: 'warning',
        duration: 3000,
      });
      return;
    }

    setIsProcessing(true);
    setDebugLog([]);
    setProcessedBlob(null);

    try {
      addLog('🚀 开始测试图片处理...');

      // 创建ImageFile对象
      const imageFile: ImageFile = {
        id: 'test-1',
        name: selectedFile.name,
        size: selectedFile.size,
        type: selectedFile.type,
        url: URL.createObjectURL(selectedFile),
        file: selectedFile,
      };

      addLog(`📁 创建ImageFile对象: ${imageFile.name}`);

      // 测试压缩
      const result = await ImageProcessingService.compressImages([imageFile], {
        quality
      });

      addLog(`📊 处理结果: success=${result.success}, 处理图片数量=${result.processedImages.length}`);

      if (result.success && result.processedImages.length > 0) {
        const processed = result.processedImages[0];
        addLog(`✅ 处理成功: ${processed.name}, 大小: ${processed.size} bytes`);
        
        setProcessedBlob(processed.file);

        // 测试文件保存（如果在Tauri环境）
        if (FileService.isTauriEnvironment()) {
          addLog('🏠 检测到Tauri环境，测试文件保存...');
          
          const saveResult = await FileService.saveProcessedImages(result.processedImages, {
            outputDirectory: 'C:\\temp\\test-output', // 临时测试目录
            outputFormat: 'original',
            quality: 80,
            overwriteExisting: true,
            createSubfolders: false,
            filenamePattern: '{name}_test_{timestamp}',
            autoOpenOutputFolder: false,
            language: 'zh-CN',
          });

          if (saveResult.success) {
            addLog(`💾 文件保存成功: ${saveResult.savedFiles.length} 个文件`);
            saveResult.savedFiles.forEach(file => addLog(`  - ${file}`));
          } else {
            addLog(`❌ 文件保存失败: ${saveResult.error}`);
          }
        } else {
          addLog('🌐 浏览器环境，跳过文件保存测试');
        }

      } else {
        addLog(`❌ 处理失败: ${result.error}`);
      }

    } catch (error) {
      addLog(`💥 异常: ${error instanceof Error ? error.message : String(error)}`);
      toast({
        title: '处理失败',
        description: error instanceof Error ? error.message : '未知错误',
        status: 'error',
        duration: 5000,
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadProcessed = () => {
    if (processedBlob) {
      const url = URL.createObjectURL(processedBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `processed_${selectedFile?.name || 'image'}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  return (
    <Box p={6} maxW="800px" mx="auto">
      <VStack spacing={6} align="stretch">
        <Text fontSize="2xl" fontWeight="bold">图片处理功能测试</Text>
        
        <Alert status="info">
          <AlertIcon />
          这是一个调试工具，用于测试图片处理功能的各个环节
        </Alert>

        {/* 文件选择 */}
        <Box>
          <Text mb={2} fontWeight="medium">选择测试图片:</Text>
          <Input
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            p={1}
          />
          {selectedFile && (
            <Text mt={2} fontSize="sm" color="gray.600">
              已选择: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
            </Text>
          )}
        </Box>

        {/* 处理参数 */}
        <VStack spacing={4} align="stretch">
          <Text fontWeight="medium">处理参数:</Text>
          
          <HStack>
            <Text minW="80px">质量:</Text>
            <Slider
              value={quality}
              onChange={setQuality}
              min={1}
              max={100}
              flex={1}
            >
              <SliderTrack>
                <SliderFilledTrack />
              </SliderTrack>
              <SliderThumb />
            </Slider>
            <Text minW="50px">{quality}%</Text>
          </HStack>

          <HStack>
            <Text minW="80px">格式:</Text>
            <Select value={format} onChange={(e) => setFormat(e.target.value)} maxW="200px">
              <option value="JPEG">JPEG</option>
              <option value="PNG">PNG</option>
              <option value="WEBP">WEBP</option>
            </Select>
          </HStack>
        </VStack>

        {/* 操作按钮 */}
        <HStack>
          <Button
            colorScheme="blue"
            onClick={testProcessing}
            isLoading={isProcessing}
            loadingText="处理中..."
            isDisabled={!selectedFile}
          >
            开始测试处理
          </Button>
          
          {processedBlob && (
            <Button
              colorScheme="green"
              onClick={downloadProcessed}
            >
              下载处理结果
            </Button>
          )}
        </HStack>

        {/* 调试日志 */}
        {debugLog.length > 0 && (
          <>
            <Divider />
            <Box>
              <Text fontWeight="medium" mb={2}>调试日志:</Text>
              <Box
                bg="gray.50"
                p={4}
                borderRadius="md"
                maxH="300px"
                overflowY="auto"
                fontSize="sm"
                fontFamily="monospace"
              >
                {debugLog.map((log, index) => (
                  <Text key={index} mb={1}>
                    {log}
                  </Text>
                ))}
              </Box>
            </Box>
          </>
        )}

        {/* 环境信息 */}
        <Box>
          <Text fontWeight="medium" mb={2}>环境信息:</Text>
          <VStack align="start" spacing={1} fontSize="sm">
            <Text>Tauri环境: {FileService.isTauriEnvironment() ? '是' : '否'}</Text>
            <Text>User Agent: <Code fontSize="xs">{navigator.userAgent}</Code></Text>
            <Text>Canvas支持: {document.createElement('canvas').getContext('2d') ? '是' : '否'}</Text>
          </VStack>
        </Box>
      </VStack>
    </Box>
  );
};

export default ProcessingTest;
