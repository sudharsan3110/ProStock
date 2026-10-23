/**
 * API Gateway Client
 * 
 * Bridges frontend UI to either local mock JSON endpoints or live .NET Core Backend endpoints.
 * Setting `USE_MOCK_DATA = false` directs requests to the C# Web API endpoints.
 */

export const USE_MOCK_DATA = false;
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';

/**
 * @param mockFallbackFile Static JSON in public/data served when the backend is unreachable.
 *   Pass null for live-only data (feed health, streaming quotes) where a canned response
 *   would misrepresent the system as healthy.
 */
export async function apiFetch<T>(endpoint: string, mockFallbackFile: string | null): Promise<T> {
  if (USE_MOCK_DATA) {
    if (mockFallbackFile === null) {
      throw new Error(`No mock data for live-only endpoint: ${endpoint}`);
    }
    // Read directly from public/data JSON files in mock mode
    const res = await fetch(`/data/${mockFallbackFile}`);
    if (!res.ok) {
      throw new Error(`Failed to load mock data for: ${mockFallbackFile}`);
    }
    return res.json() as Promise<T>;
  }

  // Live Backend API call with auto-attached JWT Bearer token
  try {
    const token = typeof window !== 'undefined' ? localStorage.getItem('prostock_token') : null;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(`${API_BASE_URL}/${endpoint}`, {
      headers
    });

    if (!res.ok) {
      throw new Error(`API error ${res.status}: ${res.statusText}`);
    }

    return await res.json() as T;
  } catch (err) {
    if (mockFallbackFile === null) throw err;
    console.warn(`[ProStock API] Live endpoint ${endpoint} unavailable, falling back to mock file:`, err);
    // Graceful fallback to static JSON if server is restarting or endpoint is in transition
    const fallbackRes = await fetch(`/data/${mockFallbackFile}`);
    if (fallbackRes.ok) {
      return fallbackRes.json() as Promise<T>;
    }
    throw err;
  }
}
