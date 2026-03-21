import { NextResponse } from 'next/server'

import { isStaff, requireAuth } from '@/lib/supabase/auth'
import { createSupabaseAdmin } from '@/lib/supabase/server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { profile } = await requireAuth(request)
    const admin = createSupabaseAdmin()
    const { projectId } = await params

    const { data, error } = await admin
      .from('projects')
      .select('id, company_id, name, description, created_at, updated_at')
      .eq('id', projectId)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'PROJECT_NOT_FOUND' }, { status: 404 })
    }

    if (!isStaff(profile.role)) {
      if (!profile.company_id || data.company_id !== profile.company_id) {
        return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
      }
    }

    return NextResponse.json({ project: data })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'UNKNOWN'
    const status = message === 'UNAUTHORIZED' ? 401 : message === 'INACTIVE' ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
