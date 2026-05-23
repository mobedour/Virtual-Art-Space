import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useCreateGallery, useUpdateGallery, useGetGallery, getListGalleriesQueryKey, getGetGalleryQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { DashboardLayout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft } from "lucide-react";

const formSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  roomTheme: z.string().min(1, "Room theme is required"),
});

const THEMES = [
  { id: "dark_void", name: "DARK VOID", desc: "Infinite black space with subtle grid lines." },
  { id: "neon_grid", name: "NEON GRID", desc: "Retro-futuristic 80s wireframe aesthetic." },
  { id: "purple_mist", name: "PURPLE MIST", desc: "Dense, atmospheric violet fog environment." },
  { id: "concrete_bunker", name: "CONCRETE BUNKER", desc: "Brutalist architecture, harsh lighting." },
  { id: "white_cube", name: "WHITE CUBE", desc: "Sterile, blindingly bright clinical space." },
];

export default function GalleryForm() {
  const [, setLocation] = useLocation();
  const params = useParams();
  const { user, isLoading: isAuthLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEdit = !!params.id && params.id !== "new";
  const galleryId = isEdit ? parseInt(params.id!) : 0;

  useEffect(() => {
    if (!isAuthLoading && !user) {
      setLocation("/login");
    }
  }, [user, isAuthLoading, setLocation]);

  const { data: gallery, isLoading: isGalleryLoading } = useGetGallery(galleryId, {
    query: {
      enabled: isEdit && !!user,
    }
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      roomTheme: "dark_void",
    },
  });

  useEffect(() => {
    if (isEdit && gallery) {
      form.reset({
        title: gallery.title,
        description: gallery.description || "",
        roomTheme: gallery.roomTheme,
      });
    }
  }, [isEdit, gallery, form]);

  const createMutation = useCreateGallery();
  const updateMutation = useUpdateGallery();

  function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    
    if (isEdit) {
      updateMutation.mutate(
        { id: galleryId, data: values },
        {
          onSuccess: (data) => {
            queryClient.setQueryData(getGetGalleryQueryKey(galleryId), data);
            queryClient.invalidateQueries({ queryKey: getListGalleriesQueryKey() });
            toast({ title: "PARAMETERS UPDATED", description: "Gallery configuration saved." });
            setLocation("/dashboard/galleries");
          },
          onError: (err) => {
            toast({ variant: "destructive", title: "ERROR", description: err.message || "Failed to update gallery." });
          },
          onSettled: () => setIsSubmitting(false)
        }
      );
    } else {
      createMutation.mutate(
        { data: values },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListGalleriesQueryKey() });
            toast({ title: "NODE ESTABLISHED", description: "New gallery created successfully." });
            setLocation("/dashboard/galleries");
          },
          onError: (err) => {
            toast({ variant: "destructive", title: "ERROR", description: err.message || "Failed to create gallery." });
          },
          onSettled: () => setIsSubmitting(false)
        }
      );
    }
  }

  if (isAuthLoading || (isEdit && isGalleryLoading)) {
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
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center gap-4 border-b border-border/50 pb-6">
          <Button asChild variant="ghost" size="icon" className="rounded-none hover:bg-card">
            <Link href="/dashboard/galleries"><ArrowLeft className="w-5 h-5" /></Link>
          </Button>
          <div>
            <h1 className="text-3xl font-display font-bold tracking-widest text-white uppercase">
              {isEdit ? "Edit gallery" : "Create a new exhibition"}
            </h1>
            <p className="text-muted-foreground font-mono mt-1 text-sm tracking-wider">
              {isEdit ? `Editing: ${gallery?.title}` : "Set up your virtual gallery room"}
            </p>
          </div>
        </div>

        <Card className="bg-card/40 border-border/50 backdrop-blur-sm rounded-none border-t-2 border-t-primary">
          <CardContent className="pt-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-mono text-xs tracking-wider text-muted-foreground">GALLERY_TITLE *</FormLabel>
                      <FormControl>
                        <Input placeholder="E.g. Neon Dreams 2084" className="font-mono bg-background/50 border-border/50 focus-visible:ring-primary rounded-none text-lg" {...field} />
                      </FormControl>
                      <FormMessage className="font-mono text-xs" />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-mono text-xs tracking-wider text-muted-foreground">DESCRIPTION</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="What is the concept of this space?" 
                          className="font-mono bg-background/50 border-border/50 focus-visible:ring-primary rounded-none min-h-[100px] resize-none" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage className="font-mono text-xs" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="roomTheme"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-mono text-xs tracking-wider text-muted-foreground">ENVIRONMENT_PROTOCOL *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="font-mono bg-background/50 border-border/50 rounded-none h-12">
                            <SelectValue placeholder="Select environment" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-card border-border/50 rounded-none font-mono">
                          {THEMES.map(theme => (
                            <SelectItem key={theme.id} value={theme.id} className="focus:bg-primary/20 cursor-pointer py-3">
                              <div className="flex flex-col">
                                <span className="font-bold text-primary">{theme.name}</span>
                                <span className="text-xs text-muted-foreground mt-1">{theme.desc}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription className="font-mono text-[10px] mt-2">
                        Select the base 3D architecture for this gallery.
                      </FormDescription>
                      <FormMessage className="font-mono text-xs" />
                    </FormItem>
                  )}
                />

                <div className="pt-4 border-t border-border/50 flex justify-end gap-4">
                  <Button asChild variant="outline" className="rounded-none border-border/50 font-mono hover:bg-card">
                    <Link href="/dashboard/galleries">CANCEL</Link>
                  </Button>
                  <Button 
                    type="submit" 
                    className="rounded-none font-mono tracking-widest bg-primary text-white hover:bg-primary/90 shadow-[0_0_10px_rgba(124,58,237,0.3)]"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : null}
                    {isEdit ? "UPDATE_PARAMETERS" : "EXECUTE_DEPLOYMENT"}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
