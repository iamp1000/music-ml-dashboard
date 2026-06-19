/**
 * Centralized API client helper that includes automatic JWT session injection
 * and custom rate-limiting event dispatching.
 */
export async function fetchWithRateLimit(url: string, options: RequestInit = {}): Promise<any> {
    const token = typeof window !== "undefined" ? localStorage.getItem("jwt") : null;
    const headers = {
        "Content-Type": "application/json",
        ...(options.headers || {}),
    } as Record<string, string>;

    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }

    const fetchOptions = {
        ...options,
        headers,
    };

    const response = await fetch(url, fetchOptions);

    // Detect Spotify Rate Limiting forwarded by our backend proxy
    if (response.status === 429) {
        const retryAfterHeader = response.headers.get("Retry-After");
        const retryAfter = retryAfterHeader ? parseInt(retryAfterHeader, 10) : 5;
        
        if (typeof window !== "undefined") {
            const event = new CustomEvent("spotify-rate-limit", { 
                detail: { retryAfter, message: `Spotify API Rate Limit reached. Cooling down for ${retryAfter}s.` } 
            });
            window.dispatchEvent(event);
        }
        
        throw new Error(`Rate limited: Please wait ${retryAfter} seconds.`);
    }

    if (!response.ok) {
        let errMsg = `HTTP Error ${response.status}`;
        try {
            const errBody = await response.json();
            if (errBody && errBody.detail) {
                errMsg = errBody.detail;
            }
        } catch {}
        throw new Error(errMsg);
    }

    // Try parsing JSON response
    try {
        return await response.json();
    } catch {
        return null;
    }
}
