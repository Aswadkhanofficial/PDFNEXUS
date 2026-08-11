// PDFNexus: admin-reset-password
// Admin-only. Verifies the caller's JWT + admin_roles membership, then uses
// the SERVICE ROLE (platform env, never shipped to the client) to mint a
// one-time temp password and arm the forced-reset wall for the target user.
import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

const randomByte = () => crypto.getRandomValues(new Uint8Array(1))[0];

// 12 chars, guaranteed 1+ from every class — crypto-secure, never logged.
const generateTempPassword = () => {
  const pools = ['ABCDEFGHJKLMNPQRSTUVWXYZ', 'abcdefghjkmnpqrstuvwxyz', '0123456789', '!@#$%^&*'];
  const all = pools.join('');
  const required = pools.map((pool) => pool[randomByte() % pool.length]);
  const rest = Array.from({ length: 8 }, () => all[randomByte() % all.length]);
  const full = [...required, ...rest];
  for (let i = full.length - 1; i > 0; i--) {
    const j = randomByte() % (i + 1);
    [full[i], full[j]] = [full[j], full[i]];
  }
  return full.join('');
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return json({ error: 'Missing authorization header' }, 401);

  const { user_id: targetUserId } = await req.json().catch(() => ({}));
  if (typeof targetUserId !== 'string' || !UUID_RE.test(targetUserId)) {
    return json({ error: 'Invalid user_id' }, 400);
  }

  // Verify the caller's JWT server-side (anon client, session token).
  const caller = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const {
    data: { user: admin },
    error: authError,
  } = await caller.auth.getUser();
  if (authError || !admin) return json({ error: 'Unauthorized' }, 401);

  // Privileged work only through the service client; RLS never applies here.
  const svc = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: role } = await svc
    .from('admin_roles')
    .select('role_type')
    .eq('user_id', admin.id)
    .maybeSingle();
  if (!role) return json({ error: 'Forbidden: not an admin' }, 403);

  const { data: target } = await svc.auth.admin.getUserById(targetUserId);
  if (!target?.user) return json({ error: 'Target user not found' }, 404);

  const tempPassword = generateTempPassword();
  const { error: updateError } = await svc.auth.admin.updateUserById(targetUserId, {
    password: tempPassword,
  });
  if (updateError) return json({ error: updateError.message }, 500);

  const { error: flagError } = await svc
    .from('profiles')
    .upsert(
      { id: targetUserId, email: target.user.email ?? null, requires_password_reset: true },
      { onConflict: 'id' },
    );
  if (flagError) return json({ error: flagError.message }, 500);

  return json({ temp_password: tempPassword });
});