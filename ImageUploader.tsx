// components/ImageUploader.tsx
'use client';

import { useState, useCallback, useRef } from 'react';

interface Props {
  onImageReady: (dataUrl: string) => void;
  disabled?: boolean;
}

const MAX_DIMENSION = 1024; // リサイズ後の最大辺のピクセル数
const JPEG_QUALITY = 0.82;  // JPEG 圧縮品質

/** ブラウザ側でリサイズ＆圧縮する */
async function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      let { width, height } = img;

      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        if (width > height) {
          height = Math.round((height / width) * MAX_DIMENSION);
          width = MAX_DIMENSION;
        } else {
          width = Math.round((width / height) * MAX_DIMENSION);
          height = MAX_DIMENSION;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', JPEG_QUALITY));
    };

    img.onerror = reject;
    img.src = url;
  });
}

export default function ImageUploader({ onImageReady, disabled }: Props) {
  const [preview, setPreview] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [compressing, setCompressing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    async (file: File) => {
      if (!file.type.startsWith('image/')) {
        alert('画像ファイルを選択してください');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        alert('10MB 以下のファイルを選択してください');
        return;
      }

      setCompressing(true);
      try {
        const compressed = await compressImage(file);
        setPreview(compressed);
        onImageReady(compressed);
      } catch {
        alert('画像の処理に失敗しました');
      } finally {
        setCompressing(false);
      }
    },
    [onImageReady]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  return (
    <div className="w-full">
      {/* ドロップゾーン */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => !disabled && inputRef.current?.click()}
        className={`
          relative flex flex-col items-center justify-center
          w-full h-64 rounded-2xl border-2 border-dashed
          transition-all duration-300 cursor-pointer
          ${dragging
            ? 'border-amber-400 bg-amber-50/30 scale-[1.01]'
            : 'border-stone-300 hover:border-stone-500 bg-stone-50/50'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        {compressing ? (
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-stone-400 border-t-amber-500 rounded-full animate-spin" />
            <p className="text-sm text-stone-500 font-light tracking-wider">画像を最適化中...</p>
          </div>
        ) : preview ? (
          // プレビュー表示
          <div className="relative w-full h-full overflow-hidden rounded-2xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={preview}
              alt="アップロード画像プレビュー"
              className="w-full h-full object-contain"
            />
            <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity bg-black/40 rounded-2xl">
              <span className="text-white text-sm font-light tracking-wider">クリックして変更</span>
            </div>
          </div>
        ) : (
          // 初期表示
          <div className="flex flex-col items-center gap-4 px-6 text-center">
            <div className="w-14 h-14 rounded-full bg-stone-100 flex items-center justify-center">
              <svg className="w-7 h-7 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
            </div>
            <div>
              <p className="text-stone-700 font-light tracking-wider text-sm">
                写真をドラッグ＆ドロップ
              </p>
              <p className="text-stone-400 text-xs mt-1 tracking-wide">
                または<span className="underline underline-offset-2">クリックして選択</span>
              </p>
              <p className="text-stone-400 text-xs mt-3">JPEG・PNG・WebP / 最大 10MB</p>
              <p className="text-stone-400 text-xs mt-1">※ アップロード前に自動でリサイズ・圧縮されます</p>
            </div>
          </div>
        )}

        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          disabled={disabled}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />
      </div>

      {/* 診断のヒント */}
      {!preview && (
        <p className="mt-3 text-xs text-stone-400 text-center leading-relaxed">
          全身が映った正面からの写真が最も精度の高い結果になります
        </p>
      )}
    </div>
  );
}
