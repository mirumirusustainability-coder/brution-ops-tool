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
          set: (name, value, options) => {
            cookieStore.set({ name, value, ...options })
          },
          remove: (name, options) => {
            cookieStore.set({ name, value: '', ...options, maxAge: 0 })
          },
        },
      }
    )

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file')
    const deliverableVersionId = formData.get('deliverableVersionId')
    const projectId = formData.get('projectId')
    const companyId = formData.get('companyId')

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'INVALID_FILE' }, { status: 400 })
    }

    if (!deliverableVersionId || !projectId || !companyId) {
      return NextResponse.json({ error: 'INVALID_METADATA' }, { status: 400 })
    }

    const fileId = crypto.randomUUID()
    const safeName = file.name || 'upload'
    const path = `${companyId}/${projectId}/${deliverableVersionId}/${fileId}-${safeName}`

    const admin = createSupabaseAdmin()
    const { error: uploadError } = await admin.storage
      .from('deliverables')
      .upload(path, file, { contentType: file.type, upsert: false })

    if (uploadError) {
      return NextResponse.json({ error: 'UPLOAD_FAILED' }, { status: 500 })
    }

    const assetId = crypto.randomUUID()
    const { error: insertError } = await admin
      .from('assets')
      .insert({
        id: assetId,
        project_id: projectId,
        company_id: companyId,
        deliverable_version_id: deliverableVersionId,
        file_type: file.type,
        bucket: 'deliverables',
        path,
        created_by: user.id,
      })

    if (insertError) {
      return NextResponse.json({ error: 'ASSET_INSERT_FAILED' }, { status: 500 })
    }

    return NextResponse.json({ assetId, path })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'UNKNOWN'
    const status = message === 'UNAUTHORIZED' ? 401 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
