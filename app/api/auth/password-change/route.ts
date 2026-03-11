import { NextResponse } from 'next/server'

import { requireAuth } from '@/lib/supabase/auth'
import { createSupabaseAdmin } from '@/lib/supabase/server'

export const POST = async (request: Request) => {
  try {
    const { user, profile } = await requireAuth(request)
    const body = await request.json().catch(() => null)
    const newPassword = body?.newPassword

    if (!newPassword || typeof newPassword !== 'string') {
      return NextResponse.json({ error: 'INVALID_PASSWORD' }, { status: 400 })
    }

    const admin = createSupabaseAdmin()
    const { error: authError } = await admin.auth.admin.updateUserById(user.id, {
      password: newPassword
    })

    if (authError) {
      return NextResponse.json({ error: 'PASSWORD_UPDATE_FAILED' }, { status: 500 })
    }

    const { error: profileError } = await admin
      .from('profiles')
      .update({ must_change_password: false })
      .eq('user_id', profile.user_id)

    if (profileError) {
      return NextResponse.json({ error: 'PROFILE_UPDATE_FAILED' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'UNKNOWN'
    const status = message === 'UNAUTHORIZED' ? 401 : message === 'INACTIVE' ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
