export async function apiFetch(input: RequestInfo | URL, init?: RequestInit) {
  return fetch(input, {
    cache: "no-store",
    ...init
  });
}

export async function getJson<T>(input: RequestInfo | URL, fallbackMessage: string): Promise<T> {
  const response = await apiFetch(input);

  if (!response.ok) {
    throw new Error(`${fallbackMessage} failed with ${response.status}`);
  }

  return (await response.json()) as T;
}

async function readResponseErrorMessage(response: Response, fallbackMessage: string) {
  // Reads the body from the original fetch Response; this does not make another request.
  const payload = (await response.json().catch(() => null)) as { error?: string } | null;
  return payload?.error ?? `${fallbackMessage} failed with ${response.status}`;
}

export async function sendJson(input: RequestInfo | URL, method: "POST" | "PATCH", body: unknown, fallbackMessage: string) {
  const response = await apiFetch(input, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    throw new Error(await readResponseErrorMessage(response, fallbackMessage));
  }

  return response;
}

export async function sendJsonForResult<T>(
  input: RequestInfo | URL,
  method: "POST" | "PATCH",
  body: unknown,
  fallbackMessage: string
) {
  const response = await sendJson(input, method, body, fallbackMessage);
  return (await response.json()) as T;
}

export async function sendEmpty(input: RequestInfo | URL, method: "POST" | "DELETE", fallbackMessage: string) {
  const response = await apiFetch(input, { method });

  if (!response.ok) {
    throw new Error(await readResponseErrorMessage(response, fallbackMessage));
  }

  return response;
}
