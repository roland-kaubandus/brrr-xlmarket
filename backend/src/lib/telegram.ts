// Telegram fail-loud helper (HARD RULE #5 — iga sisu-/manuse-transform FAIL = nähtav hoiatus).
// Kasutab SAMU env-nimesid mis scripts/lib/notify-telegram.sh (TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID)
// → üks SSoT-saladus mõlemal poolel. Env puudub konteineris → GRACEFUL DEGRADE: console.error
// (ikka nähtav logis), EI viska viga (ei tohi katkestada kirja-saatmist). Saladust EI logita.
export async function notifyTelegram(text: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID
  if (!token || !chatId) {
    console.error(`[TELEGRAM] BOT_TOKEN/CHAT_ID puudub konteineris — hoiatus jääb SAATMATA: ${text}`)
    return
  }
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
    })
    if (!res.ok) {
      console.error(`[TELEGRAM] saatmine ebaõnnestus (HTTP ${res.status}) — orig: ${text}`)
    }
  } catch (e) {
    console.error(`[TELEGRAM] saatmine kukkus: ${(e as Error)?.message || e} — orig: ${text}`)
  }
}
