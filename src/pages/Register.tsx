import { useState, useEffect, useRef } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { SwipeVerify } from "@/components/SwipeVerify";
import { useToast } from "@/hooks/use-toast";
import { validateEmail as validateEmailSecurity } from "@/lib/emailValidation";
import RainEffect from "@/components/RainEffect";
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
  ShieldAlert,
  Ghost,
  Skull
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

  // Horror Mode State
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const isHorrorMode = searchParams.get('type') === 'horror';

  const navigate = useNavigate();
  const { toast } = useToast();

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Check if already logged in
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/");
      }
    });

    return () => {
    };
  }, [navigate, isHorrorMode]);

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
          title: isHorrorMode ? "PROVE YOUR HUMANITY!" : "Verification required",
          description: isHorrorMode ? "Are you a bot... or a soul?" : "Please verify you are human first.",
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
        title: isHorrorMode ? "THE CODE HAS BEEN SUMMONED" : "Code sent!",
        description: "Check your email... if you dare.",
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

      if (fnError) {
        console.error("verify-otp error:", fnError);
        throw new Error(fnError.message || "Registration failed. Please try again.");
      }

      if (data?.error) {
        console.error("verify-otp data error:", data.error);

        // If "No supported source", it might be a Supabase config issue, but we can try to warn the user
        if (data.error.includes("No supported source")) {
          throw new Error("Registration system error. Please contact admin or try standard Sign Up.");
        }
        throw new Error(data.error);
      }

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
      if (isHorrorMode) {
        // Play spooky success sound or just toast
        const scream = new Audio("https://actions.google.com/sounds/v1/horror/female_scream_horror.ogg");
        scream.volume = 0.2;
        scream.play().catch(() => { });
      }

      toast({
        title: isHorrorMode ? "WELCOME TO THE NIGHTMARE" : "Welcome to ZetsuServ!",
        description: "Your account has been created successfully.",
        className: isHorrorMode ? "bg-red-950 border-red-900 text-red-200" : undefined
      });

      const redirectTo = searchParams.get('redirectTo');
      setTimeout(() => navigate(redirectTo || "/"), 2000);
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
    const inputBg = isHorrorMode ? "bg-red-950/20 border-red-900/50 text-red-100 placeholder:text-red-900/50" : "";
    const labelColor = isHorrorMode ? "text-red-400 font-serif" : "";
    const iconColor = isHorrorMode ? "text-red-600" : "text-muted-foreground";

    switch (step) {
      case "email":
        return (
          <div className="space-y-6 animate-fade-in relative z-10">
            <div className="space-y-2 text-center">
              <h1 className={`text-2xl font-semibold tracking-tight ${isHorrorMode ? 'text-red-500 font-serif tracking-widest' : ''}`}>
                {isHorrorMode ? "OFFER YOUR SOUL (ACCOUNT)" : "Create your account"}
              </h1>
              <p className={`text-sm ${isHorrorMode ? 'text-red-400/70 italic' : 'text-muted-foreground'}`}>
                {isHorrorMode ? "Join the darkness... escape the void." : "Join ZetsuServ and start exploring"}
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className={labelColor}>Email address</Label>
                <div className="relative">
                  <Mail className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 ${iconColor}`} />
                  <Input
                    id="email"
                    type="email"
                    placeholder={isHorrorMode ? "soul@void.com" : "you@example.com"}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onBlur={validateEmail}
                    className={`pl-10 ${inputBg}`}
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
                <Label className={labelColor}>Verify you are {isHorrorMode ? "Alive" : "human"}</Label>
                <SwipeVerify
                  onVerified={() => setIsHumanVerified(true)}
                  verified={isHumanVerified}
                />
              </div>

              <Button
                onClick={sendOTP}
                className={`w-full ${isHorrorMode
                  ? 'bg-red-900 hover:bg-red-800 text-red-100 shadow-[0_0_15px_rgba(220,38,38,0.3)] border border-red-700'
                  : ''}`}
                disabled={isLoading || !email || !isHumanVerified}
              >
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <ArrowRight className="mr-2 h-4 w-4" />
                )}
                {isHorrorMode ? "ACCEPT FATE" : "Continue"}
              </Button>
            </div>

            <div className="text-center text-sm">
              <span className={isHorrorMode ? "text-red-900" : "text-muted-foreground"}>
                {isHorrorMode ? "Already trapped? " : "Already have an account? "}
              </span>
              <Link
                to={`/auth${isHorrorMode ? '?type=horror' : ''}${searchParams.get('redirectTo') ? `${isHorrorMode ? '&' : '?'}redirectTo=${searchParams.get('redirectTo')}` : ''}`}
                className={isHorrorMode ? "text-red-400 hover:text-red-300 font-bold" : "text-foreground hover:underline"}
              >
                {isHorrorMode ? "Return to Suffering (Sign in)" : "Sign in"}
              </Link>
            </div>
          </div>
        );

      case "verify":
        return (
          <div className="space-y-6 animate-fade-in relative z-10">
            <button
              onClick={() => setStep("email")}
              className={`flex items-center gap-2 text-sm transition-colors ${isHorrorMode ? 'text-red-500 hover:text-red-300' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>

            <div className="space-y-2 text-center">
              <h1 className={`text-2xl font-semibold tracking-tight ${isHorrorMode ? 'text-red-500 font-serif' : ''}`}>Check your email</h1>
              <p className={`text-sm ${isHorrorMode ? 'text-red-400/80' : 'text-muted-foreground'}`}>
                We sent a {isHorrorMode ? "blood pact" : "verification code"} to<br />
                <span className={`font-medium ${isHorrorMode ? 'text-red-300' : 'text-foreground'}`}>{email}</span>
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="otp" className={labelColor}>Verification code</Label>
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
                  className={`text-center text-2xl tracking-[0.5em] font-mono ${inputBg}`}
                  maxLength={6}
                  disabled={isLoading}
                />
                {errors.otp && (
                  <p className="text-xs text-destructive text-center">{errors.otp}</p>
                )}
              </div>

              <Button
                onClick={verifyOTP}
                className={`w-full ${isHorrorMode ? 'bg-red-900 hover:bg-red-800 text-red-100 border border-red-700' : ''}`}
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
                  className={`text-sm transition-colors disabled:opacity-50 ${isHorrorMode ? 'text-red-500 hover:text-red-300' : 'text-muted-foreground hover:text-foreground'}`}
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
          <div className="space-y-6 animate-fade-in relative z-10">
            <button
              onClick={() => setStep("verify")}
              className={`flex items-center gap-2 text-sm transition-colors ${isHorrorMode ? 'text-red-500 hover:text-red-300' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>

            <div className="space-y-2 text-center">
              <h1 className={`text-2xl font-semibold tracking-tight ${isHorrorMode ? 'text-red-500 font-serif' : ''}`}>Complete your profile</h1>
              <p className={`text-sm ${isHorrorMode ? 'text-red-400/80' : 'text-muted-foreground'}`}>
                Just a few more details to get {isHorrorMode ? "doomed" : "started"}
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName" className={labelColor}>Full name</Label>
                <div className="relative">
                  <User className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 ${iconColor}`} />
                  <Input
                    id="fullName"
                    type="text"
                    placeholder="Your name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className={`pl-10 ${inputBg}`}
                    disabled={isLoading}
                  />
                </div>
                {errors.fullName && (
                  <p className="text-xs text-destructive">{errors.fullName}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className={labelColor}>Password</Label>
                <div className="relative">
                  <Lock className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 ${iconColor}`} />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={`pl-10 pr-10 ${inputBg}`}
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className={`absolute right-3 top-1/2 -translate-y-1/2 ${isHorrorMode ? 'text-red-500 hover:text-red-300' : 'text-muted-foreground hover:text-foreground'}`}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-xs text-destructive">{errors.password}</p>
                )}
                <p className={`text-xs ${isHorrorMode ? 'text-red-500/60' : 'text-muted-foreground'}`}>
                  At least 8 characters with uppercase and number
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className={labelColor}>Confirm password</Label>
                <div className="relative">
                  <Lock className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 ${iconColor}`} />
                  <Input
                    id="confirmPassword"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={`pl-10 ${inputBg}`}
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
                  className={isHorrorMode ? "border-red-500 data-[state=checked]:bg-red-600 data-[state=checked]:text-white" : ""}
                />
                <Label htmlFor="keepSignedIn" className={`text-sm font-normal cursor-pointer ${isHorrorMode ? 'text-red-300' : ''}`}>
                  Keep me signed in for 30 days
                </Label>
              </div>

              <Button
                onClick={completeRegistration}
                className={`w-full ${isHorrorMode ? 'bg-red-900 hover:bg-red-800 text-red-100 border border-red-700 shadow-[0_0_20px_rgba(220,38,38,0.4)]' : ''}`}
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                {isHorrorMode ? "SEAL THE PACT (Create Account)" : "Create account"}
              </Button>
            </div>

            <p className={`text-xs text-center ${isHorrorMode ? 'text-red-500/60' : 'text-muted-foreground'}`}>
              By creating an account, you agree to our{" "}
              <Link to="/terms" className="underline hover:text-foreground">Terms</Link>
              {" "}and{" "}
              <Link to="/privacy" className="underline hover:text-foreground">Privacy Policy</Link>
            </p>
          </div>
        );

      case "complete":
        return (
          <div className="space-y-6 text-center animate-fade-in relative z-10">
            <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center ${isHorrorMode ? 'bg-red-500/20' : 'bg-primary/10'}`}>
              {isHorrorMode ? <Ghost className="h-8 w-8 text-red-500 animate-bounce" /> : <CheckCircle2 className="h-8 w-8 text-primary" />}
            </div>
            <div className="space-y-2">
              <h1 className={`text-2xl font-semibold tracking-tight ${isHorrorMode ? 'text-red-500 font-serif' : ''}`}>
                {isHorrorMode ? "WELCOME ABOARD!" : "Welcome aboard!"}
              </h1>
              <p className={isHorrorMode ? "text-red-300" : "text-muted-foreground"}>
                Your account has been created successfully.
              </p>
            </div>
            <p className={`text-sm ${isHorrorMode ? 'text-red-500/70' : 'text-muted-foreground'}`}>
              Redirecting you to the {isHorrorMode ? "nightmare..." : "homepage..."}
            </p>
          </div>
        );
    }
  };

  // Progress indicator
  const steps = ["email", "verify", "details", "complete"] as const;
  const currentStepIndex = steps.indexOf(step);

  return (
    <div className={`min-h-screen flex flex-col ${isHorrorMode ? 'bg-black overflow-hidden' : ''}`}>
      {/* Horror Mode Effects */}
      {isHorrorMode && (
        <>
          <RainEffect />
          <div className="fixed inset-0 bg-gradient-to-b from-black via-red-950/20 to-black pointer-events-none z-0"></div>
          {/* Occasional Lightning Flash via logic inside RainEffect but we can add overlay here too if needed */}
        </>
      )}

      {/* Progress bar */}
      <div className={`fixed top-0 left-0 right-0 h-1 ${isHorrorMode ? 'bg-red-950/30' : 'bg-muted'} z-20`}>
        <div
          className={`h-full transition-all duration-500 ${isHorrorMode ? 'bg-red-600 shadow-[0_0_10px_#dc2626]' : 'bg-primary'}`}
          style={{ width: `${((currentStepIndex + 1) / steps.length) * 100}%` }}
        />
      </div>

      <div className="flex-1 flex items-center justify-center p-4 relative z-10">
        <div className={`w-full max-w-sm ${isHorrorMode ? 'p-8 rounded-3xl bg-black/40 backdrop-blur-sm border border-red-900/30 shadow-2xl shadow-red-900/20' : ''}`}>
          <Link
            to="/"
            className={`flex justify-center mb-8 text-xl font-semibold tracking-tight transition-opacity ${isHorrorMode ? 'text-red-500 hover:text-red-400 font-black tracking-[0.5em] uppercase' : 'hover:opacity-70'}`}
          >
            {isHorrorMode ? <span className="flex items-center gap-2"><Skull className="w-6 h-6" /> ZetsuServ</span> : "ZetsuServ"}
          </Link>

          {renderStep()}
        </div>
      </div>
    </div>
  );
}

