import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { requireAuth, isStaff } from '@/lib/supabase/auth'
import { createSupabaseAdmin } from '@/lib/supabase/server'

export const maxDuration = 30

const MAX_TEXT = 4000

export type ChatMessage = {
  id: string
  sender_id: string
  sender_role: 'staff' | 'client'
  sender_name: string
  text: string
  created_at: string
}

type ChatReads = { staff?: string; client?: string }

const sideOf = (role: string): 'staff' | 'client' => (isStaff(role as any) ? 'staff' : 'client')

const authorize = async (request: Request, companyId: string) => {
  const { profile } = await requireAuth(request)
  const allowed = isStaff(profile.role) || profile.company_id === companyId
  if (!allowed) throw new Error('FORBIDDEN')
  return profile
}

export const GET = async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params
  let profile
  try {
    profile = await authorize(request, id)
  } catch (e) {
    const status = e instanceof Error && e.message === 'FORBIDDEN' ? 403 : 401
    return NextResponse.json({ error: e instanceof Error ? e.message : 'UNAUTHORIZED' }, { status })
  }

  const admin = createSupabaseAdmin()
  const { data: company, error } = await admin
    .from('companies')
    .select('metadata')
    .eq('id', id)
    .single()

  if (error || !company) {
    return NextResponse.json({ error: 'COMPANY_NOT_FOUND' }, { status: 404 })
  }

  const meta = (company.metadata ?? {}) as Record<string, any>
  const messages: ChatMessage[] = Array.isArray(meta.chat) ? meta.chat : []
  const reads: ChatReads = meta.chat_reads ?? {}

  const side = sideOf(profile.role)
  const lastRead = reads[side]
  const unread = messages.filter(
    (m) => m.sender_role !== side && (!lastRead || m.created_at > lastRead)
  ).length

  // 열람 시점 갱신 (caller 측 읽음 처리)
  const now = new Date().toISOString()
  if (messages.length > 0) {
    await admin
      .from('companies')
      .update({ metadata: { ...meta, chat_reads: { ...reads, [side]: now } } })
      .eq('id', id)
  }

  return NextResponse.json({ messages, unreadBefore: unread, side })
}

export const POST = async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params
  let profile
  try {
    profile = await authorize(request, id)
  } catch (e) {
    const status = e instanceof Error && e.message === 'FORBIDDEN' ? 403 : 401
    return NextResponse.json({ error: e instanceof Error ? e.message : 'UNAUTHORIZED' }, { status })
  }

  let body: { text?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400 })
  }

  const text = body.text?.trim()
  if (!text) {
    return NextResponse.json({ error: '메시지를 입력해주세요.' }, { status: 400 })
  }
  if (text.length > MAX_TEXT) {
    return NextResponse.json({ error: '메시지가 너무 깁니다.' }, { status: 400 })
  }

  const admin = createSupabaseAdmin()
  const { data: company, error } = await admin
    .from('companies')
    .select('metadata')
    .eq('id', id)
    .single()

  if (error || !company) {
    return NextResponse.json({ error: 'COMPANY_NOT_FOUND' }, { status: 404 })
  }

  const meta = (company.metadata ?? {}) as Record<string, any>
  const messages: ChatMessage[] = Array.isArray(meta.chat) ? meta.chat : []
  const side = sideOf(profile.role)
  const now = new Date().toISOString()

  const message: ChatMessage = {
    id: crypto.randomUUID(),
    sender_id: profile.user_id,
    sender_role: side,
    sender_name: profile.name ?? profile.email ?? (side === 'staff' ? '브루션' : '고객사'),
    text,
    created_at: now,
  }

  const nextMessages = [...messages, message]
  const reads: ChatReads = { ...(meta.chat_reads ?? {}), [side]: now }

  const { error: updateError } = await admin
    .from('companies')
    .update({ metadata: { ...meta, chat: nextMessages, chat_reads: reads } })
    .eq('id', id)

  if (updateError) {
    return NextResponse.json({ error: '메시지 전송에 실패했습니다.' }, { status: 500 })
  }

  return NextResponse.json({ message })
}
