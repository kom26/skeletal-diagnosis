'use client';

import { useState, useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import Cropper from 'react-easy-crop';
import type { Point, Area } from 'react-easy-crop';

interface Props {
  onImageReady: (dataUrl: string) => void;
  disabled?: boolean;
}

type Mode = 'precise' | 'quick';

const JPEG_QUALITY = 0.82;
const MAX_DIMENSION = 1024;

interface CropOutput {
  dataUrl: string;
  imgTop: number;
}

async function applyFaceMask(
  imageSrc: string,
  imgTop: number,
): Promise<string> {
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
  // r・cx はキャンバス幅基準（クロップ枠の overlay 円と同サイズ）
  // cy は imgTop（画像コンテンツ上端）から r 分下 — ズームアウト時も画像内に収まる
  const r  = image.width * 0.14;
  const cx = image.width / 2;
  const cy = imgTop + r;
  ctx.fillStyle = '#080606';
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  return canvas.toDataURL('image/jpeg', JPEG_QUALITY);
}

async function getCroppedImg(imageSrc: string, pixelCrop: Area): Promise<CropOutput> {
  const image = new Image();
  image.src = imageSrc;
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = reject;
  });
  const scale = Math.min(MAX_DIMENSION / pixelCrop.width, MAX_DIMENSION / pixelCrop.height, 1);
  const cw = Math.round(pixelCrop.width  * scale);
  const ch = Math.round(pixelCrop.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width  = cw;
  canvas.height = ch;
  const ctx = canvas.getContext('2d')!;

  // 白で埋める（画像範囲外の余白）
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, cw, ch);

  // ── Safari 互換: 負のsource座標を避けるため画像境界でクリップし
  //    対応するdest座標にオフセットして描画する ──────────────────
  const srcX = Math.max(0, pixelCrop.x);
  const srcY = Math.max(0, pixelCrop.y);
  const srcW = Math.min(image.naturalWidth,  pixelCrop.x + pixelCrop.width)  - srcX;
  const srcH = Math.min(image.naturalHeight, pixelCrop.y + pixelCrop.height) - srcY;

  if (srcW > 0 && srcH > 0) {
    const dstX = (srcX - pixelCrop.x) / pixelCrop.width  * cw;
    const dstY = (srcY - pixelCrop.y) / pixelCrop.height * ch;
    const dstW = srcW / pixelCrop.width  * cw;
    const dstH = srcH / pixelCrop.height * ch;
    ctx.drawImage(image, srcX, srcY, srcW, srcH, dstX, dstY, dstW, dstH);
  }

  // 顔マスク位置計算用: キャンバス内の画像開始点と幅
  const imgTop = Math.round((srcY - pixelCrop.y) / pixelCrop.height * ch);

  return { dataUrl: canvas.toDataURL('image/jpeg', JPEG_QUALITY), imgTop };
}

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

async function resizeImage(imageSrc: string): Promise<string> {
  const image = new Image();
  image.src = imageSrc;
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = reject;
  });
  const scale = Math.min(MAX_DIMENSION / image.width, MAX_DIMENSION / image.height, 1);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(image.width * scale);
  canvas.height = Math.round(image.height * scale);
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', JPEG_QUALITY);
}

const GUIDES = [
  { label: '股下', top: '56%' },
];


