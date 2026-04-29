'use client';

import { useState, useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import Cropper from 'react-easy-crop';
import type { Point, Area } from 'react-easy-crop';

interface Props {
  onImageReady: (dataUrl: string) => void;
  disabled?: boolean;
}

const JPEG_QUALITY = 0.82;
const MAX_DIMENSION = 1024;

async function applyFaceMask(imageSrc: string): Promise<string> {
  const image = new Image();
  image.src = imageSrc;
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = reject;
  });
  const canvas = document.createElement('canvas');
  canvas.width = image.width;
  canvas.height = image.height;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(image, 0, 0);
  const r = image.width * 0.14;
  const cx = image.width / 2;
  const cy = image.width * 0.14;
  ctx.fillStyle = '#080606';
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  return canvas.toDataURL('image/jpeg', JPEG_QUALITY);
}

async function getCroppedImg(imageSrc: string, pixelCrop: Area): Promise<string> {
  const image = new Image();
  image.src = imageSrc;
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = reject;
  });
  const scale = Math.min(MAX_DIMENSION / pixelCrop.width, MAX_DIMENSION / pixelCrop.height, 1);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(pixelCrop.width * scale);
  canvas.height = Math.round(pixelCrop.height * scale);
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(image, pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', JPEG_QUALITY);
}

// AI送信用：クロップ枠よりさらに15%大きく切り抜く
async function getCroppedImgExpanded(imageSrc: string, pixelCrop: Area): Promise<string> {
  const image = new Image();
  image.src = imageSrc;
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = reject;
  });
  const mx = pixelCrop.width * 0.05;
  const my = pixelCrop.height * 0.05;
  const sx = Math.max(0, pixelCrop.x - mx);
  const sy = Math.max(0, pixelCrop.y - my);
  const ex = Math.min(image.width,  pixelCrop.x + pixelCrop.width  + mx);
  const ey = Math.min(image.height, pixelCrop.y + pixelCrop.height + my);
  const sw = ex - sx;
  const sh = ey - sy;
  const scale = Math.min(MAX_DIMENSION / sw, MAX_DIMENSION / sh, 1);
  const canvas = document.createElement('canvas');
  canvas.width  = Math.round(sw * scale);
  canvas.height = Math.round(sh * scale);
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(image, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', JPEG_QUALITY);
}

const GUIDES = [
  { label: '股下', top: '56%' },
];

