export interface JsonResponse<T> {
  response: Response;
  data: T | null;
}

export async function requestJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<JsonResponse<T>> {
  const response = await fetch(input, init);
  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json") ? ((await response.json()) as T) : null;
  return { response, data };
}

export function isAuthenticationFailure(response: Response): boolean {
  return response.status === 401 || response.status === 403;
}
