import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Building2, Users, BookOpen, ArrowRight, ArrowLeft } from "lucide-react";

interface OnboardingSurveyProps {
  userId: string;
  onComplete: () => void;
}

const companyTypes = [
  { value: "solo", label: "Solo / Freelancer", icon: "👤" },
  { value: "startup", label: "Startup", icon: "🚀" },
  { value: "small_business", label: "Small Business", icon: "🏪" },
  { value: "enterprise", label: "Enterprise", icon: "🏢" },
  { value: "agency", label: "Agency", icon: "🎯" },
  { value: "student", label: "Student", icon: "🎓" },
];

const teamSizes = [
  { value: "1", label: "Just me" },
  { value: "2-5", label: "2-5 people" },
  { value: "6-20", label: "6-20 people" },
  { value: "21-50", label: "21-50 people" },
  { value: "50+", label: "50+ people" },
];

const interests = [
  { value: "technology", label: "Technology" },
  { value: "business", label: "Business" },
  { value: "design", label: "Design" },
  { value: "development", label: "Development" },
  { value: "marketing", label: "Marketing" },
  { value: "lifestyle", label: "Lifestyle" },
];

const contentPreferences = [
  { value: "tutorials", label: "Tutorials & How-to's" },
  { value: "news", label: "Industry News" },
  { value: "case_studies", label: "Case Studies" },
  { value: "opinions", label: "Opinions & Analysis" },
  { value: "tools", label: "Tools & Resources" },
  { value: "interviews", label: "Interviews" },
];

export function OnboardingSurvey({ userId, onComplete }: OnboardingSurveyProps) {
  const [step, setStep] = useState(1);
  const [companyType, setCompanyType] = useState("");
  const [teamSize, setTeamSize] = useState("");
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [selectedContent, setSelectedContent] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleInterestToggle = (value: string) => {
    setSelectedInterests((prev) =>
      prev.includes(value) ? prev.filter((i) => i !== value) : [...prev, value]
    );
  };

  const handleContentToggle = (value: string) => {
    setSelectedContent((prev) =>
      prev.includes(value) ? prev.filter((i) => i !== value) : [...prev, value]
    );
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase.from("user_preferences").insert({
        user_id: userId,
        company_type: companyType,
        team_size: teamSize,
        interests: selectedInterests,
        content_preferences: selectedContent,
        onboarding_completed: true,
      });

      if (error) throw error;

      toast({
        title: "Welcome aboard! 🎉",
        description: "Your preferences have been saved.",
      });
      onComplete();
      navigate("/");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const canProceed = () => {
    switch (step) {
      case 1:
        return companyType !== "";
      case 2:
        return teamSize !== "";
      case 3:
        return selectedInterests.length > 0;
      case 4:
        return selectedContent.length > 0;
      default:
        return true;
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background to-muted">
      <Card className="w-full max-w-lg animate-fade-in">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            {step === 1 && <Building2 className="h-12 w-12 text-primary" />}
            {step === 2 && <Users className="h-12 w-12 text-primary" />}
            {step === 3 && <BookOpen className="h-12 w-12 text-primary" />}
            {step === 4 && <BookOpen className="h-12 w-12 text-primary" />}
          </div>
          <CardTitle className="text-2xl">
            {step === 1 && "Tell us about yourself"}
            {step === 2 && "Team size"}
            {step === 3 && "What interests you?"}
            {step === 4 && "Content preferences"}
          </CardTitle>
          <CardDescription>
            {step === 1 && "What best describes your work?"}
            {step === 2 && "How many people are on your team?"}
            {step === 3 && "Select topics you'd like to explore"}
            {step === 4 && "What type of content do you prefer?"}
          </CardDescription>
          <div className="flex justify-center gap-1 mt-4">
            {[1, 2, 3, 4].map((s) => (
              <div
                key={s}
                className={`h-2 w-8 rounded-full transition-colors ${
                  s <= step ? "bg-primary" : "bg-muted"
                }`}
              />
            ))}
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {step === 1 && (
            <RadioGroup value={companyType} onValueChange={setCompanyType}>
              <div className="grid grid-cols-2 gap-3">
                {companyTypes.map((type) => (
                  <Label
                    key={type.value}
                    htmlFor={type.value}
                    className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-all hover:border-primary ${
                      companyType === type.value
                        ? "border-primary bg-primary/5"
                        : "border-border"
                    }`}
                  >
                    <RadioGroupItem value={type.value} id={type.value} className="sr-only" />
                    <span className="text-2xl">{type.icon}</span>
                    <span className="text-sm font-medium">{type.label}</span>
                  </Label>
                ))}
              </div>
            </RadioGroup>
          )}

          {step === 2 && (
            <RadioGroup value={teamSize} onValueChange={setTeamSize}>
              <div className="space-y-2">
                {teamSizes.map((size) => (
                  <Label
                    key={size.value}
                    htmlFor={`size-${size.value}`}
                    className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-all hover:border-primary ${
                      teamSize === size.value
                        ? "border-primary bg-primary/5"
                        : "border-border"
                    }`}
                  >
                    <RadioGroupItem value={size.value} id={`size-${size.value}`} />
                    <span className="text-sm font-medium">{size.label}</span>
                  </Label>
                ))}
              </div>
            </RadioGroup>
          )}

          {step === 3 && (
            <div className="grid grid-cols-2 gap-3">
              {interests.map((interest) => (
                <Label
                  key={interest.value}
                  className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-all hover:border-primary ${
                    selectedInterests.includes(interest.value)
                      ? "border-primary bg-primary/5"
                      : "border-border"
                  }`}
                >
                  <Checkbox
                    checked={selectedInterests.includes(interest.value)}
                    onCheckedChange={() => handleInterestToggle(interest.value)}
                  />
                  <span className="text-sm font-medium">{interest.label}</span>
                </Label>
              ))}
            </div>
          )}

          {step === 4 && (
            <div className="grid grid-cols-2 gap-3">
              {contentPreferences.map((pref) => (
                <Label
                  key={pref.value}
                  className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-all hover:border-primary ${
                    selectedContent.includes(pref.value)
                      ? "border-primary bg-primary/5"
                      : "border-border"
                  }`}
                >
                  <Checkbox
                    checked={selectedContent.includes(pref.value)}
                    onCheckedChange={() => handleContentToggle(pref.value)}
                  />
                  <span className="text-sm font-medium">{pref.label}</span>
                </Label>
              ))}
            </div>
          )}

          <div className="flex gap-3 pt-4">
            {step > 1 && (
              <Button
                variant="outline"
                onClick={() => setStep(step - 1)}
                className="flex-1"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            )}
            {step < 4 ? (
              <Button
                onClick={() => setStep(step + 1)}
                disabled={!canProceed()}
                className="flex-1"
              >
                Next
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={isLoading || !canProceed()}
                className="flex-1"
              >
                {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Get Started
              </Button>
            )}
          </div>

          <Button
            variant="ghost"
            onClick={onComplete}
            className="w-full text-muted-foreground"
          >
            Skip for now
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
