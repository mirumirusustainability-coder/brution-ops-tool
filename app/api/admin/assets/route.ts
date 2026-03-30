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

export const POST = async (request: Request) => {
  try {
    const profile = await getProfile()
    if (!isStaffAdmin(profile.role)) {
      return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
    }

    const formData = await request.formData()
    const file = formData.get('file')
    const deliverableVersionId = formData.get('deliverableVersionId') as string
    const projectId = formData.get('projectId') as string
    const companyId = formData.get('companyId') as string

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'INVALID_FILE' }, { status: 400 })
    }

    if (!deliverableVersionId || !projectId || !companyId) {
      return NextResponse.json({ error: 'INVALID_METADATA' }, { status: 400 })
    }

    const fileId = crypto.randomUUID()
    const ext = file.name.split('.').pop() ?? 'bin'
    const safeName = `${fileId}.${ext}`
    const path = `${companyId}/${projectId}/${deliverableVersionId}/${safeName}`

    const admin = createSupabaseAdmin()
    const { error: uploadError } = await admin.storage
      .from('deliverables')
      .upload(path, file, { contentType: file.type, upsert: false })

    if (uploadError) {
      return NextResponse.json({ error: 'UPLOAD_FAILED', detail: uploadError.message }, { status: 500 })
    }

    const assetId = crypto.randomUUID()
    const { data, error: insertError } = await admin
      .from('assets')
      .insert({
        id: assetId,
        project_id: projectId,
        company_id: companyId,
        deliverable_version_id: deliverableVersionId,
        file_type: file.type,
        bucket: 'deliverables',
        path,
        original_name: file.name,
        created_by: profile.user_id,
      })
      .select('id, deliverable_version_id, path, original_name, created_at')
      .single()

    if (insertError || !data) {
      return NextResponse.json({ error: 'ASSET_INSERT_FAILED', detail: insertError?.message }, { status: 500 })
    }

    return NextResponse.json({ asset: data })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'UNKNOWN'
    const status = message === 'UNAUTHORIZED' ? 401 : message === 'INACTIVE' ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
