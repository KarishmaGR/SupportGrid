import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "../auth.tsx";

const schema = z.object({
  email: z.string().min(1, "Email is required").email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

type FormValues = z.infer<typeof schema>;

export function LoginPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function onSubmit(values: FormValues) {
    setServerError("");
    try {
      await signIn(values.email, values.password);
      navigate("/");
    } catch (err) {
      setServerError(
        err instanceof Error ? err.message : "Invalid email or password",
      );
    }
  }

  return (
    <div className="login-wrapper">
      <div className="login-card">
        <h1 className="login-title">SupportGrid</h1>
        <p className="muted" style={{ marginBottom: 24 }}>
          Sign in to your account
        </p>

        {serverError && (
          <div className="server-error">{serverError}</div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="login-form" noValidate>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              autoFocus
              autoComplete="email"
              className={errors.email ? "input-error" : ""}
              {...register("email")}
            />
            {errors.email && (
              <span className="field-error">{errors.email.message}</span>
            )}
          </div>

          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              className={errors.password ? "input-error" : ""}
              {...register("password")}
            />
            {errors.password && (
              <span className="field-error">{errors.password.message}</span>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            style={{ width: "100%", justifyContent: "center" }}
          >
            {isSubmitting ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
