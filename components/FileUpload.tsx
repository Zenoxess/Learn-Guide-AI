import React, { useRef, useState, useCallback } from 'react';
import { UploadIcon, CheckIcon } from './icons';
import { useTheme } from '../contexts/ThemeContext';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  isLoading: boolean;
  acceptedFileTypes?: string;
  label?: string;
  description?: string;
}

export const FileUpload: React.FC<FileUploadProps> = ({ 
  onFileSelect, 
  isLoading, 
  acceptedFileTypes = "image/*,application/pdf",
  label = 'Dokument hierher ziehen',
  description = 'oder klicken, um eine Datei auszuwählen'
}) => {
  const { theme } = useTheme();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = (file: File) => {
    setSelectedFile(file);
    onFileSelect(file);
    setIsSuccess(true);
    setTimeout(() => setIsSuccess(false), 2000);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      processFile(file);
    }
    // Reset file input to allow re-uploading the same file name
    event.target.value = '';
  };

  const handleAreaClick = () => {
    if (!isLoading && !isSuccess) {
      fileInputRef.current?.click();
    }
  };
  
  const handleDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isLoading && !isSuccess) setIsDragOver(true);
  }, [isLoading, isSuccess]);
  
  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if(isLoading || isSuccess) return;

    const file = e.dataTransfer.files?.[0];
    if (file) {
        processFile(file);
    }
  }, [isLoading, isSuccess, onFileSelect]);
  
  const dropzoneClasses = `
    relative block w-full border-2 border-dashed rounded-lg p-12 text-center 
    focus:outline-none focus:ring-2 focus:ring-offset-2 ${theme['focus:ring-primary-500']} 
    transition-all duration-300 
    ${isLoading 
        ? 'cursor-not-allowed bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-600' 
        : isSuccess
            ? 'cursor-default bg-green-50 dark:bg-green-900/50 border-green-500'
        : isDragOver 
            ? `cursor-copy ${theme['bg-primary-50_dark-900/50']} ${theme['border-primary-500']}` 
            : `cursor-pointer bg-white dark:bg-slate-800/50 border-slate-300 dark:border-slate-600 ${theme['hover:border-primary-400_dark-500']}`
    }
  `;

  return (
    <div className="w-full">
      <div
        className={dropzoneClasses}
        onClick={handleAreaClick}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        aria-label="File upload dropzone"
      >
        <input
          ref={fileInputRef}
          type="file"
          className="sr-only"
          onChange={handleFileChange}
          accept={acceptedFileTypes}
          disabled={isLoading}
        />

        {isSuccess ? (
          <div className="flex flex-col items-center justify-center">
            <CheckIcon className="mx-auto h-12 w-12 text-green-500" />
            <span className="mt-2 block text-sm font-medium text-green-700 dark:text-green-300">
              Datei erfolgreich ausgewählt!
            </span>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center">
            <UploadIcon className={`mx-auto h-12 w-12 transition-colors duration-200 ${isDragOver ? theme['text-primary-500'] : 'text-slate-400'}`} />
            <span className="mt-2 block text-sm font-medium text-slate-900 dark:text-slate-200">
              {isDragOver ? 'Datei hier ablegen' : label}
            </span>
            <span className="block text-xs text-slate-500 dark:text-slate-400">
              {description}
            </span>
            {selectedFile && !isSuccess && (
                 <span className="mt-2 block text-xs text-slate-500 dark:text-slate-400">
                    Aktuell: {selectedFile.name}
                 </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};