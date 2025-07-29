import { NextResponse } from 'next/server'
import { getToken } from '@supabase/auth-helpers-nextjs'

export async function middleware(req) {
  const url = req.nextUrl.clone()
  // Si on cible un chemin interne…
  if (url.pathname.startsWith('/dashboard')) {
    const token = await getToken({ req, cookieName: 'sb-access-token' })
    const role = token?.user?.role
    if (role !== 'manager') {
      url.pathname = '/unauthorized'
      return NextResponse.redirect(url)
    }
  }
  return NextResponse.next()
}
