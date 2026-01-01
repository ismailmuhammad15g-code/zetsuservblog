import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { SwipeVerify } from "@/components/SwipeVerify";
import { useToast } from "@/hooks/use-toast";
import { validateEmail as validateEmailSecurity } from "@/lib/emailValidation";
import {
  Loader2,
  ArrowLeft,
  ArrowRight,
  Mail,
  Lock,
  User,
  CheckCircle2,
  Eye,
  EyeOff,
  ShieldAlert
} from "lucide-react";
import { z } from "zod";

const passwordSchema = z.string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Password must contain an uppercase letter")
  .regex(/[0-9]/, "Password must contain a number");

type Step = "email" | "verify" | "details" | "complete";

export default function Register() {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [keepSignedIn, setKeepSignedIn] = useState(true);
  const [isHumanVerified, setIsHumanVerified] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const navigate = useNavigate();
  const { toast } = useToast();

  // Check if already logged in
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/");
      }
    });
  }, [navigate]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const validateEmail = () => {
    const validationResult = validateEmailSecurity(email);

    if (!validationResult.isValid) {
      setErrors(prev => ({
        ...prev,
        email: validationResult.error || 'Invalid email address',
        emailErrorType: validationResult.errorType || 'format'
      }));
      return false;
    }

    setErrors(prev => ({ ...prev, email: "", emailErrorType: "" }));
    return true;
  };

  const validatePassword = () => {
    const newErrors: Record<string, string> = {};

    try {
      passwordSchema.parse(password);
    } catch (e) {
      if (e instanceof z.ZodError) {
        newErrors.password = e.errors[0].message;
      }
    }

    if (password !== confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    if (!fullName.trim()) {
      newErrors.fullName = "Name is required";
    }

    setErrors(prev => ({ ...prev, ...newErrors }));
    return Object.keys(newErrors).length === 0;
  };

  const sendOTP = async () => {
    if (!validateEmail() || !isHumanVerified) {
      if (!isHumanVerified) {
        toast({
          title: "Verification required",
          description: "Please verify you are human first.",
          variant: "destructive",
        });
      }
      return;
    }

    setIsLoading(true);
    try {
      const response = await supabase.functions.invoke("verify-otp", {
        body: { email, action: "send" },
      });

      if (response.error) throw response.error;

      toast({
        title: "Code sent!",
        description: "Check your email for the verification code.",
      });
      setStep("verify");
      setResendCooldown(60);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send verification code",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const verifyOTP = async () => {
    if (otpCode.length !== 6) {
      setErrors(prev => ({ ...prev, otp: "Please enter the 6-digit code" }));
      return;
    }

    setIsLoading(true);
    try {
      const response = await supabase.functions.invoke("verify-otp", {
        body: { email, action: "verify", code: otpCode },
      });

      if (response.error || !response.data?.verified) {
        throw new Error(response.data?.error || "Invalid verification code");
      }

      toast({
        title: "Email verified!",
        description: "Now complete your account setup.",
      });
      setStep("details");
    } catch (error: any) {
      setErrors(prev => ({ ...prev, otp: error.message }));
      toast({
        title: "Verification failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const completeRegistration = async () => {
    if (!validatePassword()) return;

    setIsLoading(true);
    try {
      // 1. Create confirmed user via server function
      const { data, error: fnError } = await supabase.functions.invoke("verify-otp", {
        body: {
          action: "register",
          email,
          password,
          fullName
        }
      });

      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);

      // 2. Sign in immediately
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) throw signInError;

      // Set session persistence based on keepSignedIn
      if (!keepSignedIn) {
        // Clear session after browser closes (session storage behavior)
        localStorage.removeItem('sb-cbkexpjttanvpqxtzeie-auth-token');
      }

      setStep("complete");
      toast({
        title: "Welcome to ZetsuServ!",
        description: "Your account has been created successfully.",
      });

      setTimeout(() => navigate("/"), 2000);
    } catch (error: any) {
      toast({
        title: "Registration failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case "email":
        return (
          <div className="space-y-6 animate-fade-in">
            <div className="space-y-2 text-center">
              <h1 className="text-2xl font-semibold tracking-tight">Create your account</h1>
              <p className="text-sm text-muted-foreground">
                Join ZetsuServ and start exploring
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onBlur={validateEmail}
                    className="pl-10"
                    disabled={isLoading}
                  />
                </div>
                {errors.email && (
                  <div className={`flex items-center gap-1.5 text-xs ${errors.emailErrorType === 'disposable' ? 'text-orange-600 dark:text-orange-400' : 'text-destructive'}`}>
                    {errors.emailErrorType === 'disposable' && <ShieldAlert className="h-3.5 w-3.5" />}
                    <span>{errors.email}</span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>Verify you are human</Label>
                <SwipeVerify
                  onVerified={() => setIsHumanVerified(true)}
                  verified={isHumanVerified}
                />
              </div>

              <Button
                onClick={sendOTP}
                className="w-full"
                disabled={isLoading || !email || !isHumanVerified}
              >
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <ArrowRight className="mr-2 h-4 w-4" />
                )}
                Continue
              </Button>
            </div>

            <div className="text-center text-sm">
              <span className="text-muted-foreground">Already have an account? </span>
              <Link to="/auth" className="text-foreground hover:underline">
                Sign in
              </Link>
            </div>
          </div>
        );

      case "verify":
        return (
          <div className="space-y-6 animate-fade-in">
            <button
              onClick={() => setStep("email")}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>

            <div className="space-y-2 text-center">
              <h1 className="text-2xl font-semibold tracking-tight">Check your email</h1>
              <p className="text-sm text-muted-foreground">
                We sent a verification code to<br />
                <span className="font-medium text-foreground">{email}</span>
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="otp">Verification code</Label>
                <Input
                  id="otp"
                  type="text"
                  placeholder="000000"
                  value={otpCode}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, "").slice(0, 6);
                    setOtpCode(value);
                    setErrors(prev => ({ ...prev, otp: "" }));
                  }}
                  className="text-center text-2xl tracking-[0.5em] font-mono"
                  maxLength={6}
                  disabled={isLoading}
                />
                {errors.otp && (
                  <p className="text-xs text-destructive text-center">{errors.otp}</p>
                )}
              </div>

              <Button
                onClick={verifyOTP}
                className="w-full"
                disabled={isLoading || otpCode.length !== 6}
              >
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                )}
                Verify
              </Button>

              <div className="text-center">
                <button
                  onClick={sendOTP}
                  disabled={resendCooldown > 0 || isLoading}
                  className="text-sm text-muted-foreground hover:text-foreground disabled:opacity-50 transition-colors"
                >
                  {resendCooldown > 0
                    ? `Resend code in ${resendCooldown}s`
                    : "Didn't receive it? Resend code"}
                </button>
              </div>
            </div>
          </div>
        );

      case "details":
        return (
          <div className="space-y-6 animate-fade-in">
            <button
              onClick={() => setStep("verify")}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>

            <div className="space-y-2 text-center">
              <h1 className="text-2xl font-semibold tracking-tight">Complete your profile</h1>
              <p className="text-sm text-muted-foreground">
                Just a few more details to get started
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="fullName"
                    type="text"
                    placeholder="Your name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="pl-10"
                    disabled={isLoading}
                  />
                </div>
                {errors.fullName && (
                  <p className="text-xs text-destructive">{errors.fullName}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-xs text-destructive">{errors.password}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  At least 8 characters with uppercase and number
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-10"
                    disabled={isLoading}
                  />
                </div>
                {errors.confirmPassword && (
                  <p className="text-xs text-destructive">{errors.confirmPassword}</p>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="keepSignedIn"
                  checked={keepSignedIn}
                  onCheckedChange={(checked) => setKeepSignedIn(checked as boolean)}
                />
                <Label htmlFor="keepSignedIn" className="text-sm font-normal cursor-pointer">
                  Keep me signed in for 30 days
                </Label>
              </div>

              <Button
                onClick={completeRegistration}
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Create account
              </Button>
            </div>

            <p className="text-xs text-center text-muted-foreground">
              By creating an account, you agree to our{" "}
              <Link to="/terms" className="underline hover:text-foreground">Terms</Link>
              {" "}and{" "}
              <Link to="/privacy" className="underline hover:text-foreground">Privacy Policy</Link>
            </p>
          </div>
        );

      case "complete":
        return (
          <div className="space-y-6 text-center animate-fade-in">
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-primary" />
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-semibold tracking-tight">Welcome aboard!</h1>
              <p className="text-muted-foreground">
                Your account has been created successfully.
              </p>
            </div>
            <p className="text-sm text-muted-foreground">
              Redirecting you to the homepage...
            </p>
          </div>
        );
    }
  };

  // Progress indicator
  const steps = ["email", "verify", "details", "complete"] as const;
  const currentStepIndex = steps.indexOf(step);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Progress bar */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-muted">
        <div
          className="h-full bg-primary transition-all duration-500"
          style={{ width: `${((currentStepIndex + 1) / steps.length) * 100}%` }}
        />
      </div>

      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <Link
            to="/"
            className="flex justify-center mb-8 text-xl font-semibold tracking-tight hover:opacity-70 transition-opacity"
          >
            ZetsuServ
          </Link>

          {renderStep()}
        </div>
      </div>
    </div>
  );
}
