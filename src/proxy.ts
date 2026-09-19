import { clerkMiddleware } from '@clerk/nextjs/server';

// Sin cheques de auth por ruta aquí (createRouteMatcher está deprecado en
// Clerk): cada página/layout/Server Action que toca datos protegidos verifica
// `auth()` por sí misma (resource-based auth).
export default clerkMiddleware();

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
