import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { generateCode } from '@/lib/monitor';

export async function POST(req: NextRequest) {
  const { parentCodeId, type } = await req.json();
  if (!parentCodeId || !type) return NextResponse.json({ error: 'Bad request' }, { status: 400 });

  const db = supabaseAdmin();

  const { data: parent } = await db
    .from('monitor_codes')
    .select('id, used_count, child_invites, is_active')
    .eq('id', parentCodeId)
    .single();

  if (!parent || !parent.is_active || parent.used_count === 0) {
    return NextResponse.json({ error: '診断が完了していないか無効なコードです' }, { status: 400 });
  }

  if (parent.child_invites === 0) {
    return NextResponse.json({ error: 'このコードに招待権限がありません' }, { status: 400 });
  }

  // 二重発行を防止 — 既存の子コードがあれば返す
  const { data: existing } = await db
    .from('monitor_codes')
    .select('id, code, child_invites, type')
    .eq('parent_id', parentCodeId);

  if (existing && existing.length > 0) {
    const existingType = existing[0].type as 'invite' | 'url';
    const items = existing.map(({ id, code, child_invites }) => ({ id, code, childInvites: child_invites }));
    return NextResponse.json({ type: existingType, items, alreadyGenerated: true });
  }

  const n = parent.child_invites;         // 発行数 or URLスロット数
  const childInvites = Math.max(0, n - 1); // 受け取った人が次に持てる招待数

  if (type === 'invite') {
    const rows = Array.from({ length: n }, () => ({
      code: generateCode(),
      type: 'invite' as const,
      max_uses: 1,
      child_invites: childInvites,
      parent_id: parentCodeId,
      created_by: 'user',
    }));

    const { data: inserted, error } = await db
      .from('monitor_codes')
      .insert(rows)
      .select('id, code, child_invites');

    if (error) return NextResponse.json({ error: 'DB error' }, { status: 500 });
    const inviteItems = inserted!.map(({ id, code, child_invites }) => ({ id, code, childInvites: child_invites }));
    return NextResponse.json({ type: 'invite', items: inviteItems });
  } else {
    const { data: inserted, error } = await db
      .from('monitor_codes')
      .insert({
        code: generateCode(),
        type: 'url' as const,
        max_uses: n,
        child_invites: childInvites,
        parent_id: parentCodeId,
        created_by: 'user',
      })
      .select('id, code, child_invites')
      .single();

    if (error) return NextResponse.json({ error: 'DB error' }, { status: 500 });
    const { id, code, child_invites } = inserted!;
    return NextResponse.json({ type: 'url', items: [{ id, code, childInvites: child_invites }] });
  }
}
