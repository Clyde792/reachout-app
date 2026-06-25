// Centralized Supabase REST auth. Returns headers that carry the logged-in
// worker's JWT (role: authenticated) when there's a session, falling back to the
// public anon key otherwise. This lets us turn on Row-Level Security with
// "authenticated only" policies without rewriting every screen — and without
// breaking anything while RLS is still off (both keys work then).
import { supabase } from '../supabase';

export const SUPABASE_URL = 'https://skkgaaijrslwclfednri.supabase.co';
export const SUPABASE_ANON = 'sb_publishable_W0zoIpw-xHqFBIV7Ss-tkQ_UBf4w-4c';

// Cache the access token synchronously so call sites don't each await getSession.
let cachedToken = SUPABASE_ANON;
supabase.auth.getSession().then(({ data }) => {
    if (data?.session?.access_token) cachedToken = data.session.access_token;
}, () => {});
supabase.auth.onAuthStateChange((_event, session) => {
    cachedToken = session?.access_token || SUPABASE_ANON;
});

// Build REST headers. Pass extra headers (Content-Type, Prefer) as needed.
export function dbHeaders(extra = {}) {
    return {
        apikey: SUPABASE_ANON,
        Authorization: `Bearer ${cachedToken}`,
        ...extra,
    };
}
