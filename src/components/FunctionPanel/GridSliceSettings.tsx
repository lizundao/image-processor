import React, { useState, useEffect } from 'react';
import {
  VStack,
  HStack,
  Text,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Box,
  Grid,
  GridItem,
  useColorModeValue,
  Button,
  ButtonGroup,
  FormControl,
  FormLabel,
  Select,
  Switch,
} from '@chakra-ui/react';
import { useTranslation } from 'react-i18next';

interface GridSliceSettingsProps {
  settings?: {
    rows: number;
    columns: number;
    outputFormat: string;
    quality: number;
    includeOriginal: boolean;
    namingPattern: string;
  };
  onChange: (settings: {
    rows: number;
    columns: number;
    outputFormat: string;
    quality: number;
    includeOriginal: boolean;
    namingPattern: string;
  }) => void;
}

const GridSliceSettings: React.FC<GridSliceSettingsProps> = ({ settings, onChange }) => {
  const { t } = useTranslation();
  const defaultSettings = {
    rows: 3,
    columns: 3,
    outputFormat: 'JPEG',
    quality: 85,
    includeOriginal: false,
    namingPattern: 'grid_{row}_{col}',
  };

  const currentSettings = settings || defaultSettings;

  const [localRows, setLocalRows] = useState(currentSettings.rows);
  const [localColumns, setLocalColumns] = useState(currentSettings.columns);

  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const gridBgColor = useColorModeValue('gray.100', 'gray.700');
  const gridItemBgColor = useColorModeValue('blue.100', 'blue.700');

  // 当本地状态改变时，延迟更新父组件状态（防抖）
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localRows !== currentSettings.rows || localColumns !== currentSettings.columns) {
        onChange({
          ...currentSettings,
          rows: localRows,
          columns: localColumns,
        });
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [localRows, localColumns, currentSettings, onChange]);

  const handleRowsChange = (value: number) => {
    setLocalRows(value);
  };

  const handleColumnsChange = (value: number) => {
    setLocalColumns(value);
  };

  const handleSettingChange = (key: string, value: any) => {
    onChange({ ...currentSettings, [key]: value });
  };

  // 生成预览网格
  const renderPreviewGrid = () => {
    const totalCells = localRows * localColumns;
    const gridTemplateColumns = `repeat(${localColumns}, 1fr)`;
    const gridTemplateRows = `repeat(${localRows}, 1fr)`;

    return (
      <Box>
        <Text mb={3} fontSize="sm" fontWeight="medium">{t('gridSlice.gridPreview', { rows: localRows, columns: localColumns, total: totalCells })}</Text>
        <Grid
          templateColumns={gridTemplateColumns}
          templateRows={gridTemplateRows}
          gap={1}
          bg={gridBgColor}
          p={2}
          borderRadius="md"
          minH="120px"
        >
          {Array.from({ length: totalCells }, (_, index) => {
            const row = Math.floor(index / localColumns) + 1;
            const col = (index % localColumns) + 1;
            return (
              <GridItem
                key={index}
                bg={gridItemBgColor}
                display="flex"
                alignItems="center"
                justifyContent="center"
                borderRadius="sm"
                fontSize="xs"
                fontWeight="bold"
                color="white"
                minH="30px"
              >
                {row},{col}
              </GridItem>
            );
          })}
        </Grid>
      </Box>
    );
  };

  // 快速预设按钮
  const quickPresets = [
    { label: '2×2', rows: 2, columns: 2 },
    { label: '3×3', rows: 3, columns: 3 },
    { label: '4×4', rows: 4, columns: 4 },
    { label: '2×3', rows: 2, columns: 3 },
    { label: '3×2', rows: 3, columns: 2 },
  ];

  return (
    <VStack spacing={6} align="stretch">
      {/* 快速预设 */}
      <Box>
        <Text mb={3} fontSize="sm" fontWeight="medium">{t('gridSlice.quickPresets')}:</Text>
        <ButtonGroup size="sm" isAttached variant="outline">
          {quickPresets.map((preset) => (
            <Button
              key={preset.label}
              variant={localRows === preset.rows && localColumns === preset.columns ? 'solid' : 'outline'}
              colorScheme="blue"
              onClick={() => {
                setLocalRows(preset.rows);
                setLocalColumns(preset.columns);
              }}
            >
              {preset.label}
            </Button>
          ))}
        </ButtonGroup>
      </Box>

      {/* 行列设置 */}
      <Box>
        <Text mb={3} fontSize="sm" fontWeight="medium">{t('gridSlice.gridSettings')}:</Text>
        <HStack spacing={4}>
          <FormControl>
            <FormLabel fontSize="xs">{t('gridSlice.rows')}</FormLabel>
            <NumberInput
              value={localRows}
              onChange={(_, value) => handleRowsChange(value)}
              min={1}
              max={10}
              size="sm"
            >
              <NumberInputField />
              <NumberInputStepper>
                <NumberIncrementStepper />
                <NumberDecrementStepper />
              </NumberInputStepper>
            </NumberInput>
          </FormControl>

          <FormControl>
            <FormLabel fontSize="xs">{t('gridSlice.columns')}</FormLabel>
            <NumberInput
              value={localColumns}
              onChange={(_, value) => handleColumnsChange(value)}
              min={1}
              max={10}
              size="sm"
            >
              <NumberInputField />
              <NumberInputStepper>
                <NumberIncrementStepper />
                <NumberDecrementStepper />
              </NumberInputStepper>
            </NumberInput>
          </FormControl>
        </HStack>
      </Box>

      {/* 预览网格 */}
      {renderPreviewGrid()}

      {/* 输出设置 */}
      <Box>
        <Text mb={3} fontSize="sm" fontWeight="medium">{t('gridSlice.outputSettings')}:</Text>
        <VStack spacing={3} align="stretch">
          <FormControl>
            <FormLabel fontSize="xs">{t('gridSlice.outputFormat')}</FormLabel>
            <Select
              value={currentSettings.outputFormat}
              onChange={(e) => handleSettingChange('outputFormat', e.target.value)}
              size="sm"
            >
              <option value="JPEG">JPEG</option>
              <option value="PNG">PNG</option>
              <option value="WEBP">WEBP</option>
            </Select>
          </FormControl>

          <FormControl>
            <FormLabel fontSize="xs">{t('gridSlice.quality')} (1-100)</FormLabel>
            <NumberInput
              value={currentSettings.quality}
              onChange={(_, value) => handleSettingChange('quality', value)}
              min={1}
              max={100}
              size="sm"
            >
              <NumberInputField />
              <NumberInputStepper>
                <NumberIncrementStepper />
                <NumberDecrementStepper />
              </NumberInputStepper>
            </NumberInput>
          </FormControl>

          <FormControl display="flex" alignItems="center">
            <FormLabel fontSize="xs" mb="0">
              {t('gridSlice.includeOriginal')}
            </FormLabel>
            <Switch
              isChecked={currentSettings.includeOriginal}
              onChange={(e) => handleSettingChange('includeOriginal', e.target.checked)}
              size="sm"
            />
          </FormControl>

          <FormControl>
            <FormLabel fontSize="xs">{t('gridSlice.namingPattern')}</FormLabel>
            <Select
              value={currentSettings.namingPattern}
              onChange={(e) => handleSettingChange('namingPattern', e.target.value)}
              size="sm"
            >
              <option value="grid_{row}_{col}">grid_{t('gridSlice.row')}_{t('gridSlice.column')}</option>
              <option value="slice_{row}_{col}">slice_{t('gridSlice.row')}_{t('gridSlice.column')}</option>
              <option value="{row}_{col}">{t('gridSlice.row')}_{t('gridSlice.column')}</option>
              <option value="part_{row}_{col}">part_{t('gridSlice.row')}_{t('gridSlice.column')}</option>
            </Select>
          </FormControl>
        </VStack>
      </Box>

      {/* 说明文字 */}
      <Box>
        <Text fontSize="xs" color="gray.500">
          {t('gridSlice.description', { rows: localRows, columns: localColumns, total: localRows * localColumns })}
        </Text>
      </Box>
    </VStack>
  );
};

export default GridSliceSettings; 