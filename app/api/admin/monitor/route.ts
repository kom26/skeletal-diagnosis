import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { generateCode } from '@/lib/monitor';

function checkAuth(req: NextRequest) {
  return req.headers.get('x-admin-key') === process.env.ADMIN_SECRET_KEY;
}

// 発行
export async function POST(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { type, childInvites, maxUses, quantity } = await req.json();
  if (childInvites === undefined || !type) {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }

  const db = supabaseAdmin();

  if (type === 'invite') {
    const qty = Math.min(Math.max(1, quantity ?? 1), 50);
    const rows = Array.from({ length: qty }, () => ({
      code: generateCode(),
      type: 'invite' as const,
      max_uses: 1,
      child_invites: childInvites,
      created_by: 'admin',
    }));
    const { data, error } = await db.from('monitor_codes').insert(rows).select('id, code, child_invites, created_at');
    if (error) return NextResponse.json({ error: 'DB error' }, { status: 500 });
    return NextResponse.json({ items: data });
  } else {
    const uses = Math.max(1, maxUses ?? 3);
    const { data, error } = await db
      .from('monitor_codes')
      .insert({
        code: generateCode(),
        type: 'url' as const,
        max_uses: uses,
        child_invites: childInvites,
        created_by: 'admin',
      })
      .select('id, code, child_invites, created_at')
      .single();
    if (error) return NextResponse.json({ error: 'DB error' }, { status: 500 });
    return NextResponse.json({ items: [data] });
  }
}

// 一覧取得
export async function GET(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = supabaseAdmin();
  const { data } = await db
    .from('monitor_codes')
    .select('id, code, type, max_uses, used_count, child_invites, is_active, created_by, created_at')
    .order('created_at', { ascending: false })
    .limit(200);

  return NextResponse.json({ items: data ?? [] });
}