export default function ImageUploader({ onImageReady, disabled }: Props) {
  const inputRef  = useRef<HTMLInputElement>(null);
  const modeRef   = useRef<Mode>('quick');
  const [showGuide, setShowGuide] = useState(false);
  const [rawImage, setRawImage] = useState<string | null>(null);
  const [crop, setCrop]     = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom]     = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [preview, setPreview]   = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  const [overlayRect, setOverlayRect] = useState<{ top: number; left: number; width: number; height: number } | null>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const footerRef = useRef<HTMLDivElement>(null);
  const [cropperBounds, setCropperBounds] = useState({ top: 60, bottom: 44 });

  const onCropComplete = useCallback((_: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels);
  }, []);

  useLayoutEffect(() => {
    if (!rawImage) return;
    const top = headerRef.current?.offsetHeight ?? 60;
    const bottom = footerRef.current?.offsetHeight ?? 44;
    setCropperBounds({ top, bottom });
  }, [rawImage]);

  useEffect(() => {
    if (rawImage) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      setOverlayRect(null);
    }
    return () => { document.body.style.overflow = ''; };
  }, [rawImage]);

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

  // 精密診断用：クロップ画面に進む
  const handleFilePrecise = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) { alert('画像ファイルを選択してください'); return; }
    if (file.size > 10 * 1024 * 1024) { alert('10MB 以下のファイルを選択してください'); return; }
    const url = URL.createObjectURL(file);
    setRawImage(url);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
  }, []);

  // さくっと診断用：リサイズして即プレビュー
  const handleFileQuick = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) { alert('画像ファイルを選択してください'); return; }
    if (file.size > 10 * 1024 * 1024) { alert('10MB 以下のファイルを選択してください'); return; }
    setProcessing(true);
    try {
      const url = URL.createObjectURL(file);
      const resized = await resizeImage(url);
      URL.revokeObjectURL(url);
      setPreview(resized);
      sessionStorage.setItem('previewImage', resized);
      onImageReady(resized);
    } catch {
      alert('画像の処理に失敗しました');
    } finally {
      setProcessing(false);
    }
  }, [onImageReady]);

  const handleConfirm = async () => {
    if (!rawImage || !croppedAreaPixels) return;
    setProcessing(true);
    try {
      const [{ dataUrl: cropped, imgTop }, expanded] = await Promise.all([
        getCroppedImg(rawImage, croppedAreaPixels),
        getCroppedImgExpanded(rawImage, croppedAreaPixels),
      ]);
      const masked = await applyFaceMask(cropped, imgTop);
      URL.revokeObjectURL(rawImage);
      setRawImage(null);
      setPreview(masked);
      sessionStorage.setItem('previewImage', masked);
      onImageReady(expanded);
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

  const handleReset = () => {
    setPreview(null);
    onImageReady('');
  };

  const openFilePicker = (m: Mode) => {
    if (disabled) return;
    modeRef.current = m;
    if (m === 'precise') {
      setShowGuide(true);
    } else {
      inputRef.current?.click();
    }
  };

  const handleGuideConfirm = () => {
    inputRef.current?.click(); // ユーザージェスチャー内で呼ぶ（iOS Safari対応）
    // ガイドは写真選択確定後に閉じる（onChange側で制御）
  };

  // ── 単一 return（input は常時DOMに存在させる）────────────
  return (
    <div className="w-full">

      {/* 常時マウント: ガイド/クロップ画面でも inputRef が有効 */}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        style={{ display: 'none' }}
        disabled={disabled}
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (!file) return;
          setShowGuide(false); // 写真が選ばれた時点でガイドを閉じる
          if (modeRef.current === 'precise') {
            handleFilePrecise(file);
          } else {
            handleFileQuick(file);
          }
        }}
      />

      {/* ── 撮影ガイド画面 ── */}
      {showGuide && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9997, background: '#fff', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
          <div style={{ position: 'sticky', top: 0, zIndex: 2, background: 'rgba(255,255,255,0.96)', backdropFilter: 'blur(8px)', borderBottom: '1px solid #FCE7F3', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ margin: 0, fontSize: '10px', letterSpacing: '0.2em', color: '#F9A8D4' }}>No. 01 — 精密診断</p>
              <h2 style={{ margin: '2px 0 0', fontSize: '18px', fontWeight: 700, color: '#9D174D', letterSpacing: '0.05em' }}>撮影ガイド</h2>
            </div>
            <button onClick={() => setShowGuide(false)} style={{ background: 'none', border: 'none', fontSize: '22px', color: '#a8a29e', cursor: 'pointer', lineHeight: 1, padding: '4px' }}>×</button>
          </div>
          <div style={{ padding: '20px 20px 40px' }}>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'stretch', background: '#FFF0F5', borderRadius: '16px', padding: '16px', marginBottom: '16px', border: '1px solid #FCE7F3' }}>
              <div style={{ flexShrink: 0, display: 'flex', alignItems: 'stretch' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/guide-body.png" alt="骨格診断撮影ガイド" style={{ height: '100%', width: 'auto', maxWidth: '130px', display: 'block', borderRadius: '8px', objectFit: 'contain' }} />
              </div>
              <div style={{ flex: 1, paddingTop: '4px', paddingLeft: '4px' }}>
                <p style={{ margin: '0 0 10px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', color: '#EC4899' }}>以下が写っているか確認</p>
                {['首・首の付け根', '鎖骨', 'ウエスト', 'ヒップ', '手首', '膝'].map((item) => (
                  <div key={item} style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '7px' }}>
                    <div style={{ width: '15px', height: '15px', borderRadius: '50%', background: '#EC4899', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span style={{ color: '#fff', fontSize: '9px', lineHeight: 1 }}>✓</span>
                    </div>
                    <span style={{ fontSize: '12px', color: '#9D174D', fontWeight: 500 }}>{item}</span>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ background: '#FFF5F8', borderRadius: '14px', padding: '14px 16px', marginBottom: '12px', border: '1px solid #FCE7F3' }}>
              <p style={{ margin: '0 0 6px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', color: '#EC4899' }}>推奨服装</p>
              <p style={{ margin: 0, fontSize: '12px', color: '#7C3654', lineHeight: 1.85 }}>
                水着・ヨガウェア・タイトなキャミソール等、<strong>体のラインがわかる服装</strong>ほど診断精度が上がります。
              </p>
            </div>
            <div style={{ background: '#F0FDF4', borderRadius: '14px', padding: '14px 16px', marginBottom: '24px', border: '1px solid #DCFCE7' }}>
              <p style={{ margin: '0 0 6px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', color: '#16A34A' }}>ご利用年齢について</p>
              <p style={{ margin: 0, fontSize: '12px', color: '#14532D', lineHeight: 1.85 }}>
                未成年の方がご利用になる場合は必ず保護者の同意を得たうえでご利用ください。また、正確な診断には骨格が安定する18歳以上のご利用を推奨します。
              </p>
            </div>
            <button
              onClick={handleGuideConfirm}
              style={{ width: '100%', padding: '16px', background: 'linear-gradient(135deg, #F472B6, #EC4899)', color: '#fff', border: 'none', borderRadius: '50px', fontSize: '14px', fontWeight: 700, letterSpacing: '0.1em', cursor: 'pointer', boxShadow: '0 4px 20px rgba(236,72,153,0.3)' }}
            >
              写真を選ぶ
            </button>
            <p style={{ marginTop: '14px', fontSize: '10px', color: '#a8a29e', textAlign: 'center', lineHeight: 1.8, letterSpacing: '0.02em' }}>
              過度な露出がある画像はAIが適切に判定できない場合があります。<br />
              アップロードされた画像はAI骨格診断の分析にのみ使用され、<br />第三者に提供されることはありません。
            </p>
          </div>
        </div>
      )}

      {/* ── クロップ画面 ── */}
      {rawImage && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: '#0c0a09', zIndex: 9998 }}>
          <div
            ref={headerRef}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10000, backgroundColor: 'rgba(12,10,9,0.92)', paddingTop: 'env(safe-area-inset-top)' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px 8px' }}>
              <button onClick={handleCancel} style={{ color: '#a8a29e', fontSize: '14px', padding: '8px 12px', background: 'none', border: 'none', cursor: 'pointer' }}>
                キャンセル
              </button>
              <button onClick={handleConfirm} disabled={processing} style={{ color: '#f87171', fontSize: '14px', fontWeight: 600, padding: '8px 12px', background: 'none', border: 'none', cursor: 'pointer', opacity: processing ? 0.3 : 1 }}>
                {processing ? '処理中...' : '確定'}
              </button>
            </div>
            <p style={{ color: '#ffffff', fontSize: '12px', textAlign: 'center', paddingBottom: '12px', paddingLeft: '16px', paddingRight: '16px', letterSpacing: '0.05em', lineHeight: '1.7' }}>
              股下をラインに合わせ、顔を○の中に収めてください<br />
              <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '11px' }}>首は円の外に出すとより正確に診断できます</span>
            </p>
          </div>
          <div style={{ position: 'absolute', top: cropperBounds.top, bottom: cropperBounds.bottom, left: 0, right: 0 }}>
            <Cropper
              image={rawImage ?? undefined}
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
                cropAreaStyle: { border: '1.5px solid rgba(255,255,255,0.6)', boxShadow: '0 0 0 9999px rgba(0,0,0,0.6)' },
              }}
            />
          </div>
          {overlayRect && (
            <div style={{ position: 'fixed', top: overlayRect.top, left: overlayRect.left, width: overlayRect.width, height: overlayRect.height, zIndex: 100, pointerEvents: 'none' }}>
              <div style={{ position: 'absolute', top: '0%', left: '50%', transform: 'translateX(-50%)', width: '28%', paddingBottom: '28%', height: 0, backgroundColor: 'rgba(8,6,6,0.80)', borderRadius: '50%', border: '1.5px solid rgba(255,255,255,0.35)' }} />
              {GUIDES.map(({ label, top }) => (
                <div key={label} style={{ position: 'absolute', top, left: '4%', right: '4%', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ flex: 1, borderTop: '2px dashed rgba(255,70,70,0.85)' }} />
                  <span style={{ color: 'rgba(255,110,110,1)', fontSize: '12px', whiteSpace: 'nowrap', fontWeight: 600 }}>{label}</span>
                  <div style={{ flex: 1, borderTop: '2px dashed rgba(255,70,70,0.85)' }} />
                </div>
              ))}
            </div>
          )}
          <div ref={footerRef} style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 10000, backgroundColor: 'rgba(12,10,9,0.75)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
            <p style={{ color: '#57534e', fontSize: '12px', textAlign: 'center', padding: '10px 0', letterSpacing: '0.05em' }}>
              ピンチでズーム・ドラッグで移動
            </p>
          </div>
        </div>
      )}

      {/* ── アップロード / プレビュー画面 ── */}
      {!showGuide && !rawImage && (
        preview ? (
          <>
            <div
              onClick={() => { if (!disabled) inputRef.current?.click(); }}
              style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', paddingTop: '16px', paddingBottom: '16px', borderRadius: '16px', border: '1.5px dashed #F9A8D4', backgroundColor: 'rgba(255,245,248,0.4)', cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1, userSelect: 'none', boxSizing: 'border-box' }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview} alt="プレビュー" style={{ width: '75%', height: 'auto', display: 'block', borderRadius: '12px', border: '1.5px solid #FCE7F3', boxShadow: '0 2px 12px rgba(236,72,153,0.08)' }} />
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity 0.2s', backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: '16px' }} onMouseEnter={e => (e.currentTarget.style.opacity = '1')} onMouseLeave={e => (e.currentTarget.style.opacity = '0')}>
                <span style={{ color: '#fff', fontSize: '14px', fontWeight: 300, letterSpacing: '0.1em' }}>タップして変更</span>
              </div>
            </div>
            <div style={{ textAlign: 'center', marginTop: '10px' }}>
              <button onClick={handleReset} style={{ background: 'none', border: 'none', color: '#F9A8D4', fontSize: '11px', cursor: 'pointer', letterSpacing: '0.05em', textDecoration: 'underline', padding: '4px 8px' }}>
                診断方法を変える
              </button>
            </div>
          </>
        ) : (
          <>
            <p style={{ fontSize: '12px', color: '#C084B4', textAlign: 'center', marginBottom: '14px', letterSpacing: '0.08em', marginTop: 0 }}>
              写真の種類を選んでください
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button disabled={disabled || processing} onClick={() => openFilePicker('precise')} style={{ flex: 1, position: 'relative', padding: '20px 14px 16px', borderRadius: '16px', border: '1.5px solid #F9A8D4', background: '#FFF0F5', cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1, textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '0', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: 'linear-gradient(to right, #F9A8D4, #EC4899)' }} />
                <span style={{ fontSize: '9px', letterSpacing: '0.2em', color: '#F9A8D4', marginBottom: '6px' }}>No. 01</span>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#BE185D', letterSpacing: '0.03em', marginBottom: '8px' }}>精密診断</span>
                <div style={{ height: '1px', background: 'linear-gradient(to right, #F9A8D4, transparent)', marginBottom: '8px' }} />
                <span style={{ fontSize: '10px', color: '#9D174D', lineHeight: 1.7 }}>全身正面・薄着で<br />足先まで撮影</span>
              </button>
              <button disabled={disabled || processing} onClick={() => openFilePicker('quick')} style={{ flex: 1, position: 'relative', padding: '20px 14px 16px', borderRadius: '16px', border: '1.5px solid #E9D5FF', background: '#FDF9FF', cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1, textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '0', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: 'linear-gradient(to right, #E9D5FF, #A855F7)' }} />
                <span style={{ fontSize: '9px', letterSpacing: '0.2em', color: '#C084FC', marginBottom: '6px' }}>No. 02</span>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#7E22CE', letterSpacing: '0.03em', marginBottom: '8px' }}>さくっと診断</span>
                <div style={{ height: '1px', background: 'linear-gradient(to right, #E9D5FF, transparent)', marginBottom: '8px' }} />
                <span style={{ fontSize: '10px', color: '#6B21A8', lineHeight: 1.7 }}>フォルダの写真を<br />そのまま診断</span>
              </button>
            </div>
            {processing && <p style={{ marginTop: '12px', fontSize: '12px', color: '#F9A8D4', textAlign: 'center' }}>処理中...</p>}
            <p style={{ marginTop: '12px', fontSize: '11px', color: '#F9A8D4', textAlign: 'center', lineHeight: 1.8, letterSpacing: '0.03em' }}>
              JPEG・PNG・WebP / 最大 10MB
            </p>
          </>
        )
      )}
    </div>
  );
}
