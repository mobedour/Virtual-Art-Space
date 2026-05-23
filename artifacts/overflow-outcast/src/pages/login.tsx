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
        toast({ title: "ACCESS GRANTED", description: "Welcome to Overflow Outcast." });
        setLocation("/dashboard");
      },
      onError: (error) => {
        setErrorMsg(error.message || "Failed to login. Check your credentials.");
      }
    });
  }

  return (
    <PublicLayout>
      <div className="container mx-auto px-6 py-20 flex justify-center items-center min-h-[70vh]">
        <div className="w-full max-w-md animate-in fade-in zoom-in duration-500">
          <Card className="bg-card/50 border-border/50 backdrop-blur-md rounded-none shadow-[0_0_20px_rgba(124,58,237,0.15)] relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-primary" />
            <CardHeader className="space-y-2 pb-8">
              <CardTitle className="text-3xl font-display font-bold tracking-widest text-center">
                INITIALIZE
              </CardTitle>
              <p className="text-muted-foreground font-mono text-center text-sm tracking-wider">
                ENTER YOUR CREDENTIALS
              </p>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-mono text-xs tracking-wider text-muted-foreground">EMAIL</FormLabel>
                        <FormControl>
                          <Input placeholder="artist@void.net" className="font-mono bg-background/50 border-border/50 focus-visible:ring-primary rounded-none" {...field} />
                        </FormControl>
                        <FormMessage className="font-mono text-xs" />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-mono text-xs tracking-wider text-muted-foreground">PASSWORD</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="••••••••" className="font-mono bg-background/50 border-border/50 focus-visible:ring-primary rounded-none" {...field} />
                        </FormControl>
                        <FormMessage className="font-mono text-xs" />
                      </FormItem>
                    )}
                  />

                  {errorMsg && (
                    <div className="p-3 border border-destructive/50 bg-destructive/10 text-destructive font-mono text-sm">
                      [ERROR] {errorMsg}
                    </div>
                  )}

                  <Button 
                    type="submit" 
                    className="w-full h-12 rounded-none font-mono tracking-widest bg-primary text-white hover:bg-primary/90"
                    disabled={loginMutation.isPending}
                  >
                    {loginMutation.isPending ? <Loader2 className="animate-spin w-5 h-5" /> : "AUTHENTICATE"}
                  </Button>
                </form>
              </Form>

              <div className="mt-8 text-center">
                <p className="text-muted-foreground font-mono text-sm">
                  NO NODE IDENTIFIER?{" "}
                  <Link href="/register">
                    <span className="text-primary hover:text-primary/80 hover:underline cursor-pointer">
                      REGISTER
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
