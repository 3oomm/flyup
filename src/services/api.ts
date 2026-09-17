import axios from "axios";

const baseURL = import.meta.env.VITE_BASE_URL;

export const TOKEN_KEY = "auth_token";
export const REFRESH_KEY = "refresh_token";

export const getStoredToken = () => localStorage.getItem(TOKEN_KEY);
export const setStoredToken = (t: string) => localStorage.setItem(TOKEN_KEY, t);
export const getStoredRefresh = () => localStorage.getItem(REFRESH_KEY);
export const setStoredRefresh = (t: string) => localStorage.setItem(REFRESH_KEY, t);
export const clearStoredTokens = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
};

const instance = axios.create({
  baseURL: baseURL,
  withCredentials: true,
  timeout: 8000,
  headers: { "Content-Type": "application/json" },
});

// Request interceptor: ส่ง Authorization header จาก localStorage ถ้ามี
// (รองรับ incognito ที่ cookie ถูกบล็อก)
instance.interceptors.request.use((config) => {
  const token = getStoredToken();
  if (token) config.headers["Authorization"] = `Bearer ${token}`;
  return config;
});

let isRefreshing = false;
let refreshQueue: Array<(ok: boolean) => void> = [];

instance.interceptors.response.use(
  (res) => {
    const method = res.config.method?.toLowerCase();
    if (method && ["post", "put", "patch", "delete"].includes(method)) {
      window.dispatchEvent(new CustomEvent("badges:refresh"));
    }
    return res;
  },
  async (error) => {
    const original = error.config;
    const status = error.response?.status;

    const isAuthEntrypoint = original.url?.includes("/auth/refresh") ||
      original.url?.includes("/user/signout") ||
      original.url?.includes("/signin") ||
      original.url?.includes("/signup") ||
      original.url?.includes("/auth/google");

    if (status !== 401 || original._retry || isAuthEntrypoint) {
      return Promise.reject(error);
    }

    // ไม่มี token เก็บไว้เลย = ยังไม่เคย login มาก่อน ไม่ต้องพยายาม refresh/signout
    if (!getStoredToken() && !getStoredRefresh()) {
      return Promise.reject(error);
    }

    original._retry = true;

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        refreshQueue.push((ok) => ok ? resolve(instance(original)) : reject(error));
      });
    }

    isRefreshing = true;
    try {
      const refreshToken = getStoredRefresh();
      const res = await instance.post("/auth/refresh", null, {
        headers: refreshToken ? { "X-Refresh-Token": refreshToken } : {},
      });
      // อัปเดต localStorage ถ้า backend ส่ง token ใหม่มาด้วย
      const newToken: string | undefined = res.data?.token;
      if (newToken) setStoredToken(newToken);
      refreshQueue.forEach((cb) => cb(true));
      return instance(original);
    } catch {
      refreshQueue.forEach((cb) => cb(false));
      window.dispatchEvent(new Event("auth:logout"));
      return Promise.reject(error);
    } finally {
      isRefreshing = false;
      refreshQueue = [];
    }
  }
);

export default instance;
