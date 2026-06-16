import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://skkgaaijrslwclfednri.supabase.co';
const SUPABASE_KEY = 'sb_publishable_W0zoIpw-xHqFBIV7Ss-tkQ_UBf4w-4c';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);