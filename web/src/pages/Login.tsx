import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "../auth.tsx";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

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
      navigate("/dashboard");
    } catch (err) {
      setServerError(
        err instanceof Error ? err.message : "Invalid email or password",
      );
    }
  }

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: "#1c1c1e" }}>
      {/* Left panel — brand */}
      <div className="hidden lg:flex w-80 shrink-0 flex-col justify-between px-10 py-12 border-r border-white/10">
        <div>
          <span className="text-white text-xl font-semibold tracking-tight">SupportGrid</span>
          <p className="mt-4 text-white/40 text-sm leading-relaxed">
            AI-powered support ticket management for your team.
          </p>
        </div>
        <p className="text-white/20 text-xs">Internal console · Agents only</p>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center bg-background px-6">
      <Card className="w-full max-w-md shadow-md border-border/60">
        <CardHeader className="pb-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1 lg:hidden">SupportGrid</p>
          <CardTitle className="text-2xl font-bold">Sign in</CardTitle>
          <CardDescription>Enter your credentials to access the console</CardDescription>
        </CardHeader>
        <CardContent>
          {serverError && (
            <div className="mb-4 rounded-lg bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive border border-destructive/20">
              {serverError}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
            <div className="flex flex-col gap-2">
              <Label htmlFor="email" className="text-sm font-semibold">Email</Label>
              <Input
                id="email"
                type="email"
                autoFocus
                autoComplete="email"
                className="h-11 text-base"
                aria-invalid={!!errors.email}
                {...register("email")}
              />
              {errors.email && (
                <span className="text-sm text-destructive">{errors.email.message}</span>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="password" className="text-sm font-semibold">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                className="h-11 text-base"
                aria-invalid={!!errors.password}
                {...register("password")}
              />
              {errors.password && (
                <span className="text-sm text-destructive">{errors.password.message}</span>
              )}
            </div>

            <Button type="submit" disabled={isSubmitting} size="lg" className="w-full mt-1">
              {isSubmitting ? "Signing in…" : "Sign in"}
            </Button>
          </form>
        </CardContent>
      </Card>
      </div>
    </div>
  );
}
