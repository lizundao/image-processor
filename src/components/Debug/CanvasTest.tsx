import React, { useState, useRef } from 'react';
import {
  Box,
  Button,
  VStack,
  HStack,
  Text,
  Input,
  Alert,
  AlertIcon,
  Code,
  Divider,
  useToast,
} from '@chakra-ui/react';

const CanvasTest: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [testResults, setTestResults] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const toast = useToast();

  const addResult = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setTestResults(prev => [...prev, `[${timestamp}] ${message}`]);
    console.log(message);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setTestResults([]);
      addResult(`选择文件: ${file.name}, 大小: ${file.size} bytes, 类型: ${file.type}`);
    }
  };

  const runCanvasTest = async () => {
    if (!selectedFile) {
      toast({
        title: '请选择图片文件',
        status: 'warning',
        duration: 3000,
      });
      return;
    }

    setIsProcessing(true);
    setTestResults([]);

    try {
      addResult('🚀 开始Canvas测试...');

      // 创建图片对象
      const img = new Image();
      const imageUrl = URL.createObjectURL(selectedFile);
      
      addResult(`📁 创建图片URL: ${imageUrl.substring(0, 50)}...`);

      // 等待图片加载
      await new Promise((resolve, reject) => {
        img.onload = () => {
          addResult(`✅ 图片加载成功: ${img.width}x${img.height}`);
          resolve(void 0);
        };
        img.onerror = () => {
          addResult('❌ 图片加载失败');
          reject(new Error('图片加载失败'));
        };
        img.crossOrigin = 'anonymous';
        img.src = imageUrl;
      });

      // 获取Canvas
      const canvas = canvasRef.current;
      if (!canvas) {
        throw new Error('Canvas元素不存在');
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('无法获取Canvas上下文');
      }

      addResult('✅ Canvas上下文获取成功');

      // 设置Canvas尺寸
      canvas.width = img.width;
      canvas.height = img.height;
      addResult(`🎨 Canvas尺寸设置: ${canvas.width}x${canvas.height}`);

      // 清除并设置背景
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      addResult('🎨 Canvas背景设置完成');

      // 绘制图片
      ctx.drawImage(img, 0, 0);
      addResult('🎨 图片绘制到Canvas完成');

      // 检查像素数据
      const imageData = ctx.getImageData(0, 0, Math.min(10, canvas.width), Math.min(10, canvas.height));
      const pixelSum = Array.from(imageData.data.slice(0, 12)).reduce((a, b) => a + b, 0);
      addResult(`🔍 像素数据检查: 前12个值=${imageData.data.slice(0, 12)}, 总和=${pixelSum}`);

      if (pixelSum === 0) {
        addResult('⚠️ 警告: 像素数据全为0，Canvas可能没有正确绘制');
      }

      // 测试不同的导出方法
      await testExportMethods(canvas, ctx);

      // 清理
      URL.revokeObjectURL(imageUrl);
      addResult('🧹 资源清理完成');

    } catch (error) {
      addResult(`❌ 测试失败: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const testExportMethods = async (canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) => {
    addResult('🔄 开始测试导出方法...');

    // 方法1: toDataURL (JPEG)
    try {
      const jpegDataURL = canvas.toDataURL('image/jpeg', 0.8);
      addResult(`✅ toDataURL(JPEG): 长度=${jpegDataURL.length}`);
      
      if (jpegDataURL.length < 100) {
        addResult('⚠️ JPEG DataURL长度异常短');
      }
    } catch (error) {
      addResult(`❌ toDataURL(JPEG)失败: ${error}`);
    }

    // 方法2: toDataURL (PNG)
    try {
      const pngDataURL = canvas.toDataURL('image/png');
      addResult(`✅ toDataURL(PNG): 长度=${pngDataURL.length}`);
    } catch (error) {
      addResult(`❌ toDataURL(PNG)失败: ${error}`);
    }

    // 方法3: toBlob (JPEG)
    try {
      const jpegBlob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('toBlob返回null'));
          }
        }, 'image/jpeg', 0.8);
      });
      addResult(`✅ toBlob(JPEG): 大小=${jpegBlob.size} bytes`);
      
      if (jpegBlob.size === 0) {
        addResult('⚠️ JPEG Blob大小为0');
      }
    } catch (error) {
      addResult(`❌ toBlob(JPEG)失败: ${error}`);
    }

    // 方法4: toBlob (PNG)
    try {
      const pngBlob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('toBlob返回null'));
          }
        }, 'image/png');
      });
      addResult(`✅ toBlob(PNG): 大小=${pngBlob.size} bytes`);
    } catch (error) {
      addResult(`❌ toBlob(PNG)失败: ${error}`);
    }

    // 方法5: getImageData + 手动转换
    try {
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      addResult(`✅ getImageData: ${imageData.width}x${imageData.height}, 数据长度=${imageData.data.length}`);
      
      // 创建临时Canvas进行转换测试
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = canvas.width;
      tempCanvas.height = canvas.height;
      const tempCtx = tempCanvas.getContext('2d');
      
      if (tempCtx) {
        tempCtx.putImageData(imageData, 0, 0);
        const tempDataURL = tempCanvas.toDataURL('image/jpeg', 0.8);
        addResult(`✅ 临时Canvas转换: 长度=${tempDataURL.length}`);
      }
    } catch (error) {
      addResult(`❌ getImageData方法失败: ${error}`);
    }
  };

  const clearResults = () => {
    setTestResults([]);
  };

  return (
    <Box p={6} maxW="1000px" mx="auto">
      <VStack spacing={6} align="stretch">
        <Text fontSize="2xl" fontWeight="bold">Canvas功能测试</Text>
        
        <Alert status="info">
          <AlertIcon />
          这个工具用于诊断Canvas API在当前环境中的工作状态
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

        {/* 操作按钮 */}
        <HStack>
          <Button
            colorScheme="blue"
            onClick={runCanvasTest}
            isLoading={isProcessing}
            loadingText="测试中..."
            isDisabled={!selectedFile}
          >
            开始Canvas测试
          </Button>
          
          <Button
            variant="outline"
            onClick={clearResults}
          >
            清除结果
          </Button>
        </HStack>

        {/* Canvas显示区域 */}
        <Box>
          <Text fontWeight="medium" mb={2}>Canvas预览:</Text>
          <Box border="1px solid" borderColor="gray.300" p={4} bg="gray.50">
            <canvas
              ref={canvasRef}
              style={{
                maxWidth: '100%',
                maxHeight: '300px',
                border: '1px solid #ccc',
                backgroundColor: 'white'
              }}
            />
          </Box>
        </Box>

        {/* 测试结果 */}
        {testResults.length > 0 && (
          <>
            <Divider />
            <Box>
              <Text fontWeight="medium" mb={2}>测试结果:</Text>
              <Box
                bg="gray.50"
                p={4}
                borderRadius="md"
                maxH="400px"
                overflowY="auto"
                fontSize="sm"
                fontFamily="monospace"
              >
                {testResults.map((result, index) => (
                  <Text key={index} mb={1}>
                    {result}
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
            <Text>User Agent: <Code fontSize="xs">{navigator.userAgent}</Code></Text>
            <Text>Canvas支持: {document.createElement('canvas').getContext('2d') ? '是' : '否'}</Text>
            <Text>WebGL支持: {document.createElement('canvas').getContext('webgl') ? '是' : '否'}</Text>
            <Text>Tauri环境: {typeof window !== 'undefined' && '__TAURI__' in window ? '是' : '否'}</Text>
          </VStack>
        </Box>
      </VStack>
    </Box>
  );
};

export default CanvasTest;
