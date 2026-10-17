import { EmulatorHubPage, emulatorHubMetadata } from "@/components/emulator-hub-page";
import { EMULATOR_IDS } from "@/lib/types";

export function generateStaticParams() {
  return EMULATOR_IDS.map((emulator) => ({ emulator }));
}

export function generateMetadata({ params }: { params: Promise<{ emulator: string }> }) {
  return params.then(({ emulator }) => emulatorHubMetadata(emulator));
}

export default async function Page({ params }: { params: Promise<{ emulator: string }> }) {
  const { emulator } = await params;
  return <EmulatorHubPage emulator={emulator} />;
}
