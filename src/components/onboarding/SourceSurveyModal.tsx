import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Youtube,
    Twitter,
    Facebook,
    Instagram,
    Linkedin,
    Search,
    Users,
    MoreHorizontal,
    Globe
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface SourceOption {
    id: string;
    label: string;
    icon: React.ElementType;
    color: string;
}

const SOURCES: SourceOption[] = [
    { id: "youtube", label: "YouTube", icon: Youtube, color: "text-red-600 group-hover:bg-red-50 dark:group-hover:bg-red-950/20" },
    { id: "twitter", label: "X (Twitter)", icon: Twitter, color: "text-black dark:text-white group-hover:bg-neutral-50 dark:group-hover:bg-neutral-800" },
    { id: "google", label: "Google Search", icon: Search, color: "text-blue-500 group-hover:bg-blue-50 dark:group-hover:bg-blue-950/20" },
    { id: "facebook", label: "Facebook", icon: Facebook, color: "text-blue-600 group-hover:bg-blue-50 dark:group-hover:bg-blue-950/20" },
    { id: "instagram", label: "Instagram", icon: Instagram, color: "text-pink-600 group-hover:bg-pink-50 dark:group-hover:bg-pink-950/20" },
    { id: "linkedin", label: "LinkedIn", icon: Linkedin, color: "text-blue-700 group-hover:bg-blue-50 dark:group-hover:bg-blue-950/20" },
    { id: "friend", label: "Friend / Colleague", icon: Users, color: "text-green-600 group-hover:bg-green-50 dark:group-hover:bg-green-950/20" },
    { id: "other", label: "Other", icon: MoreHorizontal, color: "text-gray-500 group-hover:bg-gray-50 dark:group-hover:bg-gray-800" },
];

export function SourceSurveyModal() {
    const [isOpen, setIsOpen] = useState(false);
    const queryClient = useQueryClient();

    // Fetch user profile to check if they've answered
    const { data: profile, isLoading } = useQuery({
        queryKey: ["user-profile-survey"],
        queryFn: async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) return null;

                const { data, error } = await supabase
                    .from("profiles")
                    .select("referral_source")
                    .eq("id", session.user.id)
                    .single();

                if (error) {
                    // Fail silently for non-critical UI components
                    return null;
                }
                return data;
            } catch (e) {
                return null;
            }
        },
        retry: false, // Don't retry if it fails, it's just a survey
        refetchOnWindowFocus: false,
    });

    useEffect(() => {
        // Show modal if user is logged in (profile exists) AND hasn't answered survey
        if (!isLoading && profile && !profile.referral_source) {
            // Add a small delay for smoother UX
            const timer = setTimeout(() => setIsOpen(true), 1500);
            return () => clearTimeout(timer);
        }
    }, [profile, isLoading]);

    const updateSourceMutation = useMutation({
        mutationFn: async (sourceId: string) => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error("Not authenticated");

            const { error } = await supabase
                .from("profiles")
                .update({ referral_source: sourceId })
                .eq("id", session.user.id);

            if (error) throw error;
        },
        onSuccess: () => {
            setIsOpen(false);
            toast.success("Thanks for your feedback!");
            // Invalidate query so it doesn't show again
            queryClient.invalidateQueries({ queryKey: ["user-profile-survey"] });
        },
        onError: (error) => {
            toast.error("Failed to save response. Please try again.");
            console.error(error);
        }
    });

    const handleSelect = (sourceId: string) => {
        updateSourceMutation.mutate(sourceId);
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="sm:max-w-md md:max-w-lg border-2" onPointerDownOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
                <DialogHeader className="text-center pb-2">
                    {/* Logo or specialized icon */}
                    <div className="mx-auto bg-primary/10 p-3 rounded-full w-fit mb-4">
                        <Globe className="h-8 w-8 text-primary" />
                    </div>
                    <DialogTitle className="text-2xl font-bold tracking-tight">How did you hear about us?</DialogTitle>
                    <DialogDescription className="text-base text-muted-foreground pt-1">
                        Help us grow by letting us know how you found ZetsuServ.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 py-4">
                    {SOURCES.map((source) => (
                        <button
                            key={source.id}
                            onClick={() => handleSelect(source.id)}
                            disabled={updateSourceMutation.isPending}
                            className={cn(
                                "group flex flex-col items-center justify-center gap-3 p-4 rounded-xl border border-border/50 bg-background/50 hover:border-primary/50 transition-all duration-200 hover:shadow-md active:scale-95 disabled:opacity-50 disabled:pointer-events-none",
                                source.color
                            )}
                        >
                            <source.icon className={cn("h-8 w-8 transition-transform group-hover:scale-110", source.color.split(" ")[0])} />
                            <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground">{source.label}</span>
                        </button>
                    ))}
                </div>
            </DialogContent>
        </Dialog>
    );
}
