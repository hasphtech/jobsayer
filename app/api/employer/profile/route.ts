/**
 * /api/employer/profile
 *
 * GET  — fetch current user's employer profile
 * POST — create / update employer profile (upsert)
 *
 * Body (POST): { company_name, website?, phone?, gstin? }
 *
 * DB table (run once in Supabase SQL editor):
 *   create table employer_profiles (
 *     id           uuid primary key default gen_random_uuid(),
 *     user_id      uuid not null references auth.users(id) on delete cascade,
 *     company_name text not null,
 *     website      text,
 *     phone        text,
 *     gstin        text,
 *     plan         text not null default 'free',  -- free | growth | scale
 *     created_at   timestamptz default now(),
 *     updated_at   timestamptz default now()
 *   );
 *   alter table employer_profiles enable row level security;
 *   create policy "Employers manage own profile" on employer_profiles
 *     for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
 *   create unique index on employer_profiles(user_id);
 */
import { NextRequest, NextResponse } from "next/server";
import { createServerClient }        from "@supabase/ssr";
import { cookies }                   from "next/headers";

async function getSupabase(req?: NextRequest) {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (toSet) => toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)),
      },
    }
  );
}

export async function GET() {
  const sb = await getSupabase();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await sb
    .from("employer_profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ profile: data });
}

export async function POST(req: NextRequest) {
  const sb = await getSupabase(req);
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: Record<string, string>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const { company_name, website, phone, gstin } = body;
  if (!company_name?.trim()) return NextResponse.json({ error: "company_name is required" }, { status: 400 });

  const { data, error } = await sb
    .from("employer_profiles")
    .upsert({
      user_id: user.id,
      company_name: company_name.trim(),
      website:  website?.trim()  || null,
      phone:    phone?.trim()    || null,
      gstin:    gstin?.trim()    || null,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ profile: data });
}
