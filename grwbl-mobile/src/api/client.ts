// src/api/client.ts
import { API_BASE_URL } from "./config";

export type HttpMethod = "GET" | "POST";

export interface RequestOptions {
  headers?: Record<string, string>;
  query?: Record<string, string | number | boolean | undefined>;
}

function buildUrl(path: string, query?: RequestOptions["query"]): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  if (!query || Object.keys(query).length === 0) {
    return `${API_BASE_URL}${normalizedPath}`;
  }

  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      params.append(key, String(value));
    }
  });

  return `${API_BASE_URL}${normalizedPath}?${params.toString()}`;
}

type ApiResponse<T> = {
  ok: boolean;
  status: number;
  data?: T;
};

async function request<T>(
  method: HttpMethod,
  path: string,
  body?: unknown,
  options: RequestOptions = {},
): Promise<ApiResponse<T>> {
  const url = buildUrl(path, options.query);

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  const response = await fetch(url, {
    method,
    headers,
    body: method === "POST" && body != null ? JSON.stringify(body) : undefined,
  });

  if (response.status === 204) {
    return {
      ok: response.ok,
      status: response.status,
      data: undefined,
    };
  }

  let data: T | undefined;
  try {
    data = (await response.json()) as T;
  } catch {
    data = undefined;
  }

  return {
    ok: response.ok,
    status: response.status,
    data,
  };
}

export function get<T = unknown>(
  path: string,
  options?: RequestOptions,
): Promise<ApiResponse<T>> {
  return request<T>("GET", path, undefined, options);
}

export function post<T = unknown>(
  path: string,
  body: unknown,
  options?: RequestOptions,
): Promise<ApiResponse<T>> {
  return request<T>("POST", path, body, options);
}
