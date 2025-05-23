/**
 * Authentication utilities for client-side use
 */

// Store authentication token
export function storeAuthToken(token: string): void {
  // Store in sessionStorage
  sessionStorage.setItem("authHeader", token)

  // Also store in a cookie for middleware access
  document.cookie = `authToken=${encodeURIComponent(token)}; path=/; max-age=3600; SameSite=Lax`
}

// Check if user is authenticated
export function isAuthenticated(): boolean {
  return !!getAuthToken()
}

// Get the auth token
export function getAuthToken(): string | null {
  return sessionStorage.getItem("authHeader")
}

// Clear authentication
export function clearAuth(): void {
  sessionStorage.removeItem("authHeader")
  document.cookie = "authToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT"
}
