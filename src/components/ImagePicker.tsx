import React, { useState, useRef } from 'react';
import { Camera, Upload, Trash2, X, RefreshCw } from 'lucide-react';

interface ImagePickerProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
}

export const ImagePicker: React.FC<ImagePickerProps> = ({ value, onChange, label = 'Foto del Producto' }) => {
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Resize / Compress image to lightweight Base64
  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_SIZE = 500;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_SIZE) {
              height *= MAX_SIZE / width;
              width = MAX_SIZE;
            }
          } else {
            if (height > MAX_SIZE) {
              width *= MAX_SIZE / height;
              height = MAX_SIZE;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', 0.85));
          } else {
            reject(new Error('Canvas unsupported'));
          }
        };
        img.onerror = (err) => reject(err);
        img.src = event.target?.result as string;
      };
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressedBase64 = await compressImage(file);
        onChange(compressedBase64);
      } catch (err) {
        console.error('Error al procesar imagen:', err);
      }
    }
  };

  // Camera Management
  const startCamera = async () => {
    setCameraError(null);
    setShowCameraModal(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err: any) {
      setCameraError('No se pudo acceder a la cámara.');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setShowCameraModal(false);
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        onChange(canvas.toDataURL('image/jpeg', 0.85));
        stopCamera();
      }
    }
  };

  return (
    <div className="space-y-1">
      {label && <label className="block text-[11px] font-semibold text-slate-400 uppercase">{label}</label>}

      {/* Ultra Simple Compact Control Row */}
      <div className="flex items-center space-x-3 bg-slate-900/60 p-2 rounded-xl border border-slate-700/80">
        {/* Thumbnail Preview */}
        {value ? (
          <img
            src={value}
            alt="Foto"
            className="w-12 h-12 rounded-lg object-cover border border-blue-500 shadow shrink-0"
          />
        ) : (
          <div className="w-12 h-12 rounded-lg bg-slate-800 border border-dashed border-slate-700 flex items-center justify-center text-slate-500 text-lg shrink-0">
            🖼️
          </div>
        )}

        {/* 2 Simple Direct Buttons */}
        <div className="flex items-center space-x-2 flex-1">
          {/* Direct File Picker Button */}
          <label className="cursor-pointer bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-blue-500 text-xs font-semibold px-3 py-2 rounded-lg flex items-center space-x-1.5 transition shadow-sm">
            <Upload className="w-3.5 h-3.5 text-blue-400" />
            <span>Subir Foto</span>
            <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
          </label>

          {/* Direct Camera Button */}
          <button
            type="button"
            onClick={startCamera}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-emerald-500 text-xs font-semibold px-3 py-2 rounded-lg flex items-center space-x-1.5 transition shadow-sm"
          >
            <Camera className="w-3.5 h-3.5 text-emerald-400" />
            <span>Tomar Foto</span>
          </button>

          {value && (
            <button
              type="button"
              onClick={() => onChange('')}
              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
              title="Quitar foto"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Clean Modal Popup ONLY when user clicks "Tomar Foto" */}
      {showCameraModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[99999] flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 w-full max-w-sm shadow-2xl space-y-3">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <span className="text-xs font-bold text-white flex items-center space-x-1.5">
                <Camera className="w-4 h-4 text-emerald-400" />
                <span>Tomar Foto con Cámara</span>
              </span>
              <button type="button" onClick={stopCamera} className="text-slate-400 hover:text-white text-xs">✕</button>
            </div>

            {cameraError ? (
              <div className="text-xs text-rose-400 p-4 text-center">{cameraError}</div>
            ) : (
              <div className="relative rounded-lg overflow-hidden bg-black aspect-video flex items-center justify-center border border-slate-800 shadow-inner">
                <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
              </div>
            )}

            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={stopCamera}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={capturePhoto}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg flex items-center space-x-1 shadow"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>📷 Capturar</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
