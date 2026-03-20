import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const GET = async (request: Request) => {
  const authHeader = request.headers.get('Authorization')
  const token = authHeader?.replace('Bearer ', '')

  if (!token) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: { user }, error: userError } = await supabase.auth.getUser(token)
  if (userError || !user) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (profileError || !profile) {
    return NextResponse.json({ error: 'PROFILE_NOT_FOUND' }, { status: 404 })
  }

  if (profile.status !== 'active') {
    return NextResponse.json({ error: 'INACTIVE' }, { status: 403 })
  }

  return NextResponse.json({
    id: user.id,
    email: user.email,
    name: profile.name,
    role: profile.role,
    companyId: profile.company_id,
    mustChangePassword: profile.must_change_password,
  })
}
