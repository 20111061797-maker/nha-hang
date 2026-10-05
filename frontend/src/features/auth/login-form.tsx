"use client";

import { useAuth } from "@/features/auth/auth-provider";
import { Eye, EyeOff, Lock, User } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function LoginForm() {
  const { login } = useAuth();
  const router = useRouter();
  const [usernameOrEmail, setUsernameOrEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function performLogin(user: string, pass: string) {
    if (!user.trim() || !pass) {
      setError("Vui lòng nhập tài khoản và mật khẩu.");
      return;
    }

    setBusy(true);
    setError(null);
    try {
      await login(user.trim(), pass);
      router.replace("/");
    } catch (loginError: unknown) {
      const msg = loginError instanceof Error ? loginError.message : "";
      setError(
        msg === "Invalid credentials."
          ? "Tài khoản hoặc mật khẩu không chính xác. Vui lòng thử lại."
          : msg || "Không thể kết nối đến máy chủ. Vui lòng kiểm tra lại."
      );
    } finally {
      setBusy(false);
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    await performLogin(usernameOrEmail, password);
  }

  return (
    <main className="bepnhau-login-screen">
      {/* Fullscreen Authentic Restaurant Kitchen Background */}
      <div className="bepnhau-bg-container absolute inset-0">
        <Image
          src="/images/bep-nhau-bg.jpg"
          alt="Không gian bếp Quán Bếp Nhậu"
          fill
          priority
          sizes="100vw"
          className="bepnhau-bg-img"
        />
        <div className="bepnhau-bg-vignette" />
      </div>

      {/* Floating Login Card on Right side */}
      <div className="bepnhau-card-container">
        <div className="bepnhau-card">
          {/* Logo with Chef Hat, Wok & Flame */}
          <div className="bepnhau-logo-section">
            <div className="bepnhau-emblem">
              <svg
                width="64"
                height="64"
                viewBox="0 0 100 100"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="bepnhau-emblem-svg"
              >
                {/* Chef Hat */}
                <path
                  d="M50 14C39 14 34 22 34 28C30 28 26 32 26 37C26 43 31 46 34 46L66 46C69 46 74 43 74 37C74 32 70 28 66 28C66 22 61 14 50 14Z"
                  stroke="#c25e2e"
                  strokeWidth="3.5"
                  fill="#ffffff"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M36 46L36 52C36 53 37 54 38 54L62 54C63 54 64 53 64 52L64 46"
                  stroke="#c25e2e"
                  strokeWidth="3.5"
                  fill="#ffffff"
                  strokeLinecap="round"
                />
                {/* Flame in Wok */}
                <path
                  d="M48 38C52 32 46 26 52 22C56 27 60 30 58 35C56 40 48 38 48 38Z"
                  fill="#f97316"
                />
                <path
                  d="M45 42C48 36 43 32 47 28C50 32 52 35 50 39C49 43 45 42 45 42Z"
                  fill="#fbbf24"
                />
                {/* Wok Pan */}
                <path
                  d="M28 58C32 68 68 68 72 58L28 58Z"
                  fill="#292524"
                  stroke="#1c1917"
                  strokeWidth="2.5"
                />
                {/* Wok Handle */}
                <path
                  d="M72 60L86 52"
                  stroke="#292524"
                  strokeWidth="4.5"
                  strokeLinecap="round"
                />
              </svg>
            </div>

            <div className="bepnhau-brand-name">
              <span className="brand-prefix">QUÁN</span>
              <span className="brand-main">XUNG TI</span>
            </div>
          </div>

          <h1 className="bepnhau-title">ĐĂNG NHẬP HỆ THỐNG QUẢN LÝ</h1>

          {/* Form */}
          <form className="bepnhau-form" onSubmit={submit}>
            {/* Username / Email / Phone */}
            <div className="bepnhau-input-wrapper">
              <User size={18} className="bepnhau-input-icon" />
              <input
                type="text"
                value={usernameOrEmail}
                onChange={(e) => setUsernameOrEmail(e.target.value)}
                placeholder="Tài khoản (Email hoặc SĐT)"
                autoComplete="username"
                required
                autoFocus
                className="bepnhau-input"
              />
            </div>

            {/* Forgot Password Link */}
            <div className="bepnhau-forgot-row">
              <button
                type="button"
                className="bepnhau-forgot-link"
                onClick={() =>
                  alert("Vui lòng liên hệ Quản lý nhà hàng hoặc IT để được hỗ trợ cấp lại mật khẩu.")
                }
              >
                Quên mật khẩu?
              </button>
            </div>

            {/* Password Field */}
            <div className="bepnhau-input-wrapper">
              <Lock size={18} className="bepnhau-input-icon" />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mật khẩu"
                autoComplete="current-password"
                required
                className="bepnhau-input"
              />
              <button
                type="button"
                className="bepnhau-eye-btn"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            {error && (
              <div className="bepnhau-error-banner" role="alert">
                <p>{error}</p>
              </div>
            )}

            {/* Submit Button (Flame Orange Gradient Pill) */}
            <button type="submit" className="bepnhau-submit-btn" disabled={busy}>
              {busy ? "ĐANG ĐĂNG NHẬP..." : "ĐĂNG NHẬP"}
            </button>
          </form>

          {/* Footer note */}
          <div className="bepnhau-footer">
            <span>Chưa có tài khoản? </span>
            <button
              type="button"
              className="bepnhau-register-link"
              onClick={() =>
                alert("Hệ thống quản lý nội bộ. Vui lòng liên hệ Quản lý để được tạo tài khoản nhân sự.")
              }
            >
              Đăng ký ngay
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}