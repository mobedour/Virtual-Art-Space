import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useLogin } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { PublicLayout } from "@/components/public-layout";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

const formSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export default function Login() {
  const [, setLocation] = useLocation();
  const { login: setAuth } = useAuth();
  const { toast } = useToast();
  const [errorMsg, setErrorMsg] = useState("");

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const loginMutation = useLogin();

  function onSubmit(values: z.infer<typeof formSchema>) {
    setErrorMsg("");
    loginMutation.mutate({ data: values }, {
      onSuccess: (data) => {
        setAuth(data.token, data.user);
        toast({ title: "Welcome back", description: "You're signed in to Virtual Art Space." });
        setLocation("/dashboard");
      },
      onError: (error) => {
        setErrorMsg(error.message || "Failed to sign in. Check your credentials.");
      }
    });
  }

  return (
    <PublicLayout>
      <div className="container mx-auto px-6 py-20 flex justify-center items-center min-h-[70vh]">
        <div className="w-full max-w-md animate-in fade-in zoom-in duration-500">
          <div className="text-center mb-8">
            <h1 className="font-display text-3xl font-bold text-foreground mb-2">Welcome back</h1>
            <p className="text-muted-foreground font-sans text-sm">Sign in to your artist account</p>
          </div>
          <Card className="bg-card/50 border-border/50 backdrop-blur-md rounded-sm shadow-[0_0_30px_rgba(217,119,6,0.08)] relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-0.5 bg-primary" />
            <CardContent className="pt-8">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-sans text-sm text-muted-foreground">Email</FormLabel>
                        <FormControl>
                          <Input placeholder="you@example.com" className="font-sans bg-background/50 border-border/50 focus-visible:ring-primary rounded-sm" {...field} />
                        </FormControl>
                        <FormMessage className="font-sans text-xs" />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-sans text-sm text-muted-foreground">Password</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="••••••••" className="font-sans bg-background/50 border-border/50 focus-visible:ring-primary rounded-sm" {...field} />
                        </FormControl>
                        <FormMessage className="font-sans text-xs" />
                      </FormItem>
                    )}
                  />

                  {errorMsg && (
                    <div className="p-3 border border-destructive/50 bg-destructive/10 text-destructive font-sans text-sm rounded-sm">
                      {errorMsg}
                    </div>
                  )}

                  <Button
                    type="submit"
                    className="w-full h-11 rounded-sm font-sans font-medium bg-primary text-primary-foreground hover:bg-primary/90"
                    disabled={loginMutation.isPending}
                  >
                    {loginMutation.isPending ? <Loader2 className="animate-spin w-5 h-5" /> : "Sign In"}
                  </Button>
                </form>
              </Form>

              <div className="mt-6 text-center">
                <p className="text-muted-foreground font-sans text-sm">
                  Don't have an account?{" "}
                  <Link href="/register">
                    <span className="text-primary hover:text-primary/80 hover:underline cursor-pointer">
                      Create one
                    </span>
                  </Link>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </PublicLayout>
  );
}
