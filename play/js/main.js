/* =====================================================================
   Startup. Always the last script.
   ===================================================================== */
"use strict";
document.body.insertAdjacentHTML('afterbegin', PATTERNS);
// Pick up a saved gauntlet after a refresh. Otherwise start on the home screen.
{ const R = loadRun(); if (!(R && resumeRun(R))) renderTitle(); }
$('ver').textContent = 'Version ' + VERSION;
// Handy for testing in the browser console: __ink.G is the duel in progress, __ink.run the gauntlet.
window.__ink = { get G() { return G; }, get run() { return run; }, E, save };
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('/sw.js').catch(() => {});
