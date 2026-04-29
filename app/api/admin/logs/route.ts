import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

function checkAuth(req: NextRequest) {
  const adminKey = req.headers.get('x-admin-key');
  return adminKey === process.env.ADMIN_SECRET_KEY;
}

export async function GET(req: NextRequest) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = supabaseAdmin();
  const { data, error } = await db
    .from('diagnosis_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    return NextResponse.json({ error: 'DB error' }, { status: 500 });
  }

  // 画像パスがある行に署名付きURLを生成
  const logs = await Promise.all(
    (data ?? []).map(async (log) => {
      if (!log.image_url) return { ...log, signed_url: null };
      const { data: signed } = await db.storage
        .from('diagnosis-images')
        .createSignedUrl(log.image_url, 3600);
      return { ...log, signed_url: signed?.signedUrl ?? null };
    })
  );

  return NextResponse.json({ logs });
}

export async function PATCH(req: NextRequest) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id, admin_feedback } = await req.json();
  if (!id || !admin_feedback) {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }

  const db = supabaseAdmin();
  const { error } = await db
    .from('diagnosis_logs')
    .update({ admin_feedback })
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: 'DB error' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
