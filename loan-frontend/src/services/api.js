import axios from "axios";
import {
  getAccessToken,
  getRefreshToken,
  saveTokens,
  clearTokens,
} from "./auth";

export const BASE_URL =
  import.meta.env.VITE_API_BASE?.replace(/\/+$/, "") || "http://localhost:8000";

export const API = axios.create({
  baseURL: `${BASE_URL}/api/`,
  timeout: 20000,
});

// Attach token on every request
API.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers = {
      ...(config.headers || {}),
      Authorization: `Bearer ${token}`,
    };
  }
  return config;
});

// Auto-refresh on 401 (once)
let isRefreshing = false;
let pendingQueue = [];

function flushQueue(error, token = null) {
  pendingQueue.forEach((p) => {
    if (error) p.reject(error);
    else p.resolve(token);
  });
  pendingQueue = [];
}

API.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config || {};
    const status = error?.response?.status;

    // if unauthorized, try refresh once
    if (status === 401 && !original._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          pendingQueue.push({ resolve, reject });
        })
          .then((token) => {
            original.headers = {
              ...(original.headers || {}),
              Authorization: `Bearer ${token}`,
            };
            return API(original);
          })
          .catch((err) => Promise.reject(err));
      }

      original._retry = true;
      isRefreshing = true;

      try {
        const refresh = getRefreshToken();
        if (!refresh) throw new Error("No refresh token");

        const { data } = await axios.post(`${BASE_URL}/api/auth/token/refresh/`, {
          refresh,
        });

        saveTokens({ access: data?.access, refresh });
        flushQueue(null, data?.access);
        isRefreshing = false;

        original.headers = {
          ...(original.headers || {}),
          Authorization: `Bearer ${data?.access}`,
        };
        return API(original);
      } catch (err) {
        isRefreshing = false;
        flushQueue(err, null);
        clearTokens();
        // Hard redirect to login
        location.assign("/login");
        return Promise.reject(err);
      }
    }

    return Promise.reject(error);
  }
);

/* -------------------
   Auth endpoints
-------------------- */
export const Auth = {
  async login({ username, password }) {
    const { data } = await axios.post(`${BASE_URL}/api/auth/token/`, {
      username,
      password,
    });
    return data; // { access, refresh }
  },
  async me() {
    const { data } = await API.get("me/");
    return data;
  },
};

/* -------------------
   Customers API
-------------------- */
export const CustomersAPI = {
  async list() {
    const { data } = await API.get("customers/");
    return data;
  },
  async create(payload) {
    const { data } = await API.post("customers/", payload);
    return data;
  },
};

/* -------------------
   Loans API
-------------------- */
export const LoansAPI = {
  async list() {
    const { data } = await API.get("loans/");
    return data;
  },
  async summary(loanId) {
    const { data } = await API.get(`loans/${loanId}/summary/`);
    return data;
  },
};

/* -------------------
   Payments API
-------------------- */
export const PaymentsAPI = {
  async list() {
    const { data } = await API.get("payments/");
    return data;
  },
};

/* -------------------
   AI helper (optional) 
-------------------- */
export const AI = {
  async query(question) {
    const { data } = await API.post("ai/query/", { question });
    return data;
  },
};

// keep default export for legacy imports like `import API from ...`
export default API;