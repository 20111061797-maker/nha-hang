const isBrowser = typeof window !== "undefined";
const isLocalhost = isBrowser && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");

const defaultUrl = isBrowser && !isLocalhost
  ? "https://nha-hang-production.up.railway.app"
  : "http://localhost:8080";

export const config = {
  apiUrl: (process.env.NEXT_PUBLIC_API_URL && process.env.NEXT_PUBLIC_API_URL.trim() !== "" && !process.env.NEXT_PUBLIC_API_URL.includes("localhost"))
    ? process.env.NEXT_PUBLIC_API_URL
    : defaultUrl,
  signalRUrl: (process.env.NEXT_PUBLIC_SIGNALR_URL && process.env.NEXT_PUBLIC_SIGNALR_URL.trim() !== "" && !process.env.NEXT_PUBLIC_SIGNALR_URL.includes("localhost"))
    ? process.env.NEXT_PUBLIC_SIGNALR_URL
    : defaultUrl,
};