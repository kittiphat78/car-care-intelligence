import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// สร้าง Client แบบ Browser (Client Component ใช้ตัวนี้)
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true, // ✅ บังคับให้จำการเข้าระบบไว้
    autoRefreshToken: true, // ✅ ให้ต่ออายุ Token อัตโนมัติ
    detectSessionInUrl: true,
  }
})