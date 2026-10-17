import { PlatformHubPage, platformHubMetadata } from "@/components/platform-hub-page";

export function generateMetadata() {
  return platformHubMetadata("ps3");
}

export default function Page() {
  return <PlatformHubPage platform="ps3" />;
}
