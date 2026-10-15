import { runSync } from "../src/lib/sync/run";

runSync()
  .then((report) => {
    console.log(JSON.stringify(report, null, 2));
    const required = new Set(["rpcs3", "shadps4", "sharpemu"]);
    const failed = report.sources.filter((source) => required.has(source.id) && !source.ok);
    if (failed.length) {
      console.error(`Required sources failed: ${failed.map((source) => source.id).join(", ")}`);
      process.exitCode = 1;
    }
  })
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
