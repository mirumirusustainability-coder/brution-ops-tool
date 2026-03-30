import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

import { isStaffAdmin } from '@/lib/supabase/auth'
import { createSupabaseAdmin } from '@/lib/supabase/server'

const getProfile = async () => {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name) => cookieStore.get(name)?.value,
        set: (name, value, options) => {
          try {
            cookieStore.set({ name, value, ...options })
          } catch {}
        },
        remove: (name, options) => {
          try {
            cookieStore.set({ name, value: '', ...options, maxAge: 0 })
          } catch {}
        },
      },
    }
  )

  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) {
    throw new Error('UNAUTHORIZED')
  }

  const admin = createSupabaseAdmin()
  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select('user_id, email, name, role, company_id, status, must_change_password')
    .eq('user_id', user.id)
    .single()

  if (profileError || !profile) {
    throw new Error('UNAUTHORIZED')
  }

  if (profile.status !== 'active') {
    throw new Error('INACTIVE')
  }

  return profile
}

export const DELETE = async (
  _request: Request,
  { params }: { params: Promise<{ assetId: string }> }
) => {
  try {
    const profile = await getProfile()
    if (!isStaffAdmin(profile.role)) {
      return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
    }

    const { assetId } = await params
    const admin = createSupabaseAdmin()

    const { data: asset, error: assetError } = await admin
      .from('assets')
      .select('id, path, bucket')
      .eq('id', assetId)
      .single()

    if (assetError || !asset) {
      return NextResponse.json({ error: 'ASSET_NOT_FOUND' }, { status: 404 })
    }

    const { error: storageError } = await admin.storage
      .from(asset.bucket)
      .remove([asset.path])

    if (storageError) {
      return NextResponse.json({ error: 'ASSET_STORAGE_DELETE_FAILED' }, { status: 500 })
    }

    const { error: deleteError } = await admin
      .from('assets')
      .delete()
      .eq('id', assetId)

    if (deleteError) {
      return NextResponse.json({ error: 'ASSET_DELETE_FAILED' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'UNKNOWN'
    const status = message === 'UNAUTHORIZED' ? 401 : message === 'INACTIVE' ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
