import { SubmitWizard } from "@/features/submit/submit-wizard";

type Props = { searchParams: Promise<{ merchant?: string }> };

export default async function SubmitPage({ searchParams }: Props) {
  const params = await searchParams;
  const merchantSlug = (params.merchant ?? "").trim();
  const merchantName = merchantSlug ? merchantSlug : "Merchant";
  return <SubmitWizard merchantSlug={merchantSlug} merchantName={merchantName} />;
}
