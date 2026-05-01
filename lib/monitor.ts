// モニターモード管理
// 解除: NEXT_PUBLIC_MONITOR_MODE=false にするだけでゲートをスキップ

export const MONITOR_MODE = process.env.NEXT_PUBLIC_MONITOR_MODE === 'true';

const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generateCode(length = 6): string {
  let out = '';
  for (let i = 0; i < length; i++) out += CHARS[Math.floor(Math.random() * CHARS.length)];
  return out;
}

export interface MonitorSession {
  codeId: string;
  code: string;
  childInvites: number; // 診断後に発行できる招待数
}

export interface GeneratedInviteItem {
  id: string;
  code: string;
  childInvites: number;
}

export interface GeneratedInvites {
  type: 'invite' | 'url';
  items: GeneratedInviteItem[];
  generatedAt: number;
}

export function getSession(): MonitorSession | null {
  if (typeof window === 'undefined') return null;
  try { return JSON.parse(localStorage.getItem('monitorSession') ?? 'null'); } catch { return null; }
}

export function saveSession(s: MonitorSession): void {
  localStorage.setItem('monitorSession', JSON.stringify(s));
}

export function clearSession(): void {
  localStorage.removeItem('monitorSession');
}

export function getGeneratedInvites(): GeneratedInvites | null {
  if (typeof window === 'undefined') return null;
  try { return JSON.parse(localStorage.getItem('myGeneratedInvites') ?? 'null'); } catch { return null; }
}

export function saveGeneratedInvites(g: GeneratedInvites): void {
  localStorage.setItem('myGeneratedInvites', JSON.stringify(g));
}

export const MAX_DIAGNOSES = 2;

export function getDiagnosisCount(codeId: string): number {
  if (typeof window === 'undefined') return 0;
  try { return parseInt(localStorage.getItem(`diagCount_${codeId}`) ?? '0', 10); } catch { return 0; }
}

export function incrementDiagnosisCount(codeId: string): void {
  localStorage.setItem(`diagCount_${codeId}`, String(getDiagnosisCount(codeId) + 1));
}
