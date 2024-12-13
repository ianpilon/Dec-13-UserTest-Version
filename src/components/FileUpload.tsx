import React, { useCallback, useState, useRef } from 'react';
import { FileText, Upload, Video } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  accept?: string;
  maxSize?: number;
  type?: 'pdf' | 'media';
}

export const FileUpload: React.FC<FileUploadProps> = ({
  onFileSelect,
  accept = 'application/pdf',
  maxSize = 5242880, // 5MB
  type = 'pdf',
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFiles(files);
    }
  };

  const handleFiles = (files: File[]) => {
    const file = files[0];
    if (file.size > maxSize) {
      alert(`File size should not exceed ${maxSize / 1024 / 1024}MB`);
      return;
    }
    onFileSelect(file);
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      handleFiles(files);
    }
  };

  return (
    <div
      className={cn(
        'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
        isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
      )}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onClick={handleClick}
    >
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept={accept}
        onChange={handleFileInput}
      />
      <div className="flex flex-col items-center gap-2">
        {type === 'pdf' ? (
          <FileText className="h-10 w-10 text-gray-400" />
        ) : (
          <Video className="h-10 w-10 text-gray-400" />
        )}
        <p className="text-lg font-medium">
          {type === 'pdf' ? 'Drop your PDF here or click to upload' : 'Drop your media file here or click to upload'}
        </p>
        <p className="text-sm text-gray-500">
          {type === 'pdf'
            ? `Supports PDF files up to ${maxSize / 1024 / 1024}MB`
            : `Supports audio/video files up to ${maxSize / 1024 / 1024}MB`}
        </p>
      </div>
    </div>
  );
};