import { EmulatorHubPage, emulatorHubMetadata } from "@/components/emulator-hub-page";
import { EMULATOR_IDS, STATUSES } from "@/lib/types";

export function generateStaticParams() {
  return EMULATOR_IDS.flatMap((emulator) => STATUSES.map((status) => ({ emulator, status })));
}

export function generateMetadata({ params }: { params: Promise<{ emulator: string; status: string }> }) {
  return params.then(({ emulator, status }) => emulatorHubMetadata(emulator, status));
}

export default async function Page({ params }: { params: Promise<{ emulator: string; status: string }> }) {
  const { emulator, status } = await params;
  return <EmulatorHubPage emulator={emulator} status={status} />;
}
