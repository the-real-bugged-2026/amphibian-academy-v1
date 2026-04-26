import { initializeApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
import {
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";
import { firebaseConfig } from "./home_firebase_config.js";

const els = {
  body: document.body,
  authOverlay: document.getElementById("authOverlay"),
  modeLoginBtn: document.getElementById("modeLoginBtn"),
  modeSignupBtn: document.getElementById("modeSignupBtn"),
  authForm: document.getElementById("authForm"),
  authEmail: document.getElementById("authEmail"),
  authPassword: document.getElementById("authPassword"),
  authStatus: document.getElementById("authStatus"),
  authSubmitBtn: document.getElementById("authSubmitBtn"),
  authUserEmail: document.getElementById("authUserEmail"),
  logoutBtn: document.getElementById("logoutBtn")
};

const mode = {
  current: "login"
};

function hasPlaceholderConfig(config) {
  return Object.values(config).some((value) => {
    if (typeof value !== "string") {
      return true;
    }
    return value.includes("REPLACE_WITH_");
  });
}

function setStatus(message, tone = "") {
  els.authStatus.textContent = message;
  els.authStatus.classList.remove("error", "success");
  if (tone) {
    els.authStatus.classList.add(tone);
  }
}

function setMode(nextMode) {
  mode.current = nextMode;

  const isLogin = nextMode === "login";
  els.modeLoginBtn.classList.toggle("active", isLogin);
  els.modeSignupBtn.classList.toggle("active", !isLogin);
  els.modeLoginBtn.setAttribute("aria-selected", String(isLogin));
  els.modeSignupBtn.setAttribute("aria-selected", String(!isLogin));
  els.authSubmitBtn.textContent = isLogin ? "Login" : "Create Account";
  els.authPassword.setAttribute("autocomplete", isLogin ? "current-password" : "new-password");

  setStatus(isLogin ? "Enter your credentials to continue." : "Create an account to unlock the home page.");
}

function setAuthenticatedUI(user) {
  const email = user?.email || "Signed in";

  els.body.classList.remove("auth-locked");
  els.authOverlay.classList.add("hidden");
  els.authUserEmail.classList.remove("hidden");
  els.logoutBtn.classList.remove("hidden");
  els.authUserEmail.textContent = email;
}

function setSignedOutUI() {
  els.body.classList.add("auth-locked");
  els.authOverlay.classList.remove("hidden");
  els.authUserEmail.classList.add("hidden");
  els.logoutBtn.classList.add("hidden");
  els.authUserEmail.textContent = "";
  els.authForm.reset();
  els.authEmail.focus();
}

function humanizeAuthError(code) {
  if (code === "auth/invalid-email") return "Enter a valid email address.";
  if (code === "auth/missing-password") return "Password is required.";
  if (code === "auth/weak-password") return "Password must be at least 6 characters.";
  if (code === "auth/email-already-in-use") return "That email already has an account.";
  if (code === "auth/invalid-credential") return "Email or password is incorrect.";
  if (code === "auth/user-not-found") return "No account exists for that email.";
  if (code === "auth/wrong-password") return "Email or password is incorrect.";
  if (code === "auth/too-many-requests") return "Too many attempts. Try again in a bit.";
  return "Authentication failed. Check configuration and try again.";
}

function bindAuthForm(auth) {
  els.modeLoginBtn.addEventListener("click", () => setMode("login"));
  els.modeSignupBtn.addEventListener("click", () => setMode("signup"));

  els.authForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = els.authEmail.value.trim();
    const password = els.authPassword.value;

    if (!email) {
      setStatus("Email is required.", "error");
      els.authEmail.focus();
      return;
    }

    if (!password || password.length < 6) {
      setStatus("Password must be at least 6 characters.", "error");
      els.authPassword.focus();
      return;
    }

    els.authSubmitBtn.disabled = true;
    setStatus(mode.current === "login" ? "Logging in..." : "Creating account...");

    try {
      if (mode.current === "signup") {
        await createUserWithEmailAndPassword(auth, email, password);
        setStatus("Account created. Signing you in...", "success");
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        setStatus("Login successful.", "success");
      }
    } catch (error) {
      const message = humanizeAuthError(error?.code);
      setStatus(message, "error");
    } finally {
      els.authSubmitBtn.disabled = false;
    }
  });

  els.logoutBtn.addEventListener("click", async () => {
    try {
      await signOut(auth);
    } catch {
      // Keep the interface usable even if sign out fails momentarily.
      setStatus("Could not sign out right now. Try again.", "error");
      els.body.classList.add("auth-locked");
      els.authOverlay.classList.remove("hidden");
    }
  });
}

function init() {
  if (hasPlaceholderConfig(firebaseConfig)) {
    setMode("login");
    setStatus("Add your Firebase config in home_firebase_config.js.", "error");
    return;
  }

  try {
    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);

    bindAuthForm(auth);
    setMode("login");

    onAuthStateChanged(auth, (user) => {
      if (user) {
        setAuthenticatedUI(user);
      } else {
        setSignedOutUI();
      }
    });
  } catch {
    setMode("login");
    setStatus("Firebase init failed. Verify config values.", "error");
  }
}

init();
