import { post } from "./client";

export type AuthUser = {
  id: string;
  email: string;
};

export type AuthResponse = {
  token: string;
  user: AuthUser;
};

export type LoginRequestError = {
  status: number;
  errorType: "credentials" | "validation" | "server";
  errorMessage: string;
};

export async function loginRequest(email: string, password: string): Promise<AuthResponse> {
  const res = await post<AuthResponse>("/auth/login", {
    email,
    password,
  });

  const errorMessage =
    (res.data as any)?.error ||
    `Login failed with status ${res.status}`;

  if (!res.ok || !res.data) {
    throw {
      status: res.status,
      errorType: res.status === 400 || res.status === 401 ? "credentials" : "server",
      errorMessage,
    } as LoginRequestError;
  }

  return res.data;
}

export async function registerRequest(
  name: string,
  email: string,
  password: string
): Promise<AuthResponse> {
  const res = await post<AuthResponse>("/auth/register", {
    name,
    email,
    password,
  });

  const errorMessage =
    (res.data as any)?.error ||
    `Registration failed with status ${res.status}`;

  if (!res.ok || !res.data) {
    throw {
      status: res.status,
      errorType: res.status === 400 ? "validation" : "server",
      errorMessage,
    };
  }

  return res.data;
}
