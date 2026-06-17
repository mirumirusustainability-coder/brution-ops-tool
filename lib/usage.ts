import type { SupabaseClient } from '@supabase/supabase-js'
import type { ExportTool } from '@/lib/tool-export'

// AI 도구별 1회 산출물 생성 시 기록할 추정 비용(원). 실제 Claude 비용 근사치.
export const TOOL_USAGE_COST_KRW: Record<ExportTool, number> = {
  keyword: 500,
  ads: 300,
  naming: 400,
  'naming-excel': 500,
  naver: 200,
}

const currentYm = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

/**
 * 고객사의 당월 사용량(usage_monthly)을 누적한다. (executions + 추정비용)
 * best-effort — 실패해도 본 작업을 막지 않는다.
 */
export const incrementUsage = async (
  admin: SupabaseClient,
  companyId: string,
  opts: { executions?: number; costKrw?: number } = {}
) => {
  const executions = opts.executions ?? 1
  const costKrw = opts.costKrw ?? 0
  const ym = currentYm()

  try {
    const { data: existing } = await admin
      .from('usage_monthly')
      .select('id, executions, est_cost_krw')
      .eq('company_id', companyId)
      .eq('ym', ym)
      .maybeSingle()

    if (existing) {
      await admin
        .from('usage_monthly')
        .update({
          executions: (existing.executions ?? 0) + executions,
          est_cost_krw: (existing.est_cost_krw ?? 0) + costKrw,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
    } else {
      await admin
        .from('usage_monthly')
        .insert({ company_id: companyId, ym, executions, est_cost_krw: costKrw })
    }
  } catch (e) {
    console.error('incrementUsage failed:', e)
  }
}

/** 고객사의 당월 사용량을 조회한다. */
export const getCurrentUsage = async (admin: SupabaseClient, companyId: string) => {
  const ym = currentYm()
  const { data } = await admin
    .from('usage_monthly')
    .select('executions, est_cost_krw')
    .eq('company_id', companyId)
    .eq('ym', ym)
    .maybeSingle()
  return {
    ym,
    executions: data?.executions ?? 0,
    estCostKrw: data?.est_cost_krw ?? 0,
  }
}
