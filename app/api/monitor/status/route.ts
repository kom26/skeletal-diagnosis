import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  const ids = req.nextUrl.searchParams.get('ids')?.split(',').filter(Boolean) ?? [];
  if (ids.length === 0) return NextResponse.json({ items: [] });

  const db = supabaseAdmin();
  const { data } = await db
    .from('monitor_codes')
    .select('id, used_count, max_uses, is_active')
    .in('id', ids);

  return NextResponse.json({ items: data ?? [] });
}
