import { notFound, permanentRedirect } from "next/navigation";
import { EmulatorHubPage, emulatorHubMetadata } from "@/components/emulator-hub-page";
import { emulatorStatusPath, isEmulatorId, isStatusId, parseHubPage } from "@/lib/hubs";

export function generateStaticParams() {
  return [{ emulator: "rpcs3", status: "playable", page: "2" }];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ emulator: string; status: string; page: string }>;
}) {
  const { emulator, status, page } = await params;
  const parsed = parseHubPage(page);
  if (parsed === null) notFound();
  return emulatorHubMetadata(emulator, status, parsed);
}

export default async function Page({
  params,
}: {
  params: Promise<{ emulator: string; status: string; page: string }>;
}) {
  const { emulator, status, page } = await params;
  if (!isEmulatorId(emulator) || !isStatusId(status)) notFound();
  const parsed = parseHubPage(page);
  if (parsed === null) notFound();
  if (parsed === 1) permanentRedirect(emulatorStatusPath(emulator, status));
  return <EmulatorHubPage emulator={emulator} status={status} page={parsed} />;
}
