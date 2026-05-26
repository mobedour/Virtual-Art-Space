import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useCreateGallery, useUpdateGallery, useGetGallery, getListGalleriesQueryKey, getGetGalleryQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { DashboardLayout } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
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
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft, Check } from "lucide-react";
import { GalleryThumbnail } from "@/components/GalleryThumbnail";
import { PageEnter, FadeUp } from "@/lib/motion";
import { motion } from "framer-motion";

const formSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  roomTheme: z.string().min(1, "Room theme is required"),
});

const THEMES = [
  { id: "dark_void",        name: "Dark Void",        desc: "Warm charcoal walls with amber light — intimate and dramatic." },
  { id: "neon_grid",        name: "Neon Grid",         desc: "Deep ocean blue with glowing cyan grid lines — futuristic." },
  { id: "purple_mist",      name: "Purple Mist",       desc: "Deep violet atmosphere with swirling fog — ethereal." },
  { id: "white_cube",       name: "White Cube",        desc: "Classic clean gallery walls — lets the art speak." },
  { id: "concrete_bunker",  name: "Concrete Bunker",   desc: "Raw brutalist grey — industrial and bold." },
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
    if (!isAuthLoading && !user) setLocation("/login");
  }, [user, isAuthLoading, setLocation]);

  const { data: gallery, isLoading: isGalleryLoading } = useGetGallery(galleryId, {
    query: { queryKey: getGetGalleryQueryKey(galleryId), enabled: isEdit && !!user }
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { title: "", description: "", roomTheme: "dark_void" },
  });

  useEffect(() => {
    if (isEdit && gallery) {
      form.reset({ title: gallery.title, description: gallery.description || "", roomTheme: gallery.roomTheme });
    }
  }, [isEdit, gallery, form]);

  const createMutation = useCreateGallery();
  const updateMutation = useUpdateGallery();

  const watchedTitle = form.watch("title");
  const watchedTheme = form.watch("roomTheme");
  const previewTitle = watchedTitle.trim() || "My Gallery";

  function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    if (isEdit) {
      updateMutation.mutate({ id: galleryId, data: values }, {
        onSuccess: (data) => {
          queryClient.setQueryData(getGetGalleryQueryKey(galleryId), data);
          queryClient.invalidateQueries({ queryKey: getListGalleriesQueryKey() });
          toast({ title: "Gallery updated", description: "Your changes have been saved." });
          setLocation("/dashboard/galleries");
        },
        onError: (err) => {
          toast({ variant: "destructive", title: "Error", description: err.message || "Failed to update gallery." });
        },
        onSettled: () => setIsSubmitting(false),
      });
    } else {
      createMutation.mutate({ data: values }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListGalleriesQueryKey() });
          toast({ title: "Gallery created", description: "Your new gallery is ready." });
          setLocation("/dashboard/galleries");
        },
        onError: (err) => {
          toast({ variant: "destructive", title: "Error", description: err.message || "Failed to create gallery." });
        },
        onSettled: () => setIsSubmitting(false),
      });
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
      <PageEnter className="max-w-3xl mx-auto space-y-6">
        <FadeUp className="flex items-center gap-4 border-b border-border/50 pb-6">
          <Button asChild variant="ghost" size="icon" className="rounded-sm hover:bg-card/60">
            <Link href="/dashboard/galleries"><ArrowLeft className="w-5 h-5" /></Link>
          </Button>
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">
              {isEdit ? "Edit Gallery" : "New Exhibition"}
            </h1>
            <p className="text-muted-foreground font-sans mt-1 text-sm">
              {isEdit ? `Editing "${gallery?.title}"` : "Set up your virtual gallery room"}
            </p>
          </div>
        </FadeUp>

        <FadeUp delay={80}>
          <Card className="bg-card/40 border-border/50 backdrop-blur-sm rounded-sm border-t-2 border-t-primary">
            <CardContent className="pt-6">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-7">

                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-sans text-sm text-muted-foreground">Gallery Title *</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g. Echoes of Petra"
                            className="font-display text-lg bg-background/50 border-border/50 focus-visible:ring-primary rounded-sm"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage className="font-sans text-xs" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-sans text-sm text-muted-foreground">Description</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="What is the concept or story behind this exhibition?"
                            className="font-sans bg-background/50 border-border/50 focus-visible:ring-primary rounded-sm min-h-[90px] resize-none"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage className="font-sans text-xs" />
                      </FormItem>
                    )}
                  />

                  {/* ── Visual theme picker ── */}
                  <FormField
                    control={form.control}
                    name="roomTheme"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-sans text-sm text-muted-foreground">Room Theme *</FormLabel>
                        <FormDescription className="font-sans text-xs text-muted-foreground/70 -mt-1 mb-3">
                          Choose the atmosphere for your 3D gallery space.
                        </FormDescription>
                        <FormControl>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {THEMES.map((t) => {
                              const selected = field.value === t.id;
                              return (
                                <motion.button
                                  key={t.id}
                                  type="button"
                                  whileHover={{ scale: 1.02 }}
                                  whileTap={{ scale: 0.98 }}
                                  onClick={() => field.onChange(t.id)}
                                  className={`relative rounded-sm overflow-hidden border-2 text-left transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                                    selected
                                      ? "border-primary shadow-[0_0_16px_rgba(217,119,6,0.4)]"
                                      : "border-border/40 hover:border-border"
                                  }`}
                                >
                                  {/* Thumbnail */}
                                  <div className="aspect-[4/3] w-full">
                                    <GalleryThumbnail theme={t.id} title={previewTitle} className="w-full h-full" />
                                  </div>
                                  {/* Label */}
                                  <div className="p-2.5 bg-card/80 backdrop-blur-sm">
                                    <div className="font-display font-semibold text-sm text-foreground leading-tight">{t.name}</div>
                                    <div className="font-sans text-[10px] text-muted-foreground mt-0.5 leading-snug line-clamp-2">{t.desc}</div>
                                  </div>
                                  {/* Selected check */}
                                  {selected && (
                                    <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-primary flex items-center justify-center shadow-md">
                                      <Check className="w-3.5 h-3.5 text-primary-foreground" />
                                    </div>
                                  )}
                                </motion.button>
                              );
                            })}
                          </div>
                        </FormControl>
                        <FormMessage className="font-sans text-xs" />
                      </FormItem>
                    )}
                  />

                  {/* Live preview of selected theme */}
                  {watchedTheme && (
                    <FadeUp>
                      <div className="rounded-sm overflow-hidden border border-border/40">
                        <div className="px-3 py-2 bg-card/40 border-b border-border/30 flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-primary/60" />
                          <span className="font-sans text-[10px] text-muted-foreground uppercase tracking-widest">Preview</span>
                        </div>
                        <div className="aspect-[21/9] w-full">
                          <GalleryThumbnail theme={watchedTheme} title={previewTitle} className="w-full h-full" />
                        </div>
                      </div>
                    </FadeUp>
                  )}

                  <div className="pt-4 border-t border-border/50 flex justify-end gap-3">
                    <Button asChild variant="outline" className="rounded-sm border-border/50 font-sans hover:bg-card">
                      <Link href="/dashboard/galleries">Cancel</Link>
                    </Button>
                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                      <Button
                        type="submit"
                        className="rounded-sm font-sans font-medium bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_2px_12px_rgba(217,119,6,0.3)] hover:shadow-[0_4px_20px_rgba(217,119,6,0.45)] transition-all"
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : null}
                        {isEdit ? "Save Changes" : "Create Gallery"}
                      </Button>
                    </motion.div>
                  </div>

                </form>
              </Form>
            </CardContent>
          </Card>
        </FadeUp>
      </PageEnter>
    </DashboardLayout>
  );
}
