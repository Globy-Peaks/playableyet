import Link from "next/link";
import { EMULATORS, PLATFORM_LABEL } from "@/lib/emulators";
import { emulatorPath, platformPath } from "@/lib/hubs";
import { EMULATOR_IDS, PLATFORMS } from "@/lib/types";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-border/80">
      <div className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-8 text-sm text-muted-foreground md:grid-cols-[1.4fr_1fr]">
        <div className="space-y-2 leading-6">
          <p>
            Statuses are copied from public compatibility reports. PlayableYet does not host or link to ROMs,
            firmware, BIOS, or decryption keys.
          </p>
          <p>
            AnyPS5 download sites are not the official project. See{" "}
            <Link href="/about" className="text-foreground underline decoration-primary/60 underline-offset-4">
              About
            </Link>{" "}
            for sources and the warning. A short guide for AI tools is at{" "}
            <Link href="/llms.txt" className="text-foreground underline decoration-primary/60 underline-offset-4">
              llms.txt
            </Link>
            .
          </p>
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-4">
          <div>
            <p className="mb-2 text-foreground">On this site</p>
            <ul className="space-y-1">
              {PLATFORMS.map((platform) => (
                <li key={platform}>
                  <Link href={platformPath(platform)} className="hover:text-foreground">
                    {PLATFORM_LABEL[platform]}
                  </Link>
                </li>
              ))}
              {EMULATOR_IDS.map((emulator) => (
                <li key={emulator}>
                  <Link href={emulatorPath(emulator)} className="hover:text-foreground">
                    {EMULATORS[emulator].name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="mb-2 text-foreground">Sources</p>
            <ul className="space-y-1">
              {Object.values(EMULATORS).map((emulator) => (
                <li key={emulator.id}>
                  <a href={emulator.siteUrl} className="hover:text-foreground">
                    {emulator.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </footer>
  );
}
