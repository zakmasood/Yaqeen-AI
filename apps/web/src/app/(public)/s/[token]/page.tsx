import { SubmitWizard } from "@/features/submit/submit-wizard";

type Props = { params: Promise<{ token: string }> };

export default async function InviteSubmitPage({ params }: Props) {
  const { token } = await params;
  return <SubmitWizard token={token} />;
}
