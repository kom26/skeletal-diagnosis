// types/index.ts

export type BodyType = 'straight' | 'wave' | 'natural';

export interface BodyInfo {
  age?: number;
  height?: number;
  weight?: number;
  cup?: string;
}


export interface DiagnosisResult {
  bodyType: BodyType;
  confidence: 'high' | 'medium' | 'low'; // 画像の診断適性（薄着・正面→high）
  scores: { straight: number; wave: number; natural: number };
  description: string;
  observations: string[];
  characteristics: string[];
  styleAdvice: string[];
  confidenceTips?: string[];
  rawResponse?: string;
}

export interface DiagnosisErrorLog {
  error: string;
  code: string;
}

export interface DiagnosisLog {
  id: string;
  created_at: string;
  ip_address: string;
  image_url: string | null;
  result_type: BodyType | 'error';
  result_json: DiagnosisResult | DiagnosisErrorLog | null;
  model_used: string;
  admin_feedback: string | null;
  body_info?: BodyInfo | null;
}

export interface ApiResponse<T = DiagnosisResult> {
  success: boolean;
  data?: T;
  error?: string;
  code?: 'DAILY_LIMIT' | 'RATE_LIMIT' | 'INVALID_IMAGE' | 'AI_ERROR' | 'SERVER_ERROR';
}
