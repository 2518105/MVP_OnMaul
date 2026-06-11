const BACKEND_URL =
  import.meta.env.VITE_API_BASE_URL ?? "https://onmaeul.onrender.com";

export function resolveImageUrl(url) {
  if (!url) return null;
  return url.startsWith("http") ? url : `${BACKEND_URL}${url}`;
}
