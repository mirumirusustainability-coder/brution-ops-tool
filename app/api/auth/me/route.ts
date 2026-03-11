import { NextResponse } from 'next/server'

import { getAuthContext } from '@/lib/supabase/auth'

export const GET = async (request: Request) => {
  const context = await getAuthContext(request)

  if (!context.user || !context.profile) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  }

  const { profile, user } = context

  return NextResponse.json({
    userId: user.id,
    email: profile.email,
    role: profile.role,
    companyId: profile.company_id,
    status: profile.status,
    mustChangePassword: profile.must_change_password
  })
}
