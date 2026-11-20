import { Login, Register } from "../types/auth.types";

export async function login(result: Login) {
    return fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(result),
});
}

export async function register(result: Register) {
    return fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(result),
      });
}

export async function logoutUser() {
  return fetch("/api/auth/logout", {
        method: "POST",
      });
}