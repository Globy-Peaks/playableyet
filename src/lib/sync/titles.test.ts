import assert from "node:assert/strict";
import test from "node:test";
import { ingestTitles } from "./fetchers";

test("title index keeps the catalog region code", () => {
  const titles = new Map();
  ingestTitles(
    titles,
    ["titleId\tconceptId\tname\tregion", "CUSA00038_00\t203706\tRESOGUN\tEP", "PPSA01284_00\t1\tReturnal\t"].join("\n"),
  );
  assert.equal(titles.get("CUSA00038")?.region, "EP");
  assert.equal(titles.get("PPSA01284")?.region, undefined);
});

test("the preferred region code is the better rank, from either row order", () => {
  const first = new Map();
  ingestTitles(
    first,
    ["titleId\tconceptId\tname\tregion", "CUSA00038_00\t203706\tRESOGUN\tEP", "CUSA00038_00\t203706\tRESOGUN\tUP"].join(
      "\n",
    ),
  );
  assert.equal(first.get("CUSA00038")?.region, "UP");

  const second = new Map();
  ingestTitles(
    second,
    ["titleId\tconceptId\tname\tregion", "CUSA00038_00\t203706\tRESOGUN\tUP", "CUSA00038_00\t203706\tRESOGUN\tEP"].join(
      "\n",
    ),
  );
  assert.equal(second.get("CUSA00038")?.region, "UP");
  assert.equal(second.get("CUSA00038")?.regionRank, 0);
});
