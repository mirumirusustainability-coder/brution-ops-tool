import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { createSupabaseAdmin } from '@/lib/supabase/server'

export const POST = async (request: Request) => {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get: (name) => cookieStore.get(name)?.value,
          set: () => {},
          remove: () => {},
        },
      }
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
    }

    const body = await request.json().catch(() => null)
    const newPassword = body?.newPassword

    if (!newPassword || typeof newPassword !== 'string') {
      return NextResponse.json({ error: 'INVALID_PASSWORD' }, { status: 400 })
    }

    const admin = createSupabaseAdmin()
    const { error: updateError } = await admin.auth.admin.updateUserById(user.id, {
      password: newPassword
    })

    if (updateError) {
      return NextResponse.json({ error: 'PASSWORD_UPDATE_FAILED' }, { status: 500 })
    }

    const { error: profileError } = await admin
      .from('profiles')
      .update({ must_change_password: false })
      .eq('user_id', user.id)

    if (profileError) {
      return NextResponse.json({ error: 'PROFILE_UPDATE_FAILED' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'UNKNOWN'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
