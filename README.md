# Moscow Hospital - Emergency Location Sharing

## Run it
    node server.js                         # then open http://localhost:3000
    DISPATCH_KEY=mySecret node server.js   # recommended: protects the hospital screen

- Patients: http://localhost:3000                 (top-right "Emergency" button)
- Hospital: http://localhost:3000/dispatch.html   (keep open at the emergency desk)

Browsers only allow GPS on HTTPS or localhost. Do NOT open index.html by double-clicking it.

## Edit js/config.js
- hospitalWhatsApp -> hospital number for the WhatsApp backup button
- hospitalLat/Lng  -> hospital coordinates, to show distance + ETA on the dispatch screen
- apiUrl: ""       -> pure demo mode (no server; alerts stay in this browser)

## Going live
Deploy behind HTTPS, set DISPATCH_KEY, and replace the shared key with real staff login.

## Animations (css/animations.css + js/animations.js)
- Sign In / Sign Up / Emergency / confirmation pop-ups fade and slide in and out smoothly
- Header buttons have hover lift, press feedback and a click ripple
- "Create an account" button sits inside the Sign In pop-up (below the Sign In button, right side) and switches to the Sign Up form
- Animations switch off automatically for users with "reduce motion" enabled
