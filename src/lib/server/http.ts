import "server-only";
import { z } from "zod";

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export async function readJson<T>(req: Request, schema: z.ZodType<T>): Promise<T> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) throw new HttpError(400, "Requête invalide.");
  return parsed.data;
}

/** Enveloppe une route : convertit les erreurs en réponses JSON propres. */
export function route<Args extends unknown[]>(fn: (...args: Args) => Promise<unknown>) {
  return async (...args: Args): Promise<Response> => {
    try {
      const data = await fn(...args);
      return Response.json(data ?? { ok: true });
    } catch (err) {
      if (err instanceof HttpError) return Response.json({ error: err.message }, { status: err.status });
      console.error(err);
      return Response.json({ error: "Erreur serveur, réessaie." }, { status: 500 });
    }
  };
}
