// types/index.ts

export type BodyType = 'straight' | 'wave' | 'natural';

export interface DiagnosisResult {
  bodyType: BodyType;
  confidence: 'high' | 'medium' | 'low';
  description: string;
  characteristics: string[];
  styleAdvice: string[];
  rawResponse?: string;
}

export interface DiagnosisLog {
  id: string;
  created_at: string;
  ip_address: string;
  image_url: string | null;
  result_type: BodyType;
  result_json: DiagnosisResult;
  model_used: string;
}

export interface ApiResponse<T = DiagnosisResult> {
  success: boolean;
  data?: T;
  error?: string;
  code?: 'DAILY_LIMIT' | 'RATE_LIMIT' | 'INVALID_IMAGE' | 'AI_ERROR' | 'SERVER_ERROR';
}
