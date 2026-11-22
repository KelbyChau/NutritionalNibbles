// Pins the link checks and the private-address blocklist that stop the
// importer from fetching internal addresses. No network calls.
import assert from "node:assert/strict";
import test from "node:test";
import { ImportError, isPrivateAddress, parseRecipeUrl } from "./fetch-page.ts";

test("private, loopback, link-local and reserved addresses are blocked", () => {
  for (const ip of ["127.0.0.1", "10.1.2.3", "172.16.0.1", "192.168.1.1", "169.254.169.254", "100.64.0.1",
    "0.0.0.0", "224.0.0.1", "::1", "fe80::1", "fd00::1", "::ffff:127.0.0.1"])
    assert.equal(isPrivateAddress(ip), true, ip);
});

test("public addresses are allowed", () => {
  for (const ip of ["172.32.0.1", "8.8.8.8", "2606:4700::1"]) assert.equal(isPrivateAddress(ip), false, ip);
});

test("links without a scheme get https", () => {
  assert.equal(parseRecipeUrl("allrecipes.com/x").href, "https://allrecipes.com/x");
});

test("bad links are refused with a friendly message", () => {
  const cases = [
    ["ftp://a.com", "Only http and https links can be imported."],
    ["https://u:p@a.com", "Links with a username or password aren’t supported."],
    [" ", "Paste a recipe link first."],
    ["not a url ::", "That doesn’t look like a web link."],
  ];
  for (const [input, message] of cases)
    assert.throws(() => parseRecipeUrl(input), (e) => e instanceof ImportError && e.message === message && e.status === 400);
});
