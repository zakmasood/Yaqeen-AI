import { Card } from "@/components/ui/card";
import { getApiUrl } from "@/lib/api";

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-8 lg:px-10">
      <h1 className="text-3xl font-bold tracking-tight text-slate-900">Settings</h1>
      <p className="mt-1 text-sm text-slate-500">
        Merchant and integration placeholders. Secrets stay in environment variables — never in the
        browser.
      </p>

      <div className="mt-6 space-y-4">
        <Card title="API">
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Backend URL</dt>
              <dd className="font-mono text-slate-800">{getApiUrl()}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Supabase client</dt>
              <dd className="text-slate-800">Anon key only</dd>
            </div>
          </dl>
        </Card>
        <Card title="Customer submit link">
          <p className="text-sm text-slate-600">
            Share a link so a customer can upload proof without dashboard access.
          </p>
          <a href="/submit" className="mt-2 inline-block text-sm font-semibold text-yaqeen-700">
            Open submit flow →
          </a>
        </Card>
        <Card title="WhatsApp">
          <p className="text-sm text-slate-600">
            Webhook verification and ingestion are handled by the API. Configure{" "}
            <code className="rounded bg-slate-100 px-1">WHATSAPP_*</code> on the server.
          </p>
        </Card>
      </div>
    </div>
  );
}
