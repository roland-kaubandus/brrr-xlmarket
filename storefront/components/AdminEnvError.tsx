/**
 * FAIL-LOUD vea-ekraan xl-admin sektsioonile, kui deploy'st puuduvad env-id.
 * Näitab AINULT puuduvate env-ide NIMESID (mitte väärtusi). Server-komponent.
 */
export default function AdminEnvError({ missing }: { missing: string[] }) {
  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-16 bg-[#F8FAFC]">
      <div className="w-full max-w-[560px] bg-white border border-[#FCA5A5] rounded-xl shadow-sm p-8">
        <h1 className="text-[22px] font-bold text-[#991B1B] mb-2">
          XL Admin — seadistus puudulik
        </h1>
        <p className="text-sm text-[#475569] mb-4">
          Admin-sektsioon ei saa käivituda, sest serveris puuduvad järgmised
          keskkonnamuutujad. Lisa need Coolify keskkonda ja tee redeploy.
        </p>
        <ul className="list-disc pl-5 mb-4 space-y-1">
          {missing.map((name) => (
            <li key={name} className="font-mono text-[13px] text-[#991B1B]">
              {name}
            </li>
          ))}
        </ul>
        <p className="text-xs text-[#94A3B8]">
          Turvalisuse huvides kuvatakse ainult muutujate nimed, mitte väärtused.
        </p>
      </div>
    </main>
  )
}
