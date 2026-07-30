// ============================================================
// БАНК ХРУСТИКОВ — логика страницы index.html
// ============================================================

/* ---------- Разрешённые почтовые домены (защита от временных почт) ---------- */
const ALLOWED_EMAIL_DOMAINS = [
  "gmail.com",
  "mail.ru",
  "yandex.ru",
  "outlook.com",
  "inbox.ru",
  "bk.ru",
];

/* ---------- Переключение экранов (регистрация / вход / otp) ---------- */
const screens = {
  register: document.getElementById("screen-register"),
  login: document.getElementById("screen-login"),
  otp: document.getElementById("screen-otp"),
};

function showScreen(name) {
  Object.values(screens).forEach((el) => el.classList.remove("is-active"));
  screens[name].classList.add("is-active");
}

// какой экран показать при загрузке страницы
const params = new URLSearchParams(window.location.search);
const startScreen = params.get("screen") === "login" ? "login" : "register";
showScreen(startScreen);

document.getElementById("toLogin").addEventListener("click", (e) => {
  e.preventDefault();
  showScreen("login");
});
document.getElementById("toRegister").addEventListener("click", (e) => {
  e.preventDefault();
  showScreen("register");
});

/* ---------- Вспомогательные функции показа ошибок ---------- */
function setError(fieldId, errorId, message) {
  document.getElementById(fieldId).classList.add("has-error");
  const errEl = document.getElementById(errorId);
  if (message) errEl.textContent = message;
}
function clearError(fieldId) {
  document.getElementById(fieldId).classList.remove("has-error");
}

/* ---------- Валидация email ---------- */
function isEmailValid(email) {
  const basic = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!basic.test(email)) return false;
  const domain = email.split("@")[1].toLowerCase();
  return ALLOWED_EMAIL_DOMAINS.includes(domain);
}

/* ---------- Валидация пароля ----------
   Разрешены: латинские буквы (любой регистр), цифры, "_" и "-"
   Обязательно: минимум 6 символов, хотя бы 1 буква, хотя бы 1 цифра
*/
function isPasswordValid(password) {
  if (password.length < 6) return false;
  if (!/^[A-Za-z0-9_-]+$/.test(password)) return false;
  if (!/[A-Za-z]/.test(password)) return false;
  if (!/[0-9]/.test(password)) return false;
  return true;
}

/* ---------- Индикатор силы пароля (визуальная подсказка) ---------- */
const pwInput = document.getElementById("reg-password");
const bar = document.getElementById("strength-bar");
const label = document.getElementById("strength-label");

const levels = [
  { label: "", color: "#ef4444", width: "0%" },
  { label: "Слабый", color: "#ef4444", width: "25%" },
  { label: "Средний", color: "#f97316", width: "55%" },
  { label: "Хороший", color: "#eab308", width: "75%" },
  { label: "Сильный", color: "#22c55e", width: "100%" },
];

pwInput.addEventListener("input", () => {
  const val = pwInput.value;
  let score = 0;
  if (val.length >= 6) score++;
  if (val.length >= 10) score++;
  if (/[A-Za-z]/.test(val) && /[0-9]/.test(val)) score++;
  if (/^[A-Za-z0-9_-]+$/.test(val) && val.length > 0) score++;

  const lvl = levels[Math.min(score, levels.length - 1)];
  bar.style.width = lvl.width;
  bar.style.background = lvl.color;
  label.textContent = lvl.label;
  label.style.color = val.length ? lvl.color : "rgba(19,18,13,0.4)";

  clearError("f-password");
});

/* ---------- Регистрация ---------- */
const registerForm = document.getElementById("registerForm");
const registerSubmit = document.getElementById("registerSubmit");
const registerNote = document.getElementById("registerNote");

registerForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  registerNote.textContent = "";
  registerNote.className = "form-note";

  const email = document.getElementById("reg-email").value.trim();
  const password = document.getElementById("reg-password").value;
  const password2 = document.getElementById("reg-password2").value;

  clearError("f-email");
  clearError("f-password");
  clearError("f-password2");

  let valid = true;

  if (!isEmailValid(email)) {
    setError("f-email", "err-email", "Недопустимая почта. Разрешены: gmail.com, mail.ru, yandex.ru, outlook.com, inbox.ru, bk.ru");
    valid = false;
  }

  if (!isPasswordValid(password)) {
    setError(
      "f-password",
      "err-password",
      "Пароль от 6 символов, латинские буквы + цифры, без спецсимволов (кроме _ и -)"
    );
    valid = false;
  }

  if (password !== password2 || !password2) {
    setError("f-password2", "err-password2", "Пароли не совпадают");
    valid = false;
  }

  if (!valid) return;

  registerSubmit.disabled = true;
  registerSubmit.textContent = "Отправляем письмо...";

  const { data, error } = await supabaseClient.auth.signUp({
    email,
    password,
  });

  registerSubmit.disabled = false;
  registerSubmit.textContent = "Зарегистрироваться";

  if (error) {
    registerNote.textContent = error.message;
    registerNote.classList.add("error");
    return;
  }

  // сохраняем почту для экрана OTP и переключаемся на него
  sessionStorage.setItem("pendingEmail", email);
  document.getElementById("otpEmail").textContent = email;
  showScreen("otp");
});

/* ---------- Подтверждение по коду (OTP) ---------- */
const otpBoxes = Array.from(document.querySelectorAll("#otpBoxes input"));
const otpNote = document.getElementById("otpNote");

otpBoxes.forEach((box, i) => {
  box.addEventListener("input", () => {
    box.value = box.value.replace(/[^0-9]/g, "");
    if (box.value && i < otpBoxes.length - 1) {
      otpBoxes[i + 1].focus();
    }
  });
  box.addEventListener("keydown", (e) => {
    if (e.key === "Backspace" && !box.value && i > 0) {
      otpBoxes[i - 1].focus();
    }
  });
  box.addEventListener("paste", (e) => {
    e.preventDefault();
    const text = (e.clipboardData.getData("text") || "").replace(/[^0-9]/g, "");
    text.split("").forEach((digit, idx) => {
      if (otpBoxes[idx]) otpBoxes[idx].value = digit;
    });
    const next = otpBoxes[Math.min(text.length, otpBoxes.length - 1)];
    if (next) next.focus();
  });
});

document.getElementById("otpSubmit").addEventListener("click", async () => {
  const code = otpBoxes.map((b) => b.value).join("");
  otpNote.textContent = "";
  otpNote.className = "form-note";

  if (code.length < otpBoxes.length) {
    otpNote.textContent = "Введите весь код";
    otpNote.classList.add("error");
    return;
  }

  const email = sessionStorage.getItem("pendingEmail");

  const { data, error } = await supabaseClient.auth.verifyOtp({
    email,
    token: code,
    type: "signup",
  });

  if (error) {
    otpNote.textContent = "Неверный код. Попробуйте снова.";
    otpNote.classList.add("error");
    return;
  }

  otpNote.textContent = "Готово! Заходим в банк...";
  otpNote.classList.add("success");
  sessionStorage.removeItem("pendingEmail");

  setTimeout(() => {
    window.location.href = "dashboard.html"; // страница личного кабинета — следующий шаг
  }, 800);
});

document.getElementById("otpResend").addEventListener("click", async (e) => {
  e.preventDefault();
  const email = sessionStorage.getItem("pendingEmail");
  if (!email) return;
  otpNote.textContent = "Отправляем новый код...";
  otpNote.className = "form-note";

  const { error } = await supabaseClient.auth.resend({ type: "signup", email });
  otpNote.textContent = error ? error.message : "Код отправлен повторно";
  otpNote.classList.add(error ? "error" : "success");
});

/* ---------- Вход через Google ---------- */
async function signInWithGoogle() {
  const { error } = await supabaseClient.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: window.location.origin + "/dashboard.html" },
  });
  if (error) alert(error.message);
}
document.getElementById("googleBtn").addEventListener("click", signInWithGoogle);
document.getElementById("googleBtnLogin").addEventListener("click", signInWithGoogle);

/* ---------- Вход по email/паролю ----------
   Пока не подключаем логику — экран уже готов, доработаем на следующем шаге.
*/
document.getElementById("loginForm").addEventListener("submit", (e) => {
  e.preventDefault();
  document.getElementById("loginNote").textContent =
    "Логика входа будет добавлена следующим шагом";
});
