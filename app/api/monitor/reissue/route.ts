import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { generateCode } from '@/lib/monitor';

export async function POST(req: NextRequest) {
  const { codeId } = await req.json();
  if (!codeId) return NextResponse.json({ error: 'Bad request' }, { status: 400 });

  const db = supabaseAdmin();
  const { data: old } = await db
    .from('monitor_codes')
    .select('id, type, max_uses, child_invites, parent_id, used_count')
    .eq('id', codeId)
    .single();

  if (!old) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (old.used_count > 0) return NextResponse.json({ error: 'Already used' }, { status: 409 });

  // 旧コードを無効化
  await db.from('monitor_codes').update({ is_active: false }).eq('id', codeId);

  // 新コードを発行（同じ条件）
  const { data: newItem, error } = await db
    .from('monitor_codes')
    .insert({
      code: generateCode(),
      type: old.type,
      max_uses: old.max_uses,
      child_invites: old.child_invites,
      parent_id: old.parent_id,
      created_by: 'user',
    })
    .select('id, code, child_invites')
    .single();

  if (error) return NextResponse.json({ error: 'DB error' }, { status: 500 });
  return NextResponse.json({ item: newItem });
}
