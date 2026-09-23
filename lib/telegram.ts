import { log } from "./logger";

const API_BASE = "https://api.telegram.org/bot";
const TELEGRAM_TEXT_LIMIT = 4_096;
const DEFAULT_ERROR_DEDUP_MS = 60_000;
const TELEGRAM_REQUEST_TIMEOUT_MS = 10_000;
const TELEGRAM_MAX_ATTEMPTS = 3;
const recentServerErrors = new Map<string, number>();

interface TelegramMessageOptions {
  chatId?: string;
}

export interface TelegramServerError {
  requestId: string;
  status: number;
  errorType: string;
  message: string;
  code?: string | number;
  stack?: string;
  occurredAt: string;
  environment: string;
}

/**
 * Kirim pesan notifikasi ke Telegram.
 * - Membutuhkan env TELEGRAM_BOT_TOKEN dan TELEGRAM_CHAT_ID.
 * - Jika TELEGRAM_CHAT_ID kosong, chat id dicoba dideteksi otomatis
 *   dari getUpdates (pengguna cukup sekali menekan Start di bot).
 * - Kegagalan mengirim TIDAK akan melempar error (hanya dicatat).
 */
export function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function retryDelayMilliseconds(attempt: number, retryAfterSeconds?: unknown): number {
  const retryAfter = Number(retryAfterSeconds);
  if (Number.isFinite(retryAfter) && retryAfter > 0) return Math.min(retryAfter * 1_000, 30_000);
  return 500 * 2 ** attempt;
}

export async function sendTelegramMessage(
  text: string,
  options: TelegramMessageOptions = {},
): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const configuredChatId = options.chatId || process.env.TELEGRAM_CHAT_ID;

  if (!token || !/^\d+:[\w-]+$/.test(token)) {
    log.warn({}, "TELEGRAM_BOT_TOKEN tidak diset atau tidak valid — notifikasi dilewati.");
    return false;
  }

  let chatId = configuredChatId;
  if (!chatId) {
    chatId = await detectChatId(token);
    if (!chatId) {
      log.warn({}, "TELEGRAM_CHAT_ID belum tersedia — tekan Start pada bot Telegram lalu kirim ulang.");
      return false;
    }
  }

  for (let attempt = 0; attempt < TELEGRAM_MAX_ATTEMPTS; attempt++) {
    try {
      const res = await fetch(`${API_BASE}${token}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: "HTML",
          disable_web_page_preview: true,
        }),
        signal: AbortSignal.timeout(TELEGRAM_REQUEST_TIMEOUT_MS),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        description?: string;
        parameters?: { retry_after?: number };
      };
      if (data.ok) return true;

      const shouldRetry = res.status === 429 || res.status >= 500;
      if (!shouldRetry || attempt === TELEGRAM_MAX_ATTEMPTS - 1) {
        log.warn({ status: res.status, description: data.description }, "Telegram sendMessage gagal");
        return false;
      }
      await delay(retryDelayMilliseconds(attempt, data.parameters?.retry_after));
    } catch (err) {
      if (attempt === TELEGRAM_MAX_ATTEMPTS - 1) {
        log.warn({ err: err instanceof Error ? err.message : String(err) }, "Gagal menghubungi Telegram");
        return false;
      }
      await delay(retryDelayMilliseconds(attempt));
    }
  }

  return false;
}

function getErrorDedupWindow(): number {
  const configured = Number(process.env.TELEGRAM_ERROR_DEDUP_MS);
  return Number.isFinite(configured) && configured >= 0 ? configured : DEFAULT_ERROR_DEDUP_MS;
}

function reserveErrorNotification(key: string): boolean {
  const now = Date.now();
  const dedupWindow = getErrorDedupWindow();
  const lastSentAt = recentServerErrors.get(key);
  if (dedupWindow > 0 && lastSentAt && now - lastSentAt < dedupWindow) return false;

  recentServerErrors.set(key, now);
  if (recentServerErrors.size > 200) {
    for (const [storedKey, sentAt] of recentServerErrors) {
      if (now - sentAt >= dedupWindow) recentServerErrors.delete(storedKey);
    }
  }
  return true;
}

function formatServerError(payload: TelegramServerError): string {
  const lines = [
    "<b>SERVER ERROR — KKM UMUSLIM</b>",
    "",
    `<b>Waktu:</b> ${escapeHtml(payload.occurredAt)}`,
    `<b>Environment:</b> ${escapeHtml(payload.environment)}`,
    `<b>Status:</b> ${payload.status}`,
    `<b>Request ID:</b> <code>${escapeHtml(payload.requestId)}</code>`,
    `<b>Tipe:</b> ${escapeHtml(payload.errorType)}`,
  ];

  if (payload.code !== undefined) lines.push(`<b>Kode:</b> ${escapeHtml(String(payload.code))}`);
  lines.push("", `<b>Pesan:</b> ${escapeHtml(payload.message.slice(0, 1_000))}`);
  if (payload.stack) {
    lines.push("", `<b>Lokasi:</b>`, `<pre>${escapeHtml(payload.stack.slice(0, 1_800))}</pre>`);
  }

  return lines.join("\n").slice(0, TELEGRAM_TEXT_LIMIT);
}

/** Kirim notifikasi error server 5xx dengan deduplikasi agar Telegram tidak dibanjiri. */
export async function notifyTelegramServerError(payload: TelegramServerError): Promise<boolean> {
  if (process.env.TELEGRAM_ERROR_NOTIFICATIONS?.toLowerCase() === "false") return false;

  const dedupKey = `${payload.status}:${payload.errorType}:${payload.message}`;
  if (!reserveErrorNotification(dedupKey)) return false;

  const sent = await sendTelegramMessage(formatServerError(payload), {
    chatId: process.env.TELEGRAM_ERROR_CHAT_ID,
  });
  if (!sent) recentServerErrors.delete(dedupKey);
  return sent;
}

async function detectChatId(token: string): Promise<string | undefined> {
  try {
    const res = await fetch(`${API_BASE}${token}/getUpdates`, {
      signal: AbortSignal.timeout(TELEGRAM_REQUEST_TIMEOUT_MS),
    });
    const data = (await res.json()) as {
      ok?: boolean;
      result?: Array<{ message?: { chat?: { id?: number | string } } }>;
    };
    const updates = data.result ?? [];
    for (let i = updates.length - 1; i >= 0; i--) {
      const chatId = updates[i]?.message?.chat?.id;
      if (chatId != null) return String(chatId);
    }
  } catch {
    // diabaikan — deteksi otomatis bersifat best-effort
  }
  return undefined;
}