export default function ImageUploader({ onImageReady, disabled }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [rawImage, setRawImage] = useState<string | null>(null);
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  const [overlayRect, setOverlayRect] = useState<{ top: number; left: number; width: number; height: number } | null>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const footerRef = useRef<HTMLDivElement>(null);
  const [cropperBounds, setCropperBounds] = useState({ top: 60, bottom: 44 });

  const onCropComplete = useCallback((_: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels);
  }, []);

  // header/footer の実高さを測定して Cropper の上下余白を確定（paint 前に実行）
  useLayoutEffect(() => {
    if (!rawImage) return;
    const top = headerRef.current?.offsetHeight ?? 60;
    const bottom = footerRef.current?.offsetHeight ?? 44;
    setCropperBounds({ top, bottom });
  }, [rawImage]);

  // クロップ中はページスクロールを無効化
  useEffect(() => {
    if (rawImage) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      setOverlayRect(null);
    }
    return () => { document.body.style.overflow = ''; };
  }, [rawImage]);

  // .reactEasyCrop_CropArea の実 DOM 位置を読み取ってオーバーレイを合わせる
  useEffect(() => {
    if (!rawImage) return;
    let ro: ResizeObserver | null = null;
    const sync = () => {
      const el = document.querySelector('.reactEasyCrop_CropArea');
      if (!el) return;
      const r = el.getBoundingClientRect();
      setOverlayRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    };
    const timer = setInterval(() => {
      const el = document.querySelector('.reactEasyCrop_CropArea');
      if (!el) return;
      clearInterval(timer);
      sync();
      ro = new ResizeObserver(sync);
      ro.observe(el);
      window.addEventListener('resize', sync);
    }, 30);
    return () => {
      clearInterval(timer);
      ro?.disconnect();
      window.removeEventListener('resize', sync);
    };
  }, [rawImage]);

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) { alert('画像ファイルを選択してください'); return; }
    if (file.size > 10 * 1024 * 1024) { alert('10MB 以下のファイルを選択してください'); return; }
    const url = URL.createObjectURL(file);
    setRawImage(url);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
  }, []);

  const handleConfirm = async () => {
    if (!rawImage || !croppedAreaPixels) return;
    setProcessing(true);
    try {
      const [cropped, expanded] = await Promise.all([
        getCroppedImg(rawImage, croppedAreaPixels),
        getCroppedImgExpanded(rawImage, croppedAreaPixels),
      ]);
      const masked = await applyFaceMask(cropped);
      URL.revokeObjectURL(rawImage);
      setRawImage(null);
      setPreview(masked);
      sessionStorage.setItem('previewImage', masked); // 結果画面用
      onImageReady(expanded); // AI送信は拡張版（顔・膝下含む）
    } catch {
      alert('画像の処理に失敗しました');
    } finally {
      setProcessing(false);
    }
  };

  const handleCancel = () => {
    if (rawImage) URL.revokeObjectURL(rawImage);
    setRawImage(null);
  };

  // ── クロップ画面（全画面オーバーレイ）────────────────────
  if (rawImage) {
    return (
      <div style={{ position: 'fixed', inset: 0, backgroundColor: '#0c0a09', zIndex: 9998 }}>

        {/* ヘッダー：ref で高さを計測し Cropper の top を決定 */}
        <div
          ref={headerRef}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 10000,
            backgroundColor: 'rgba(12,10,9,0.92)',
            paddingTop: 'env(safe-area-inset-top)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px 8px' }}>
            <button
              onClick={handleCancel}
              style={{ color: '#a8a29e', fontSize: '14px', padding: '8px 12px', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              キャンセル
            </button>
            <button
              onClick={handleConfirm}
              disabled={processing}
              style={{ color: '#f87171', fontSize: '14px', fontWeight: 600, padding: '8px 12px', background: 'none', border: 'none', cursor: 'pointer', opacity: processing ? 0.3 : 1 }}
            >
              {processing ? '処理中...' : '確定'}
            </button>
          </div>
          <p style={{ color: '#ffffff', fontSize: '12px', textAlign: 'center', paddingBottom: '12px', paddingLeft: '16px', paddingRight: '16px', letterSpacing: '0.05em', lineHeight: '1.7' }}>
            股下をラインに合わせ、顔を○の中に収めてください<br />
            <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '11px' }}>首は円の外に出すとより正確に診断できます</span>
          </p>
        </div>

        {/* Cropper — ヘッダー・フッターの実測高さで上下を避ける */}
        <div
          style={{
            position: 'absolute',
            top: cropperBounds.top,
            bottom: cropperBounds.bottom,
            left: 0,
            right: 0,
          }}
        >
          <Cropper
            image={rawImage}
            crop={crop}
            zoom={zoom}
            aspect={3 / 4}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
            showGrid={false}
            minZoom={0.3}
            restrictPosition={false}
            style={{
              containerStyle: { backgroundColor: '#ffffff' },
              cropAreaStyle: {
                border: '1.5px solid rgba(255,255,255,0.6)',
                boxShadow: '0 0 0 9999px rgba(0,0,0,0.6)',
              },
            }}
          />
        </div>

        {/* ガイド＋顔マスク — .reactEasyCrop_CropArea の実 DOM 位置に重ねる */}
        {overlayRect && (
          <div
            style={{
              position: 'fixed',
              top: overlayRect.top,
              left: overlayRect.left,
              width: overlayRect.width,
              height: overlayRect.height,
              zIndex: 100,
              pointerEvents: 'none',
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: '0%',
                left: '50%',
                transform: 'translateX(-50%)',
                width: '28%',
                paddingBottom: '28%',
                height: 0,
                backgroundColor: 'rgba(8,6,6,0.80)',
                borderRadius: '50%',
                border: '1.5px solid rgba(255,255,255,0.35)',
              }}
            />
            {GUIDES.map(({ label, top }) => (
              <div
                key={label}
                style={{
                  position: 'absolute',
                  top,
                  left: '4%',
                  right: '4%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <div style={{ flex: 1, borderTop: '2px dashed rgba(255,70,70,0.85)' }} />
                <span style={{ color: 'rgba(255,110,110,1)', fontSize: '12px', whiteSpace: 'nowrap', fontWeight: 600 }}>
                  {label}
                </span>
                <div style={{ flex: 1, borderTop: '2px dashed rgba(255,70,70,0.85)' }} />
              </div>
            ))}
          </div>
        )}

        {/* フッター：ref で高さを計測し Cropper の bottom を決定 */}
        <div
          ref={footerRef}
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 10000,
            backgroundColor: 'rgba(12,10,9,0.75)',
            paddingBottom: 'env(safe-area-inset-bottom)',
          }}
        >
          <p style={{ color: '#57534e', fontSize: '12px', textAlign: 'center', padding: '10px 0', letterSpacing: '0.05em' }}>
            ピンチでズーム・ドラッグで移動
          </p>
        </div>
      </div>
    );
  }

  // ── アップロード画面 ──────────────────────────────────────
  return (
    <div className="w-full">
      {/* label で直接 input を紐付け — programmatic click 不要 */}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        style={{ display: 'none' }}
        disabled={disabled}
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (file) handleFile(file);
        }}
      />
      <div
        onClick={() => { if (!disabled) inputRef.current?.click(); }}
        style={{
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          ...(preview ? { paddingTop: '16px', paddingBottom: '16px' } : { height: '180px' }),
          borderRadius: '16px',
          border: '1.5px dashed #F9A8D4',
          backgroundColor: 'rgba(255,245,248,0.4)',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.5 : 1,
          userSelect: 'none',
          boxSizing: 'border-box',
        }}
      >
        {preview ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={preview}
              alt="プレビュー"
              style={{
                width: '75%',
                height: 'auto',
                display: 'block',
                borderRadius: '12px',
                border: '1.5px solid #FCE7F3',
                boxShadow: '0 2px 12px rgba(236,72,153,0.08)',
              }}
            />
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity 0.2s', backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: '16px' }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '0')}
            >
              <span style={{ color: '#fff', fontSize: '14px', fontWeight: 300, letterSpacing: '0.1em' }}>タップして変更</span>
            </div>
          </>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', padding: '0 24px', textAlign: 'center' }}>
            <span style={{ background: 'linear-gradient(135deg, #F9A8D4 0%, #EC4899 50%, #BE185D 100%)', color: '#fff', padding: '10px 28px', borderRadius: '50px', fontSize: '14px', fontWeight: 300, letterSpacing: '0.15em', boxShadow: '0 3px 12px rgba(190,24,93,0.22)' }}>
              写真を選択
            </span>
            <p style={{ color: '#a8a29e', fontSize: '12px', margin: 0 }}>JPEG・PNG・WebP / 最大 10MB</p>
          </div>
        )}
      </div>

      {!preview && (
        <p style={{ marginTop: '10px', fontSize: '11px', color: '#F9A8D4', textAlign: 'center', lineHeight: 1.8, letterSpacing: '0.03em' }}>
          全身が映った正面からの写真が最も精度の高い結果になります
        </p>
      )}
    </div>
  );
}
