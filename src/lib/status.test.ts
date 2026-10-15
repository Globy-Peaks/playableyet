import assert from "node:assert/strict";
import test from "node:test";
import { mapLooseStatus, osFromLabels, statusFromLabels, toDay } from "./status";

test("maps source statuses into the shared ladder", () => {
  assert.equal(mapLooseStatus("Playable"), "playable");
  assert.equal(mapLooseStatus("Ingame"), "ingame");
  assert.equal(mapLooseStatus("In game"), "ingame");
  assert.equal(mapLooseStatus("Main menu"), "menus");
  assert.equal(mapLooseStatus("Doesn't boot"), "nothing");
  assert.equal(mapLooseStatus("Logo"), "boots");
  assert.equal(statusFromLabels(["status-playable", "os-windows", "status-nothing"]), "playable");
  assert.deepEqual(osFromLabels(["os-windows", "os-macOS", "status-boots"]), ["macos", "windows"]);
});

test("normalizes dates", () => {
  assert.equal(toDay("2026-10-15T19:06:18Z"), "2026-10-15");
  assert.equal(toDay("15/10/2026"), "2026-10-15");
  assert.equal(toDay("2024-07-02"), "2024-07-02");
});
