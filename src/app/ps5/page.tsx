import { PlatformHubPage, platformHubMetadata } from "@/components/platform-hub-page";

export function generateMetadata() {
  return platformHubMetadata("ps5");
}

export default function Page() {
  return <PlatformHubPage platform="ps5" />;
}
