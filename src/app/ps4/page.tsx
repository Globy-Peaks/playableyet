import { PlatformHubPage, platformHubMetadata } from "@/components/platform-hub-page";

export function generateMetadata() {
  return platformHubMetadata("ps4");
}

export default function Page() {
  return <PlatformHubPage platform="ps4" />;
}
