/** Localização aproximada pela rede quando GPS falha ou está bloqueado. */
export async function fetchApproxLocation() {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await fetch('https://ipwho.is/', { signal: ctrl.signal, cache: 'no-store' });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data?.success) return null;
    const lat = data.latitude;
    const lng = data.longitude;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { lat, lng, city: data.city || null };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
