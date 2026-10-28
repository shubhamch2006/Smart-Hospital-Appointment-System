/* Emergency location sharing – Moscow Hospital
   Flow: click Emergency -> browser asks for GPS permission -> patient sees their
   position -> taps "Send" -> alert (with live-updating location) goes to the hospital. */
(() => {
  const CFG = window.MOSCOW_CONFIG || {};
  const $ = id => document.getElementById(id);

  const modal = $("emModal"), statusBox = $("emStatus"), mapWrap = $("emMapWrap"), mapFrame = $("emMap");
  const coordsBox = $("emCoords"), sendBtn = $("emSend"), retryBtn = $("emRetry"), callBtn = $("emCall");
  const backup = $("emBackup"), waBtn = $("emWhatsApp"), shareBtn = $("emShare"), sentBox = $("emSent");
  const nameIn = $("emName"), phoneIn = $("emPhone"), typeIn = $("emType");

  let watchId = null, pos = null, alertId = null, sent = false, sendFailed = false;
  let lastSent = { t: 0, lat: null, lng: null }, sending = false, lastFocus = null;

  callBtn.href = "tel:" + (CFG.emergencyNumber || "108");
  callBtn.textContent = "📞 Call " + (CFG.emergencyNumber || "108");
  if (CFG.hospitalWhatsApp) waBtn.hidden = false;

  // Remember the patient's details for next time (stored in this browser only).
  try {
    const saved = JSON.parse(localStorage.getItem("moscow_em_profile") || "{}");
    nameIn.value = saved.name || ""; phoneIn.value = saved.phone || "";
  } catch (_) {}

  const mapsUrl = (lat, lng) => `https://www.google.com/maps?q=${lat},${lng}`;
  const newId = () => {
    const a = new Uint32Array(2); crypto.getRandomValues(a);
    return "EMG-" + (a[0].toString(36) + a[1].toString(36)).toUpperCase().slice(0, 8);
  };

  function setStatus(kind, html) { statusBox.className = "em-status " + kind; statusBox.innerHTML = html; }

  // ---------- Opening / closing ----------
  function open() {
    lastFocus = document.activeElement;
    modal.classList.add("show"); modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    sent = false; sendFailed = false; alertId = null; pos = null; sentBox.hidden = true;
    sendBtn.disabled = true; sendBtn.textContent = "Send my location to hospital";
    mapWrap.hidden = true; coordsBox.hidden = true; backup.hidden = true; retryBtn.hidden = true;
    startLocating();
    $("emClose").focus();
  }
  function close() {
    stopLocating();
    modal.classList.remove("show"); modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  // ---------- Getting the location ----------
  function startLocating() {
    stopLocating();
    if (!("geolocation" in navigator)) {
      return fail("Your browser can’t share location. Please call <b>" + CFG.emergencyNumber + "</b> and tell them where you are.", true);
    }
    if (!window.isSecureContext) {
      return fail("Location only works on a secure page (HTTPS or localhost). Open the site through <b>https://</b> or <b>http://localhost</b>.", true);
    }
    setStatus("info", '<span class="em-spin"></span> Finding your exact location… please tap <b>Allow</b> if your browser asks.');
    watchId = navigator.geolocation.watchPosition(onPos, onErr, { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 });
  }
  function stopLocating() {
    if (watchId !== null) { navigator.geolocation.clearWatch(watchId); watchId = null; }
  }

  function onPos(p) {
    pos = { lat: p.coords.latitude, lng: p.coords.longitude, acc: Math.round(p.coords.accuracy) };
    renderPosition();
    if (sent) maybeUpdate();
  }

  function onErr(err) {
    if (pos) return; // we already have a fix – ignore later hiccups
    if (err.code === 1) {
      return fail("Location permission is blocked. Tap the 🔒 icon next to the address bar → allow <b>Location</b> → press <b>Retry</b>. You can also send the alert without location, or call <b>" + CFG.emergencyNumber + "</b>.", true);
    }
    // Timeout / unavailable: try once with low accuracy (Wi-Fi / mobile network)
    navigator.geolocation.getCurrentPosition(onPos, () =>
      fail("Couldn’t get a location fix. Move near a window or enable GPS, then press <b>Retry</b>. You can still send the alert without location.", true),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 });
  }

  function fail(msg, allowNoLocation) {
    setStatus("error", "⚠ " + msg);
    retryBtn.hidden = false;
    if (allowNoLocation) { sendBtn.disabled = false; sendBtn.textContent = "Send alert without location"; }
  }

  function renderPosition() {
    const { lat, lng, acc } = pos;
    const good = acc <= 100;
    if (!sent && !sendFailed) {
      setStatus(good ? "ok" : "warn",
        good ? "✓ Location found. Tap <b>Send</b> to alert the hospital."
             : "Location found but not very precise (±" + acc + " m). It will improve – you can send now or wait a few seconds.");
    }
    sendBtn.disabled = sending;
    if (sendBtn.textContent.includes("without location")) sendBtn.textContent = "Send my location to hospital";
    retryBtn.hidden = true;

    coordsBox.hidden = false;
    coordsBox.innerHTML = `<div><small>Latitude, Longitude</small><b>${lat.toFixed(6)}, ${lng.toFixed(6)}</b></div>
      <div><small>Accuracy</small><b>± ${acc} m</b></div>
      <a href="${mapsUrl(lat, lng)}" target="_blank" rel="noopener">Open in Google Maps ↗</a>`;

    const d = 0.004;
    mapFrame.src = `https://www.openstreetmap.org/export/embed.html?bbox=${lng - d},${lat - d},${lng + d},${lat + d}&layer=mapnik&marker=${lat},${lng}`;
    mapWrap.hidden = false;

    backup.hidden = false;
    waBtn.href = CFG.hospitalWhatsApp
      ? `https://wa.me/${CFG.hospitalWhatsApp}?text=${encodeURIComponent("EMERGENCY – I need help. My location: " + mapsUrl(lat, lng))}` : "#";
  }

  // ---------- Sending the alert ----------
  function payload() {
    return {
      id: alertId,
      name: nameIn.value.trim(), phone: phoneIn.value.trim(), type: typeIn.value,
      locationAvailable: !!pos,
      lat: pos ? pos.lat : null, lng: pos ? pos.lng : null, accuracy: pos ? pos.acc : null,
      mapsUrl: pos ? mapsUrl(pos.lat, pos.lng) : null,
      sentAt: new Date().toISOString()
    };
  }

  function saveLocal(p) {
    try {
      const list = JSON.parse(localStorage.getItem("moscow_emergencies") || "[]");
      const i = list.findIndex(x => x.id === p.id);
      const rec = { ...(i >= 0 ? list[i] : { status: "new", createdAt: p.sentAt }), ...p, updatedAt: p.sentAt };
      if (i >= 0) list[i] = rec; else list.unshift(rec);
      localStorage.setItem("moscow_emergencies", JSON.stringify(list.slice(0, 50)));
    } catch (_) {}
  }

  async function post(p) {
    const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 8000);
    try {
      const r = await fetch(CFG.apiUrl, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(p), signal: ctl.signal, keepalive: true });
      if (!r.ok) throw new Error("HTTP " + r.status);
      return await r.json();
    } finally { clearTimeout(t); }
  }

  async function sendAlert() {
    if (sending) return;
    if (!/^\d{10}$/.test(phoneIn.value.trim()) && phoneIn.value.trim() !== "") {
      phoneIn.focus(); return setStatus("error", "⚠ Mobile number should be 10 digits (or leave it empty).");
    }
    sending = true; sendBtn.disabled = true; sendBtn.textContent = "Sending…";
    alertId = alertId || newId();
    const p = payload();
    try { localStorage.setItem("moscow_em_profile", JSON.stringify({ name: p.name, phone: p.phone })); } catch (_) {}

    let mode = "demo";
    if (CFG.apiUrl) {
      try { await post(p); mode = "server"; } catch (_) { mode = "failed"; }
    }
    saveLocal(p); // always keep a local copy (also feeds the demo dispatch screen)
    sending = false; sent = true; sendFailed = false;
    lastSent = { t: Date.now(), lat: p.lat, lng: p.lng };
    sendBtn.textContent = "Alert sent ✓"; sendBtn.disabled = true;
    showSent(mode, p);
  }

  function showSent(mode, p) {
    sentBox.hidden = false;
    if (mode === "server") {
      setStatus("ok", "✓ <b>Alert sent to " + (CFG.hospitalName || "the hospital") + ".</b> Keep this window open – your location keeps updating live.");
      sentBox.innerHTML = `Reference ID: <b>${alertId}</b><br>${p.locationAvailable ? "Your live location is being shared." : "No location was available – call to give your address."}`;
    } else if (mode === "demo") {
      setStatus("warn", "Demo mode: no hospital server is connected, so this alert was saved <b>in this browser only</b>. Open <a href='dispatch.html' target='_blank'>dispatch.html</a> to see it.");
      sentBox.innerHTML = `Reference ID: <b>${alertId}</b>`;
    } else {
      setStatus("error", "⚠ <b>Could not reach the hospital server.</b> The hospital may NOT have your alert. Please <b>call " + CFG.emergencyNumber + " now</b> or use the WhatsApp / Share options below.");
      sentBox.innerHTML = `Reference ID: <b>${alertId}</b>`;
      sent = false; sendFailed = true; sendBtn.disabled = false; sendBtn.textContent = "Try sending again";
    }
  }

  // Live tracking: after the first send, push updates when the patient moves or every ~15 s.
  function maybeUpdate() {
    if (!pos || sending) return;
    const moved = lastSent.lat === null ? 999 : distM(lastSent.lat, lastSent.lng, pos.lat, pos.lng);
    if (moved < 25 && Date.now() - lastSent.t < 15000) return;
    lastSent = { t: Date.now(), lat: pos.lat, lng: pos.lng };
    const p = payload(); saveLocal(p);
    if (CFG.apiUrl) post(p).catch(() => {});
  }
  function distM(a, b, c, d) {
    const R = 6371000, r = x => x * Math.PI / 180, dLat = r(c - a), dLng = r(d - b);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(r(a)) * Math.cos(r(c)) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  }

  // ---------- Backup options ----------
  shareBtn.addEventListener("click", async () => {
    if (!pos) return;
    const text = "EMERGENCY – I need help. My location: " + mapsUrl(pos.lat, pos.lng);
    try {
      if (navigator.share) await navigator.share({ title: "Emergency location", text });
      else { await navigator.clipboard.writeText(text); shareBtn.textContent = "✓ Link copied"; setTimeout(() => shareBtn.textContent = "Share / copy location link", 2500); }
    } catch (_) {}
  });

  // ---------- Wire up ----------
  document.querySelectorAll("[data-open-emergency]").forEach(b => b.addEventListener("click", e => { e.preventDefault(); open(); }));
  $("emClose").addEventListener("click", close);
  retryBtn.addEventListener("click", () => { pos = null; startLocating(); });
  sendBtn.addEventListener("click", sendAlert);
  modal.addEventListener("click", e => { if (e.target === modal) close(); });
  document.addEventListener("keydown", e => { if (e.key === "Escape" && modal.classList.contains("show")) close(); });
})();
