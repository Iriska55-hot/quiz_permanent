import test from "node:test";
import assert from "node:assert/strict";
import { getResultStage, whatsappUrl } from "../src/result-flow.js";

test("keeps the offer hidden until an actual preview result exists", () => {
  assert.equal(getResultStage({ photoReady: false, resultReady: false, offerOpen: false }), "photo");
  assert.equal(getResultStage({ photoReady: true, resultReady: false, offerOpen: false }), "photo-ready");
  assert.equal(getResultStage({ photoReady: true, resultReady: false, offerOpen: true }), "photo-ready");
  assert.equal(getResultStage({ photoReady: true, resultReady: true, offerOpen: true }), "offer");
});

test("does not open the offer without a selected photo", () => {
  assert.equal(getResultStage({ photoReady: false, resultReady: true, offerOpen: true }), "photo");
});

test("builds a WhatsApp link with the selected zone and offer", () => {
  const url = new URL(whatsappUrl("Augenbrauen"));
  assert.equal(url.hostname, "wa.me");
  assert.equal(url.pathname, "/491758221111");
  assert.match(url.searchParams.get("text"), /Augenbrauen/);
  assert.match(url.searchParams.get("text"), /20 %/);
  assert.match(url.searchParams.get("text"), /240 €/);
  assert.match(url.searchParams.get("text"), /299 €/);
});
