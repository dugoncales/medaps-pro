import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const IS_DEMO = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '') === 'placeholder_url'

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (IS_DEMO) return NextResponse.next()

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  if (!user && !pathname.startsWith('/login')) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (user && pathname.startsWith('/login')) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    // Pula assets do Next, ícones, PWA (manifest/SW/offline) e arquivos estáticos
    // por extensão. Sem isso, o middleware redireciona /manifest.webmanifest para
    // /login quando não há sessão e o Chrome falha o parse com "Line 1, column 1".
    '/((?!_next/static|_next/image|favicon\\.ico|manifest\\.webmanifest|manifest\\.json|sw\\.js|offline\\.html|icons/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|json|webmanifest|txt)$).*)',
  ],
}
