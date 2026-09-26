import { planSteps, runMission, lastKernel } from "./colony-driver.mjs";

const $ = (id) => document.getElementById(id);
const stepsEl = $("steps");
const meter = $("meter");
const runBtn = $("run");

function addStep(s) {
  const div = document.createElement("div");
  div.className = `step ${s.kind}`;
  const ico = s.kind === "ok" ? "✓" : "⛔";
  const ev = s.event ? `<small>${s.event.type} · seq ${s.event.seq} · sha ${s.event.hash}…</small>` : "";
  div.innerHTML = `<div class="ico">${ico}</div><div><b>${s.label}</b>${ev}${s.detail ? `<small>${escapeHtml(s.detail)}</small>` : ""}</div>`;
  stepsEl.appendChild(div);
  requestAnimationFrame(() => div.classList.add("show"));
  div.scrollIntoView({ block: "nearest", behavior: "smooth" });
}

function escapeHtml(t) {
  return t.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}

function updateState(s, counts) {
  if (s.stage) $("stage").textContent = s.stage;
  if (s.stateVersion != null) $("version").textContent = String(s.stateVersion);
  $("events").textContent = String(counts.events);
  $("rejections").textContent = String(counts.rejections);
  if (s.event) $("lastev").textContent = `${s.event.type}  ·  seq ${s.event.seq}  ·  payloadSha256 ${s.event.hash}…`;
}

runBtn.addEventListener("click", async () => {
  runBtn.disabled = true;
  stepsEl.innerHTML = "";
  $("hash").textContent = "…";

  const steps = planSteps();
  let i = 0;
  let counts = { events: 0, rejections: 0 };

  for await (const s of runMission()) {
    addStep(s);
    // "events committed" comes from the kernel itself: missionSequence on each
    // event descriptor (monotonic, equals getEvents().length). Never count UI
    // steps — the kernel logs more events than the stream shows (23 vs 12).
    if (s.event?.seq != null) counts.events = s.event.seq;
    // "durable rejections" mirrors the kernel's own rejection ledger — never
    // parse UI labels.
    const rej = lastKernel?.storage.listRejections();
    if (rej?.ok) counts.rejections = rej.value.length;
    updateState(s, counts);
    $("hash").textContent = s.detail?.startsWith("hash=") ? s.detail.slice(5, 40) + "…" : $("hash").textContent;
    i = Math.min(i + 1, steps.length);
    meter.style.width = `${Math.round((i / steps.length) * 100)}%`;
    await new Promise((r) => setTimeout(r, 450)); // readable pacing for judges
  }

  meter.style.width = "100%";
  runBtn.disabled = false;
  runBtn.textContent = "↻ Run it again (deterministic — identical output)";
});
