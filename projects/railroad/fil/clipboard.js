(function () {
  const SAVE_DIR     = "/home/web_user/love/tma";
  const CLIP_PATH    = `${SAVE_DIR}/__clipboard.txt`;
  const PENDING_PATH = `${SAVE_DIR}/__clipboard_pending.txt`;

  function FS_() {
    if (typeof FS !== "undefined") return FS;
    if (typeof Module !== "undefined" && Module.FS) return Module.FS;
    return null;
  }

  const ta = document.createElement("textarea");
  ta.tabIndex = -1;
  ta.autocapitalize = "off";
  ta.autocomplete = "off";
  ta.spellcheck = false;
  ta.style.position = "fixed";
  ta.style.left = "-10000px";
  ta.style.top = "0";
  ta.style.width = "1px";
  ta.style.height = "1px";
  ta.style.opacity = "0";
  document.body.appendChild(ta);

  function focusCanvasSoon() {
    setTimeout(() => {
      const c = document.getElementById("canvas");
      if (c) c.focus();
    }, 0);
  }

  function writeFile(text) {
    const FS = FS_();
    if (!FS) return;
    try {
      FS.mkdirTree(SAVE_DIR);
      FS.writeFile(CLIP_PATH, String(text || ""), { encoding: "utf8" });
    } catch (e) {
      console.warn("[clip] writeFile failed", e);
    }
  }

  function readFile() {
    const FS = FS_();
    if (!FS) return "";
    try {
      return FS.readFile(CLIP_PATH, { encoding: "utf8" }) || "";
    } catch (_) {
      return "";
    }
  }

  function exists(path) {
    const FS = FS_();
    if (!FS) return false;
    try { FS.stat(path); return true; } catch (_) { return false; }
  }

  function clearPending() {
    const FS = FS_();
    if (!FS) return;
    try { FS.unlink(PENDING_PATH); } catch (_) {}
  }

  function osWriteClipboard(text) {
    text = String(text || "");
    if (!text) return;

    if (navigator.clipboard && navigator.clipboard.writeText && window.isSecureContext) {
      navigator.clipboard.writeText(text).catch((e) => console.warn("[clip] writeText failed", e));
      return;
    }

    try {
      ta.value = text;
      ta.focus();
      ta.select();
      document.execCommand("copy");
      focusCanvasSoon();
    } catch (e) {
      console.warn("[clip] execCommand copy failed", e);
    }
  }

  // Commit pending export/programmatic copies to OS clipboard on a user gesture.
  function maybeCommitPendingCopy() {
    const FS = FS_();
    if (!FS) return;
    if (!exists(PENDING_PATH)) return;

    const text = readFile();
    if (text) osWriteClipboard(text);

    clearPending();
  }

  function install() {
    const FS = FS_();
    if (!FS) return false;

    try { FS.mkdirTree(SAVE_DIR); } catch (_) {}
    console.log("[clip] ready:", CLIP_PATH);

    // ---- PASTE: OS -> file (robust) ----

    ta.addEventListener("paste", (e) => {
      let text = "";
      try { text = (e.clipboardData && e.clipboardData.getData("text/plain")) || ""; } catch (_) {}

      if (text) {
        e.preventDefault();
        writeFile(text);
      } else {
        // fallback: let paste occur into textarea, then read it
        setTimeout(() => { if (ta.value) writeFile(ta.value); }, 0);
      }

      focusCanvasSoon();
    });

    ta.addEventListener("input", () => {
      if (ta.value) {
        writeFile(ta.value);
        ta.value = "";
        focusCanvasSoon();
      }
    });

    // Ctrl+V: focus textarea so paste event actually fires
    document.addEventListener("keydown", (e) => {
      const isMac = navigator.platform.toUpperCase().includes("MAC");
      const mod = isMac ? e.metaKey : e.ctrlKey;
      if (!mod) return;

      if (e.key === "v" || e.key === "V") {
        ta.value = "";
        ta.focus();
        ta.select();

        // Optional async readText attempt
        if (navigator.clipboard && navigator.clipboard.readText && window.isSecureContext) {
          navigator.clipboard.readText().then((t) => { if (t) writeFile(t); }).catch(() => {});
        }

        focusCanvasSoon();
      }

      // Also: commit pending copy on any key gesture
      maybeCommitPendingCopy();
    }, true);

    // Ctrl+C keyup: for normal in-app copy, sync file -> OS clipboard
    document.addEventListener("keyup", (e) => {
      const isMac = navigator.platform.toUpperCase().includes("MAC");
      const mod = isMac ? e.metaKey : e.ctrlKey;
      if (!mod) return;

      if (e.key === "c" || e.key === "C") {
        setTimeout(() => {
          const t = readFile();
          if (t) osWriteClipboard(t);
        }, 0);
        focusCanvasSoon();
      }

      // keyup also good time to commit pending copies
      maybeCommitPendingCopy();
    }, true);

    // Export button clicks: commit pending copy on mousedown (user gesture)
    document.addEventListener("mousedown", () => {
      maybeCommitPendingCopy();
    }, true);

    return true;
  }

  const t = setInterval(() => {
    if (install()) clearInterval(t);
  }, 50);
})();