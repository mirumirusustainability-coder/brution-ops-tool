import { createSupabaseAdmin, createSupabaseUserClient, getAccessTokenFromRequest } from './server'

export type Profile = {
  user_id: string
  email: string
  name: string | null
  role: 'staff_admin' | 'staff_member' | 'client_admin' | 'client_member'
  company_id: string | null
  status: 'active' | 'inactive'
  must_change_password: boolean
}

export const getAuthContext = async (request: Request) => {
  const accessToken = getAccessTokenFromRequest(request)
  if (!accessToken) {
    return { accessToken: null, user: null, profile: null }
  }

  const userClient = createSupabaseUserClient(accessToken)
  const { data: userData, error: userError } = await userClient.auth.getUser()
  if (userError || !userData.user) {
    return { accessToken: null, user: null, profile: null }
  }

  const admin = createSupabaseAdmin()
  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select('user_id,email,name,role,company_id,status,must_change_password')
    .eq('user_id', userData.user.id)
    .single()

  if (profileError || !profile) {
    return { accessToken: null, user: null, profile: null }
  }

  return {
    accessToken,
    user: userData.user,
    profile: profile as Profile
  }
}

export const requireAuth = async (request: Request) => {
  const context = await getAuthContext(request)
  if (!context.profile || !context.user || !context.accessToken) {
    throw new Error('UNAUTHORIZED')
  }

  if (context.profile.status !== 'active') {
    throw new Error('INACTIVE')
  }

  return context
}

export const isStaff = (role: Profile['role']) => {
  return role === 'staff_admin' || role === 'staff_member'
}

export const isStaffAdmin = (role: Profile['role']) => {
  return role === 'staff_admin'
}
