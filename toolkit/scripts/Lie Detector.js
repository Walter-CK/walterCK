// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: yellow; icon-glyph: heartbeat;
const html = `
<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
  html, body {
    margin: 0; padding: 0;
    background: #000; color: white; font-family: monospace, sans-serif;
    height: 100vh;
    display: flex; flex-direction: column; align-items: center;
    user-select: none; -webkit-user-select: none; touch-action: manipulation;
    overscroll-behavior: none;
    overflow: hidden;
  }

  #title {
    font-size: 40px;
    font-weight: 900;
    letter-spacing: 1.2px;
    margin: 30px 0 25px 0; /* Raised but natural spacing */
    user-select: none;
  }

  #scanner {
    position: relative;
    width: 220px;
    height: 340px; /* nudged taller to push fingerprint down */
    border: 3px solid #00ff99;
    background: #010a0b;
    box-shadow: 0 0 15px #00ff99;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    border-radius: 15px;
    margin-top: 50px;  
  }

  svg {
    width: 80%;
    height: auto;
    opacity: 0.5;
    animation: pulse 2.5s infinite ease-in-out;
    pointer-events: none;
    filter: drop-shadow(0 0 3px #00ff99);
    transition: filter 0.3s ease, opacity 0.3s ease;
  }

  /* Slight glow for truth mode fingerprint */
  #scanner.truth svg {
    filter: drop-shadow(0 0 8px #33ff99);
    opacity: 0.7;
  }

  /* Slight red tint for lie mode fingerprint */
  #scanner.lie svg {
    filter: drop-shadow(0 0 8px #ff4444);
    opacity: 0.7;
  }

  @keyframes pulse {
    0% { opacity: 0.4; transform: scale(1); }
    50% { opacity: 0.8; transform: scale(1.05); }
    100% { opacity: 0.4; transform: scale(1); }
  }

  #line {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 5px;
    background: #00ff99;
    box-shadow: 0 0 8px #00ff99;
    display: none;
  }

  @keyframes scan {
    from { top: 0%; }
    to { top: 100%; }
  }

  #result {
    margin-top: 25px;
    font-size: 28px;
    font-weight: 900;
    font-family: monospace;
    letter-spacing: 1px;
    display: none;
  }

  #holdText {
    position: absolute;
    bottom: 10px;
    color: #33ffaa;
    font-size: 16px;
    font-weight: 700;
    font-family: monospace;
    animation: blink 1s infinite;
  }

  @keyframes blink {
    0% { opacity: 1; }
    50% { opacity: 0.3; }
    100% { opacity: 1; }
  }
</style>
</head>
<body ontouchstart="startHold()" ontouchend="cancelHold()" ontouchcancel="cancelHold()">
  <div id="title">Lie Detector</div>

  <div id="scanner" class="random">
    <!-- Techy fingerprint SVG -->
    <svg viewBox="0 0 128 160" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false" >
      <circle cx="64" cy="80" r="60" stroke="#00ff99" stroke-width="2" />
      <path stroke="#00ff99" stroke-width="2" d="M64 20v50m0 10v40" />
      <path stroke="#00ff99" stroke-width="1" d="M20 80h40m28 0h40" />
      <path stroke="#00ff99" stroke-width="1" d="M40 40q20 10 48 0" />
      <path stroke="#00ff99" stroke-width="1" d="M40 120q20 -10 48 0" />
      <path stroke="#00ff99" stroke-width="1" d="M50 55v15m28 -15v15" />
      <circle cx="64" cy="80" r="8" stroke="#00ff99" stroke-width="1" />
      <circle cx="64" cy="110" r="8" stroke="#00ff99" stroke-width="1" />
    </svg>

    <div id="line"></div>
    <div id="holdText">Hold to Scan</div>
  </div>
  <div id="result"></div>

<script>
  let riggedMode = "random"; // start in random mode
  let tapCount = 0;
  let tapTimer = null;

  const title = document.getElementById("title");
  const scanner = document.getElementById("scanner");

  let holdTimer = null;
  let scanTimer = null;
  let scanStarted = false;
  let scanFinishedFlag = false;

  function updateUI() {
    if (riggedMode === "truth") {
      title.innerText = "Lie Detecter";
      scanner.className = "truth";
    } else if (riggedMode === "lie") {
      title.innerText = "Lie Detectar";
      scanner.className = "lie";
    } else {
      title.innerText = "Lie Detector";
      scanner.className = "random";
    }
  }

  updateUI();

  function startHold() {
    if (scanStarted || scanFinishedFlag) return;

    holdTimer = setTimeout(() => {
      scanStarted = true;
      startScan();
    }, 500);
  }

  function cancelHold() {
    clearTimeout(holdTimer);
    if(scanTimer) {
      clearTimeout(scanTimer);
      scanTimer = null;
    }

    if (scanStarted && !scanFinishedFlag) {
      resetScan();
    }
  }

  function startScan() {
    const line = document.getElementById("line");
    const result = document.getElementById("result");
    const holdText = document.getElementById("holdText");

    line.style.display = "block";
    line.style.animation = "scan 1s linear forwards";
    holdText.style.display = "none";

    scanTimer = setTimeout(() => {
      scanFinishedFlag = true;
      scanTimer = null;
      let isTruth;
      if (riggedMode === "truth") isTruth = true;
      else if (riggedMode === "lie") isTruth = false;
      else isTruth = Math.random() < 0.5;

      result.innerText = isTruth ? "✅ TRUTH" : "❌ LIE";
      result.style.color = isTruth ? "#00ff99" : "#ff3333";
      result.style.display = "block";
    }, 1000);
  }

  function resetScan() {
    scanStarted = false;
    scanFinishedFlag = false;

    const line = document.getElementById("line");
    const result = document.getElementById("result");
    const holdText = document.getElementById("holdText");

    line.style.display = "none";
    line.style.animation = "none";
    result.style.display = "none";
    holdText.style.display = "block";
  }

  document.body.addEventListener("click", () => {
    if (scanFinishedFlag) {
      resetScan();
    }

    // Tap counting for rigged mode toggle
    tapCount++;
    if (tapTimer) clearTimeout(tapTimer);

    tapTimer = setTimeout(() => {
      if (tapCount >= 2) {
        if (riggedMode === "random") riggedMode = "truth";
        else if (riggedMode === "truth") riggedMode = "lie";
        else riggedMode = "random";

        updateUI();
        alert("Rigged Mode: " + riggedMode.toUpperCase());
      }
      tapCount = 0;
    }, 400);
  });
</script>
</body>
</html>
`;

let wv = new WebView();
await wv.loadHTML(html);
await wv.present();
if (args.shortcutParameter) {
  Safari.open("shortcuts://run-shortcut?name=App%20Returner");
}