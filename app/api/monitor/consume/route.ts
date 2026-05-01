import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  const { codeId } = await req.json();
  if (!codeId) return NextResponse.json({ ok: false }, { status: 400 });

  const db = supabaseAdmin();
  const { data } = await db
    .from('monitor_codes')
    .select('used_count, max_uses')
    .eq('id', codeId)
    .single();

  if (!data || data.used_count >= data.max_uses) {
    return NextResponse.json({ ok: false, error: 'Already consumed' }, { status: 409 });
  }

  await db
    .from('monitor_codes')
    .update({ used_count: data.used_count + 1 })
    .eq('id', codeId);

  return NextResponse.json({ ok: true });
}
