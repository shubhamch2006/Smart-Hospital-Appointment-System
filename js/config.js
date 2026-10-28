// ===== Moscow Hospital – shared settings (edit these) =====
window.MOSCOW_CONFIG = {
  hospitalName: "Moscow Hospital",

  // National emergency number used for the "Call" button.
  emergencyNumber: "108",

  // Hospital's emergency/reception phone for the WhatsApp backup option.
  // Country code + number, digits only, e.g. "919876543210". Leave "" to hide WhatsApp.
  hospitalWhatsApp: "",

  // Where the alert is sent. The included server.js provides this endpoint.
  // Set to "" to run in pure demo mode (alerts are saved in this browser only).
  apiUrl: "/api/emergency",

  // Hospital coordinates – used on the dispatch screen to show distance + rough ETA.
  // Right-click your hospital in Google Maps and copy the coordinates. null = hide distance.
  hospitalLat: null,
  hospitalLng: null
};
