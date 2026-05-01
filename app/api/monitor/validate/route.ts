import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  const { code } = await req.json();
  if (!code || typeof code !== 'string') {
    return NextResponse.json({ valid: false, error: '無効なコードです' }, { status: 400 });
  }

  const db = supabaseAdmin();
  const { data } = await db
    .from('monitor_codes')
    .select('id, type, max_uses, used_count, child_invites, is_active')
    .eq('code', code.toUpperCase().trim())
    .single();

  if (!data || !data.is_active) {
    return NextResponse.json({ valid: false, error: 'コードが見つかりません' });
  }

  if (data.used_count >= data.max_uses) {
    return NextResponse.json({
      valid: false,
      error: data.type === 'url'
        ? '定員に達したため、このURLからは診断できません'
        : 'このコードはすでに使用済みです',
    });
  }

  return NextResponse.json({
    valid: true,
    codeId: data.id,
    childInvites: data.child_invites,
    type: data.type,
  });
}
