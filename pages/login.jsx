import { useState } from "react";
import { useRouter } from "next/router";
import { FaEye, FaEyeSlash, FaLock, FaUser } from "react-icons/fa";
import { getUserFromRequest } from "@/lib/auth";

export async function getServerSideProps(context) {
  const user = await getUserFromRequest(context.req);

  if (user) {
    return {
      redirect: {
        destination: "/dashboard",
        permanent: false,
      },
    };
  }

  return { props: {} };
}

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Unable to sign in");
      }

      await router.replace("/dashboard");
    } catch (loginError) {
      setError(loginError.message || "Unable to sign in");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-8 text-white sm:px-6 lg:px-8">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl overflow-hidden rounded-[2rem] border border-white/10 bg-white/5 shadow-2xl backdrop-blur md:grid-cols-[1.1fr_0.9fr]">
        <div className="relative flex flex-col justify-between bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 p-8 md:p-12">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(148,163,184,0.25),transparent_36%),radial-gradient(circle_at_bottom_left,rgba(15,23,42,0.5),transparent_30%)]" />
          <div className="relative z-10">
            <div className="inline-flex rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-slate-300">
              Secure Access
            </div>
            <h1 className="mt-6 max-w-xl text-4xl font-black leading-tight text-white sm:text-5xl">
              Sign in to your Quantum Admissions dashboard.
            </h1>
            <p className="mt-4 max-w-lg text-base leading-7 text-slate-300">
              JWT sessions are stored in HttpOnly cookies, so refreshes keep you logged in while the dashboard stays protected.
            </p>
          </div>

          <div className="relative z-10 grid gap-4 sm:grid-cols-3">
            {[
              ["JWT", "HttpOnly cookie session"],
              ["RBAC", "Role-aware access"],
              ["Neon", "PostgreSQL backed auth"],
            ].map(([title, copy]) => (
              <div key={title} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-sm font-semibold text-white">{title}</p>
                <p className="mt-1 text-sm text-slate-300">{copy}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-center bg-slate-50 p-8 md:p-12">
          <form
            onSubmit={handleSubmit}
            className="w-full max-w-md rounded-[1.75rem] border border-slate-200 bg-white p-8 shadow-[0_20px_60px_rgba(15,23,42,0.12)]"
          >
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-slate-900">Welcome back</h2>
              <p className="mt-2 text-sm text-slate-500">Use your staff credentials to continue.</p>
            </div>

            <label className="mb-4 block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">Username</span>
              <div className="flex items-center rounded-2xl border border-slate-200 bg-slate-50 px-4 focus-within:border-slate-900">
                <FaUser className="text-slate-400" />
                <input
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  className="w-full bg-transparent px-3 py-4 text-sm text-slate-900 outline-none placeholder:text-slate-400"
                  placeholder="Enter username"
                  autoComplete="username"
                />
              </div>
            </label>

            <label className="mb-2 block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">Password</span>
              <div className="flex items-center rounded-2xl border border-slate-200 bg-slate-50 px-4 focus-within:border-slate-900">
                <FaLock className="text-slate-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full bg-transparent px-3 py-4 text-sm text-slate-900 outline-none placeholder:text-slate-400"
                  placeholder="Enter password"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
            </label>

            <div className="mb-4 flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input type="checkbox" className="rounded border-slate-300 text-slate-900 focus:ring-slate-900" />
                Remember this device
              </label>
            </div>

            {error ? (
              <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center rounded-2xl bg-slate-900 px-4 py-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>

            <p className="mt-6 text-center text-xs leading-6 text-slate-500">
              Protected by JWT authentication and HttpOnly cookies.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
