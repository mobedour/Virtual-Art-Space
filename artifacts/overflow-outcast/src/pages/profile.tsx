import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useGetProfile, useUpdateProfile, getGetProfileQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
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

const profileSchema = z.object({
  displayName: z.string().optional(),
  bio: z.string().max(500).optional(),
  avatarUrl: z.string().url().optional().or(z.literal("")),
});

export default function Profile() {
  const [, setLocation] = useLocation();
  const { user, isLoading: isAuthLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (!isAuthLoading && !user) {
      setLocation("/login");
    }
  }, [user, isAuthLoading, setLocation]);

  const { data: profile, isLoading: isProfileLoading } = useGetProfile({
    query: {
      queryKey: getGetProfileQueryKey(),
      enabled: !!user,
    }
  });

  const form = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      displayName: "",
      bio: "",
      avatarUrl: "",
    },
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
          toast({ title: "PROFILE UPDATED", description: "Your identity has been saved to the network." });
        },
        onError: () => {
          toast({ variant: "destructive", title: "ERROR", description: "Failed to update profile." });
        },
        onSettled: () => {
          setIsUpdating(false);
        }
      }
    );
  }

  if (isAuthLoading || (user && isProfileLoading)) {
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
      <div className="max-w-2xl mx-auto space-y-8">
        <div>
          <h1 className="text-4xl font-display font-bold tracking-widest text-white uppercase">
            IDENTITY
          </h1>
          <p className="text-muted-foreground font-mono mt-2 tracking-wider">
            MANAGE YOUR PUBLIC PERSONA
          </p>
        </div>

        <Card className="bg-card/40 border-border/50 backdrop-blur-sm rounded-none border-t-2 border-t-primary">
          <CardHeader>
            <div className="flex items-center gap-6">
              <Avatar className="w-24 h-24 rounded-none border border-primary/30">
                <AvatarImage src={form.watch("avatarUrl") || undefined} />
                <AvatarFallback className="rounded-none bg-background font-mono text-xl text-primary">
                  {user?.username?.substring(0, 2).toUpperCase() || <UserIcon />}
                </AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="font-display tracking-widest mb-1">USER_NODE: {user?.username}</CardTitle>
                <CardDescription className="font-mono text-xs">{user?.email}</CardDescription>
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
                      <FormLabel className="font-mono text-xs tracking-wider text-muted-foreground">DISPLAY_NAME</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter public alias" className="font-mono bg-background/50 border-border/50 focus-visible:ring-primary rounded-none" {...field} />
                      </FormControl>
                      <FormMessage className="font-mono text-xs" />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="avatarUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-mono text-xs tracking-wider text-muted-foreground">AVATAR_URL</FormLabel>
                      <FormControl>
                        <Input placeholder="https://example.com/avatar.png" className="font-mono bg-background/50 border-border/50 focus-visible:ring-primary rounded-none" {...field} />
                      </FormControl>
                      <FormMessage className="font-mono text-xs" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="bio"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-mono text-xs tracking-wider text-muted-foreground">BIO</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Tell the network who you are..." 
                          className="font-mono bg-background/50 border-border/50 focus-visible:ring-primary rounded-none min-h-[120px] resize-none" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage className="font-mono text-xs" />
                    </FormItem>
                  )}
                />

                <Button 
                  type="submit" 
                  className="rounded-none font-mono tracking-widest bg-primary text-white hover:bg-primary/90"
                  disabled={isUpdating}
                >
                  {isUpdating ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : null}
                  SAVE_PARAMETERS
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
