import { getEnvValue } from "./env";

const apiBaseUrl = getEnvValue("VITE_API_BASE_URL", "API_BASE_URL") || "http://127.0.0.1:8000";

export async function analyzeDocument(file, userId, userEmail) {
  if (!apiBaseUrl) {
    throw new Error("Missing API base URL. Set VITE_API_BASE_URL in frontend .env");
  }

  const formData = new FormData();
  formData.append("file", file);
  if (userId) {
    formData.append("user_id", userId);
  }
  if (userEmail) {
    formData.append("user_email", userEmail);
  }

  const response = await fetch(`${apiBaseUrl}/analyze`, {
    method: "POST",
    body: formData
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    const detail = errorBody?.detail || "Failed to analyze document";
    throw new Error(`${detail} (HTTP ${response.status})`);
  }

  return response.json();
}
