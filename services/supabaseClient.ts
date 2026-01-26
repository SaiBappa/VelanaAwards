
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://pvvyboirjajvewsbadnl.supabase.co';
const supabaseKey = 'sb_publishable_kVcSKZocjMz7dunquIwOrQ_K-_mNoD3';

export const supabase = createClient(supabaseUrl, supabaseKey);
