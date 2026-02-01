'use client';

import { useState, useRef } from 'react';

interface FileUploadProps {
  files: File[];
  onFilesChange: (files: File[]) => void;
  maxFiles?: number;
  maxSizeMB?: number;
}

const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

export function FileUpload({
  files,
  onFilesChange,
  maxFiles = 5,
  maxSizeMB = 10,
}: FileUploadProps) {
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    setError(null);

    // Validar quantidade
    if (files.length + selectedFiles.length > maxFiles) {
      setError(`Máximo de ${maxFiles} arquivos permitidos`);
      return;
    }

    // Validar cada arquivo
    const validFiles: File[] = [];
    for (const file of selectedFiles) {
      if (!ACCEPTED_TYPES.includes(file.type)) {
        setError('Apenas PNG, JPG e WebP são aceitos');
        continue;
      }
      if (file.size > maxSizeMB * 1024 * 1024) {
        setError(`Arquivo ${file.name} excede ${maxSizeMB}MB`);
        continue;
      }
      validFiles.push(file);
    }

    if (validFiles.length > 0) {
      onFilesChange([...files, ...validFiles]);
    }

    // Reset input
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  const removeFile = (index: number) => {
    onFilesChange(files.filter((_, i) => i !== index));
    setError(null);
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Screenshots (opcional, máx. {maxFiles} arquivos)
      </label>

      {/* Área de upload */}
      <div
        onClick={() => inputRef.current?.click()}
        className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-gray-400 transition-colors"
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_TYPES.join(',')}
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />
        <div className="text-gray-500">
          <span className="text-2xl block mb-2">📷</span>
          <span className="text-sm">
            Clique ou arraste para adicionar screenshots
          </span>
          <span className="block text-xs text-gray-400 mt-1">
            PNG, JPG ou WebP até {maxSizeMB}MB cada
          </span>
        </div>
      </div>

      {/* Erro */}
      {error && (
        <p className="text-sm text-red-600 mt-2">{error}</p>
      )}

      {/* Preview dos arquivos */}
      {files.length > 0 && (
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
          {files.map((file, index) => (
            <div
              key={`${file.name}-${index}`}
              className="relative group"
            >
              <img
                src={URL.createObjectURL(file)}
                alt={file.name}
                className="w-full h-24 object-cover rounded-lg border border-gray-200"
              />
              <button
                type="button"
                onClick={() => removeFile(index)}
                className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full text-xs hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                ✕
              </button>
              <p className="text-xs text-gray-500 truncate mt-1">{file.name}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
