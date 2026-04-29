// lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

// ブラウザ側（anon キー使用 - RLS で保護）
export const supabaseClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// サーバー側専用（service_role キー - Route Handler 内でのみ使用）
export const supabaseAdmin = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { persistSession: false },
    }
  );
