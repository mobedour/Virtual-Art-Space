import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useGetProfile, useUpdateProfile, getGetProfileQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useUser } from "@clerk/react";
import { DashboardLayout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2, User as UserIcon } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PageEnter, FadeUp } from "@/lib/motion";
import { motion } from "framer-motion";

const profileSchema = z.object({
  displayName: z.string().optional(),
  bio: z.string().max(500).optional(),
  avatarUrl: z.string().url().optional().or(z.literal("")),
});

export default function Profile() {
  const [, setLocation] = useLocation();
  const { user, isLoaded } = useUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (isLoaded && !user) setLocation("/sign-in");
  }, [user, isLoaded, setLocation]);

  const { data: profile, isLoading: isProfileLoading } = useGetProfile({
    query: { queryKey: getGetProfileQueryKey(), enabled: !!user }
  });

  const form = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: { displayName: "", bio: "", avatarUrl: "" },
  });

  useEffect(() => {
    if (profile) {
      form.reset({
        displayName: profile.displayName || "",
        bio: profile.bio || "",
        avatarUrl: profile.avatarUrl || "",
      });
    }
  }, [profile, form]);

  const updateMutation = useUpdateProfile();

  function onSubmit(values: z.infer<typeof profileSchema>) {
    setIsUpdating(true);
    updateMutation.mutate(
      { data: values },
      {
        onSuccess: (data) => {
          queryClient.setQueryData(getGetProfileQueryKey(), data);
          toast({ title: "Profile updated", description: "Your public profile has been saved." });
        },
        onError: () => {
          toast({ variant: "destructive", title: "Error", description: "Failed to update profile." });
        },
        onSettled: () => setIsUpdating(false),
      }
    );
  }

  if (!isLoaded || (user && isProfileLoading)) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[50vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <PageEnter className="max-w-2xl mx-auto space-y-8">
        <FadeUp>
          <h1 className="text-3xl font-display font-bold text-foreground">Artist Profile</h1>
          <p className="text-muted-foreground font-sans mt-1">Manage your public presence on the platform.</p>
        </FadeUp>

        <FadeUp delay={100}>
          <Card className="bg-card/40 border-border/50 backdrop-blur-sm rounded-sm border-t-2 border-t-primary overflow-hidden">
            <CardHeader>
              <div className="flex items-center gap-6">
                <motion.div whileHover={{ scale: 1.04 }} transition={{ type: "spring", stiffness: 300, damping: 20 }}>
                  <Avatar className="w-24 h-24 rounded-sm border border-primary/30 shadow-[0_0_20px_rgba(217,119,6,0.15)]">
                    <AvatarImage src={form.watch("avatarUrl") || undefined} />
                    <AvatarFallback className="rounded-sm bg-background font-display text-xl text-primary">
                      {user?.username?.substring(0, 2).toUpperCase() || <UserIcon />}
                    </AvatarFallback>
                  </Avatar>
                </motion.div>
                <div>
                  <CardTitle className="font-display text-xl mb-1">{user?.username}</CardTitle>
                  <CardDescription className="font-sans text-sm">{user?.primaryEmailAddress?.emailAddress}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="displayName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-sans text-sm text-muted-foreground">Display Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Your public artist name" className="font-sans bg-background/50 border-border/50 focus-visible:ring-primary rounded-sm" {...field} />
                        </FormControl>
                        <FormMessage className="font-sans text-xs" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="avatarUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-sans text-sm text-muted-foreground">Avatar URL</FormLabel>
                        <FormControl>
                          <Input placeholder="https://example.com/avatar.png" className="font-sans bg-background/50 border-border/50 focus-visible:ring-primary rounded-sm" {...field} />
                        </FormControl>
                        <FormMessage className="font-sans text-xs" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="bio"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-sans text-sm text-muted-foreground">Bio</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Tell visitors who you are and what drives your work..."
                            className="font-sans bg-background/50 border-border/50 focus-visible:ring-primary rounded-sm min-h-[120px] resize-none"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage className="font-sans text-xs" />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    className="rounded-sm font-sans bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_2px_12px_rgba(217,119,6,0.3)] hover:shadow-[0_4px_20px_rgba(217,119,6,0.45)] transition-all"
                    disabled={isUpdating}
                  >
                    {isUpdating ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : null}
                    Save Profile
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </FadeUp>
      </PageEnter>
    </DashboardLayout>
  );
}
