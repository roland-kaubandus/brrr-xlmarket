# Montonio: sandbox → production lülitamine (prod uo28)

> Teha ALLES peale seda kui staging-sandbox makse-completion (webhook→order→email) on rohelises.
> Prod = Coolify app `uo28ovobnflauslqjgxeohl0` (medusa).

## 1. Hangi live-võtmed
partner.montonio.com → logi sisse XL Marketi kontoga → **Settings → API keys** →
vaheta vaade **Sandbox → Production** (ülanurgas) → kopeeri:
- **Access key** (avalik, `pk_...` analoog)
- **Secret key** (salajane — näidatakse ÜKS kord, salvesta turvaliselt)

Eeltingimus: XL Marketi Montonio-konto peab olema **aktiveeritud/lepingu järgi live** (KYC + leping
sõlmitud). Kui pole → Montonio support. Sandbox-võtmed EI tööta production-gateway's.

## 2. Coolify env prod-medusa's
Coolify UI → app `uo28…` (medusa) → **Environment Variables** → muuda:
```
MONTONIO_ENV=production          # oli: sandbox
MONTONIO_ACCESS_KEY=<live access key>
MONTONIO_SECRET_KEY=<live secret key>
```
Kontrolli et `MEDUSA_BACKEND_URL`/store-URL on **live** domeen (`https://xlmarket.ee`) — webhook
`notificationUrl` = `{backend}/hooks/payment/pp_montonio_montonio`, returnUrl = `{store}/et/tellimus/tagasi`.
Sandbox-domeen returnUrl's lõhuks live-redirecti.

## 3. Redeploy + verifi
- Coolify → Redeploy medusa (env-muudatus nõuab restarti).
- Peale boot'i: `MONTONIO_ENV=production` → klient `client.ts` sihib `gateway.montonio.com`
  (mitte `sandbox-gateway.montonio.com`).
- **Päris-makse test:** tee 1 väike päris-tellimus (nt 1€ toode kui on, või väikseim) päris-pangalingiga,
  kinnita webhook→order→email töötab LIVE-võtmetega. Tühista/refundi see test-tellimus admin'ist.

## 4. Gate
xlmarket.ee on coming-soon-värava taga → päris-kliendid ei jõua checkout'ini enne gate eemaldamist.
Montonio-live võib seadistada **enne** gate-eemaldust (ohutu — keegi ei maksa veel).
Live-launch järjekord: (1) Montonio production ✓ → (2) lõpp-smoke-testid → (3) gate maha.

## Tehnilised viited (kood)
- `backend/src/modules/montonio/lib/client.ts` — base-URL valik `MONTONIO_ENV` järgi, endpoint `/api/orders`
  (fix b0b08acc), webhook-JWT valideerimine `verifyWebhookToken`.
- `backend/src/modules/montonio/service.ts` — `initiatePayment` grandTotal **/100** (eurodesse),
  webhook `getWebhookActionAndData` amount **\*100** (sentidesse) (fix 7bc2d629). PAID→AUTHORIZED.
- Webhook-endpoint: `POST /hooks/payment/pp_montonio_montonio` (Medusa sisseehitatud).
