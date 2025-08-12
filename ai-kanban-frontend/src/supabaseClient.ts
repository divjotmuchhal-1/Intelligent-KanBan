
import { createClient } from '@supabase/supabase-js'
const supabaseUrl = 'https://evfldavhtutivxlblbho.supabase.co' as string
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string
console.log(supabaseUrl)
console.log(supabaseKey)

const supabase = createClient(supabaseUrl, supabaseKey)

export default supabase;