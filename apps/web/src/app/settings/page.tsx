import { Card } from "@/components/ui/card";
import { getApiUrl } from "@/lib/api";

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="mt-1 text-sm text-slate-600">
          Merchant account and integration placeholders. Configure secrets via environment variables
          — never in the browser.
        </p>
      </div>
      <Card title="API">
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-slate-500">Backend URL</dt>
            <dd className="font-mono text-slate-800">{getApiUrl()}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-slate-500">Supabase client</dt>
            <dd className="text-slate-800">Anon key only (see .env.example)</dd>
          </div>
        </dl>
      </Card>
      <Card title="WhatsApp">
        <p className="text-sm text-slate-600">
          Webhook verification and ingestion are handled by the API. Configure{" "}
          <code className="rounded bg-slate-100 px-1">WHATSAPP_*</code> on the server.
        </p>
      </Card>
    </div>
  );
}
