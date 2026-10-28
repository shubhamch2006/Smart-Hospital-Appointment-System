/* Click ripple for the header buttons + the "Create an account" button in the Sign In pop-up. */
(() => {
  document.addEventListener("click", e => {
    const btn = e.target.closest(".auth-btn, .emergency-mini, .create-account-btn");
    if (!btn) return;
    const r = btn.getBoundingClientRect(), size = Math.max(r.width, r.height) * 2;
    const dot = document.createElement("span");
    dot.className = "ripple";
    dot.style.cssText = `width:${size}px;height:${size}px;left:${e.clientX - r.left - size / 2}px;top:${e.clientY - r.top - size / 2}px`;
    btn.appendChild(dot);
    dot.addEventListener("animationend", () => dot.remove());
  });

  // "Create an account" (inside Sign In) -> switch the pop-up to the Sign Up form
  const go = document.getElementById("goSignUp");
  if (go) go.addEventListener("click", () => document.getElementById("signUpTab").click());
})();
