import { NextResponse } from 'next/server'

import { requireAuth } from '@/lib/supabase/auth'
import { createSupabaseUserClient } from '@/lib/supabase/server'

export const POST = async (request: Request) => {
  try {
    const { accessToken } = await requireAuth(request)
    const userClient = createSupabaseUserClient(accessToken)

    const { error } = await userClient.auth.signOut()
    if (error) {
      return NextResponse.json({ error: 'LOGOUT_FAILED' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'UNKNOWN'
    const status = message === 'UNAUTHORIZED' ? 401 : message === 'INACTIVE' ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
