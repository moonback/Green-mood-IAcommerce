import { createClient } from '@supabase/supabase-client'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
)

async function test() {
  const { data, error } = await supabase.from('subscriptions').select('*').limit(1)
  console.log('Columns:', data ? Object.keys(data[0] || {}) : 'No data')
  if (error) console.error('Error:', error)
}

test()
