import { useState, useEffect } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft, Mail, Lock, Eye, EyeOff, KeyRound, ShieldCheck, CheckCircle2, Skull } from "lucide-react";
import { validateEmail as validateEmailSecurity } from "@/lib/emailValidation";
import RainEffect from "@/components/RainEffect";

type AuthView = "login" | "forgot_email" | "forgot_reset" | "verify_email";

export default function Auth() {
  const [view, setView] = useState<AuthView>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // States for verification flows
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const searchParams = new URLSearchParams(location.search);
  const isHorrorMode = searchParams.get('type') === 'horror';
  const redirectTo = searchParams.get('redirectTo');

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (session && event === "SIGNED_IN") {
          navigate(redirectTo || "/");
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate(redirectTo || "/");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);



  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setLoginError(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      toast({
        title: isHorrorMode ? "WELCOME BACK TO THE ABYSS" : "Welcome back",
        description: isHorrorMode ? "Your soul is still intact... for now." : "You've successfully signed in.",
        className: isHorrorMode ? "bg-red-950 border-red-800 text-red-200" : undefined,
      });
    } catch (error: any) {
      const msg = error.message || "An error occurred";
      setLoginError(msg);

      toast({
        title: isHorrorMode ? "ACCESS DENIED" : "Login Failed",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const startVerification = async () => {
    setIsLoading(true);
    try {
      // Send OTP
      const { data, error } = await supabase.functions.invoke('verify-otp', {
        body: { email, action: 'send' }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({
        title: "Code Sent",
        description: "Check your email for the verification code.",
        className: isHorrorMode ? "bg-red-950 border-red-800 text-red-200" : undefined,
      });
      setView("verify_email");
      setLoginError(null);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send code",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('verify-otp', {
        body: {
          email,
          code: otp,
          action: 'confirm_email'
        }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({
        title: "Account Verified",
        description: "Your email has been confirmed. You can now login.",
        className: isHorrorMode ? "bg-red-950 border-red-800 text-red-200" : undefined,
      });

      setView("login");
      setOtp("");

    } catch (error: any) {
      toast({
        title: "Verification Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendResetOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Validate email security
    const validation = validateEmailSecurity(email);
    if (!validation.isValid) {
      toast({
        title: "Invalid Email",
        description: validation.error,
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('verify-otp', {
        body: {
          email: email,
          action: 'send',
          type: 'reset'
        }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      toast({
        title: "Code Sent",
        description: "Please check your email for the reset code.",
        className: isHorrorMode ? "bg-red-950 border-red-800 text-red-200" : undefined,
      });
      setView("forgot_reset");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send code",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    if (newPassword.length < 6) {
      toast({
        title: "Invalid Password",
        description: "Password must be at least 6 characters.",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('verify-otp', {
        body: {
          email: email,
          code: otp,
          newPassword: newPassword,
          action: 'reset_password'
        }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      toast({
        title: "Success",
        description: "Your password has been reset. You can now login.",
        className: isHorrorMode ? "bg-red-950 border-red-800 text-red-200" : undefined,
      });

      setPassword(newPassword);
      setView("login");
      setOtp("");

    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to reset password",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Helper styles based on mode
  const containerClass = isHorrorMode
    ? "min-h-screen flex flex-col items-center justify-center px-4 bg-black relative overflow-hidden"
    : "min-h-screen flex flex-col items-center justify-center px-4 bg-gradient-to-br from-background via-background to-muted/20";

  const cardClass = isHorrorMode
    ? "w-full max-w-sm animate-fade-in relative z-10 bg-black/80 border border-red-900/50 p-8 rounded-xl shadow-[0_0_30px_rgba(220,38,38,0.2)] backdrop-blur-md"
    : "w-full max-w-sm animate-fade-in";

  const textClass = isHorrorMode ? "text-red-500 font-crimson" : "text-muted-foreground";
  const headingClass = isHorrorMode ? "text-3xl font-bold tracking-tight text-red-600 font-nosifer drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]" : "text-2xl font-semibold tracking-tight";
  const labelClass = isHorrorMode ? "text-red-400 font-crimson text-lg" : "";
  const inputClass = isHorrorMode
    ? "bg-black/50 border-red-900/50 text-red-200 placeholder:text-red-900/50 focus:border-red-500 focus:ring-red-900/20"
    : "pl-10";

  return (
    <div className={containerClass}>
      {isHorrorMode && <RainEffect />}

      <div className={cardClass}>
        <Link
          to="/"
          className={`inline-flex items-center gap-2 text-sm hover:text-foreground transition-colors mb-8 ${isHorrorMode ? 'text-red-400 hover:text-red-300' : 'text-muted-foreground'}`}
        >
          <ArrowLeft className="h-4 w-4" />
          {isHorrorMode ? "ESCAPE" : "Back to blog"}
        </Link>

        {isHorrorMode && (
          <div className="flex justify-center mb-6">
            <Skull className="h-12 w-12 text-red-600 animate-pulse" />
          </div>
        )}

        {/* LOGIN VIEW */}
        {view === "login" && (
          <div className="animate-in slide-in-from-right-4 fade-in duration-300">
            <div className="mb-8 text-center">
              <h1 className={headingClass}>{isHorrorMode ? "ENTER THE VOID" : "Sign in"}</h1>
              <p className={`mt-2 text-sm ${textClass}`}>
                {isHorrorMode ? "Offer your soul to proceed..." : "Enter your credentials to access your account"}
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className={labelClass}>Email</Label>
                <div className="relative">
                  <Mail className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 ${isHorrorMode ? 'text-red-700' : 'text-muted-foreground'}`} />
                  <Input
                    id="email"
                    type="email"
                    placeholder={isHorrorMode ? "soul@void.com" : "you@example.com"}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={isHorrorMode ? `pl-10 ${inputClass}` : "pl-10"}
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className={labelClass}>Password</Label>
                  <button
                    type="button"
                    onClick={() => setView("forgot_email")}
                    className={`text-xs hover:underline ${isHorrorMode ? 'text-red-500 hover:text-red-400' : 'text-primary hover:text-primary/80'}`}
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 ${isHorrorMode ? 'text-red-700' : 'text-muted-foreground'}`} />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={isHorrorMode ? `pl-10 pr-10 ${inputClass}` : "pl-10 pr-10"}
                    required
                    minLength={6}
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className={`absolute right-3 top-1/2 -translate-y-1/2 hover:text-foreground ${isHorrorMode ? 'text-red-700' : 'text-muted-foreground'}`}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {loginError && loginError.includes("Email not confirmed") && (
                <div className={`${isHorrorMode ? 'bg-red-950/50 border-red-900 text-red-300' : 'bg-destructive/10 border-destructive/20 text-destructive'} border rounded-lg p-3 text-sm flex flex-col gap-2`}>
                  <p>Your email address has not been confirmed yet.</p>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={startVerification}
                    className="w-full"
                  >
                    Verify Account Now
                  </Button>
                </div>
              )}

              <Button
                type="submit"
                className={`w-full ${isHorrorMode ? 'bg-red-900 hover:bg-red-800 text-white border border-red-700 shadow-[0_0_15px_rgba(220,38,38,0.5)]' : ''}`}
                disabled={isLoading}
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isHorrorMode ? "SUBMIT TO DARKNESS" : "Sign in"}
              </Button>
            </form>

            <div className="mt-6 text-center space-y-2">
              <Link
                to={`/register${isHorrorMode ? '?type=horror' : ''}${redirectTo ? `${isHorrorMode ? '&' : '?'}redirectTo=${redirectTo}` : ''}`}
                className={`block w-full text-sm hover:underline ${isHorrorMode ? 'text-red-400 hover:text-red-300' : 'text-muted-foreground hover:text-foreground'}`}
              >
                {isHorrorMode ? "Trapped? Create a new nightmare (Sign up)" : "Don't have an account? Sign up"}
              </Link>
            </div>
          </div>
        )}

        {/* VERIFY EMAIL VIEW */}
        {view === "verify_email" && (
          <div className="animate-in slide-in-from-right-4 fade-in duration-300">
            <div className="mb-8 text-center">
              <h1 className={headingClass}>Verify Account</h1>
              <p className={`mt-2 text-sm ${textClass}`}>
                Enter the verification code sent to <strong>{email}</strong>
              </p>
            </div>

            <form onSubmit={handleVerifyEmail} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="verify-otp" className={labelClass}>Verification Code</Label>
                <div className="relative">
                  <CheckCircle2 className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 ${isHorrorMode ? 'text-red-700' : 'text-muted-foreground'}`} />
                  <Input
                    id="verify-otp"
                    type="text"
                    placeholder="123456"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    className={isHorrorMode ? `pl-10 tracking-widest text-lg ${inputClass}` : "pl-10 tracking-widest text-lg"}
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>

              <Button
                type="submit"
                className={`w-full ${isHorrorMode ? 'bg-red-900 hover:bg-red-800 text-white border border-red-700' : ''}`}
                disabled={isLoading}
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Verify Email
              </Button>

              <button
                type="button"
                onClick={() => setView("login")}
                className={`w-full text-sm mt-4 hover:underline ${isHorrorMode ? 'text-red-400 hover:text-red-300' : 'text-muted-foreground hover:text-foreground'}`}
              >
                Back to login
              </button>
            </form>
          </div>
        )}

        {/* FORGOT PASSWORD STEP 1: EMAIL */}
        {view === "forgot_email" && (
          <div className="animate-in slide-in-from-right-4 fade-in duration-300">
            <div className="mb-8 text-center">
              <h1 className={headingClass}>Reset Password</h1>
              <p className={`mt-2 text-sm ${textClass}`}>
                Enter your email address to receive a verification code
              </p>
            </div>

            <form onSubmit={handleSendResetOtp} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reset-email" className={labelClass}>Email Address</Label>
                <div className="relative">
                  <Mail className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 ${isHorrorMode ? 'text-red-700' : 'text-muted-foreground'}`} />
                  <Input
                    id="reset-email"
                    type="email"
                    placeholder={isHorrorMode ? "soul@void.com" : "you@example.com"}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={isHorrorMode ? `pl-10 ${inputClass}` : "pl-10"}
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>

              <Button
                type="submit"
                className={`w-full ${isHorrorMode ? 'bg-red-900 hover:bg-red-800 text-white border border-red-700' : ''}`}
                disabled={isLoading}
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Send Reset Code
              </Button>

              <button
                type="button"
                onClick={() => setView("login")}
                className={`w-full text-sm mt-4 hover:underline ${isHorrorMode ? 'text-red-400 hover:text-red-300' : 'text-muted-foreground hover:text-foreground'}`}
              >
                Back to login
              </button>
            </form>
          </div>
        )}

        {/* FORGOT PASSWORD STEP 2: RESET */}
        {view === "forgot_reset" && (
          <div className="animate-in slide-in-from-right-4 fade-in duration-300">
            <div className="mb-8 text-center">
              <h1 className={headingClass}>Create New Password</h1>
              <p className={`mt-2 text-sm ${textClass}`}>
                Enter the code sent to <strong>{email}</strong> and your new password.
              </p>
            </div>

            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="otp" className={labelClass}>Verification Code</Label>
                <div className="relative">
                  <ShieldCheck className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 ${isHorrorMode ? 'text-red-700' : 'text-muted-foreground'}`} />
                  <Input
                    id="otp"
                    type="text"
                    placeholder="123456"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    className={isHorrorMode ? `pl-10 tracking-widest ${inputClass}` : "pl-10 tracking-widest"}
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-password" className={labelClass}>New Password</Label>
                <div className="relative">
                  <KeyRound className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 ${isHorrorMode ? 'text-red-700' : 'text-muted-foreground'}`} />
                  <Input
                    id="new-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className={isHorrorMode ? `pl-10 pr-10 ${inputClass}` : "pl-10 pr-10"}
                    required
                    minLength={6}
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className={`absolute right-3 top-1/2 -translate-y-1/2 hover:text-foreground ${isHorrorMode ? 'text-red-700' : 'text-muted-foreground'}`}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className={`w-full ${isHorrorMode ? 'bg-red-900 hover:bg-red-800 text-white border border-red-700' : ''}`}
                disabled={isLoading}
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Reset Password
              </Button>

              <button
                type="button"
                onClick={() => setView("forgot_email")}
                className={`w-full text-sm mt-4 hover:underline ${isHorrorMode ? 'text-red-400 hover:text-red-300' : 'text-muted-foreground hover:text-foreground'}`}
              >
                Change email
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}