'use client';

interface Props {
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
}

export default function DiagnosisButton({ onClick, disabled, loading }: Props) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        marginTop: '20px',
        width: '100%',
        padding: '15px',
        borderRadius: '50px',
        border: 'none',
        background: disabled
          ? '#FCE7F3'
          : 'linear-gradient(135deg, #F9A8D4 0%, #EC4899 50%, #BE185D 100%)',
        color: disabled ? '#F9A8D4' : '#FFFFFF',
        fontSize: '14px',
        fontWeight: 300,
        letterSpacing: '0.25em',
        cursor: disabled ? 'not-allowed' : 'pointer',
        boxShadow: disabled ? 'none' : '0 4px 18px rgba(190,24,93,0.28)',
        transition: 'all 0.3s',
      }}
    >
      {loading ? (
        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
          <span style={{ width: '15px', height: '15px', border: '1.5px solid rgba(255,255,255,0.35)', borderTop: '1.5px solid white', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.9s linear infinite' }} />
          分析しています…
        </span>
      ) : (
        '診断する ♡'
      )}
    </button>
  );
}
