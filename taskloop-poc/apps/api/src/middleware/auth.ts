import type { Request, Response, NextFunction } from "express";
import type { ApiErrorBody } from "../types";

/**
 * Rate limiter simples em memória.
 *
 * Protege rotas financeiras de abuso (múltiplas requisições em curto período).
 * Limita: N requisições por rota por janela de tempo.
 *
 * Configuração via variável de ambiente:
 *   TASKLOOP_RATE_LIMIT_MAX  — máximo de requisições (default: 10)
 *   TASKLOOP_RATE_LIMIT_WINDOW_MS — janela em ms (default: 60_000 = 1 minuto)
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Limpeza periódica a cada 5 minutos para evitar vazamento de memória
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (entry.resetAt <= now) {
      store.delete(key);
    }
  }
}, 5 * 60 * 1000).unref();

const API_KEY = process.env.TASKLOOP_API_KEY;

/**
 * Middleware de autenticação via API Key.
 *
 * O cliente deve enviar o header:
 *   X-API-Key: <valor da chave>
 *
 * A chave é configurada via variável de ambiente TASKLOOP_API_KEY.
 * Se a variável não estiver definida, a autenticação é ignorada (modo dev).
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!API_KEY) {
    // Sem chave configurada — permitir (ambiente dev / setup)
    return next();
  }

  const apiKey = req.headers["x-api-key"] as string | undefined;

  if (!apiKey || apiKey !== API_KEY) {
    res.status(401).json({
      error: "Unauthorized. Provide a valid API key via the X-API-Key header.",
    } satisfies ApiErrorBody);
    return;
  }

  next();
}

export function rateLimit(max?: number, windowMs?: number) {
  const maxReq = max ?? (Number(process.env.TASKLOOP_RATE_LIMIT_MAX) || 10);
  const window = windowMs ?? (Number(process.env.TASKLOOP_RATE_LIMIT_WINDOW_MS) || 60_000);

  return (req: Request, res: Response, next: NextFunction): void => {
    const ip = req.ip ?? req.socket.remoteAddress ?? "unknown";
    const route = req.path;
    const key = `${ip}:${route}`;
    const now = Date.now();

    let entry = store.get(key);

    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + window };
      store.set(key, entry);
    }

    entry.count += 1;

    res.setHeader("X-RateLimit-Limit", maxReq);
    res.setHeader("X-RateLimit-Remaining", Math.max(0, maxReq - entry.count));
    res.setHeader("X-RateLimit-Reset", Math.ceil(entry.resetAt / 1000));

    if (entry.count > maxReq) {
      res.status(429).json({
        error: `Too many requests. Limit: ${maxReq} per ${window / 1000}s. Try again later.`,
      } satisfies ApiErrorBody);
      return;
    }

    next();
  };
}
