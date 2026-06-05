import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useCreateGallery, useUpdateGallery, useGetGallery, getListGalleriesQueryKey, getGetGalleryQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useUser } from "@clerk/react";
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
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft, Check, RefreshCw } from "lucide-react";
import { GalleryThumbnail } from "@/components/GalleryThumbnail";
import { PageEnter, FadeUp } from "@/lib/motion";
import { motion } from "framer-motion";
import { SIZE_LABELS, DECO_LABELS } from "@/components/gallery-room/room-dimensions";

const formSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  roomTheme: z.string().min(1, "Room theme is required"),
  roomMode: z.string().default("basic"),
  roomSize: z.number().int().min(1).max(10).default(5),
  decorationLevel: z.number().int().min(1).max(10).default(5),
});

const THEMES = [
  { id: "dark_void",        name: "Dark Void",        desc: "Warm charcoal walls with amber light — intimate and dramatic." },
  { id: "neon_grid",        name: "Neon Grid",         desc: "Deep ocean blue with glowing cyan grid lines — futuristic." },
  { id: "purple_mist",      name: "Purple Mist",       desc: "Deep violet atmosphere with swirling fog — ethereal." },
  { id: "white_cube",       name: "White Cube",        desc: "Classic clean gallery walls — lets the art speak." },
  { id: "concrete_bunker",  name: "Concrete Bunker",   desc: "Raw brutalist grey — industrial and bold." },
  { id: "amman_limestone",  name: "Amman Limestone",   desc: "Terracotta tile floor, warm sandstone walls — Jordanian heritage." },
];

const ROOM_MODES = [
  { id: "basic",  name: "Basic",  desc: "Clean and minimal. No decoration, standard room." },
  { id: "auto",   name: "Auto",   desc: "Algorithmically furnished from a unique seed." },
  { id: "custom", name: "Custom", desc: "Full control over size and decoration density." },
];

function randomSeed(): number {
  return Math.floor(Math.random() * 2_147_483_647);
}

export default function GalleryForm() {
  const [, setLocation] = useLocation();
  const params = useParams();
  const { user, isLoaded } = useUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [roomSeed, setRoomSeed] = useState<number>(() => randomSeed());

  const isEdit = !!params.id && params.id !== "new";
  const galleryId = isEdit ? parseInt(params.id!) : 0;

  useEffect(() => {
    if (isLoaded && !user) setLocation("/sign-in");
  }, [user, isLoaded, setLocation]);

  const { data: gallery, isLoading: isGalleryLoading } = useGetGallery(galleryId, {
    query: { queryKey: getGetGalleryQueryKey(galleryId), enabled: isEdit && !!user }
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      roomTheme: "dark_void",
      roomMode: "basic",
      roomSize: 5,
      decorationLevel: 5,
    },
  });

  useEffect(() => {
    if (isEdit && gallery) {
      form.reset({
        title: gallery.title,
        description: gallery.description || "",
        roomTheme: gallery.roomTheme,
        roomMode: gallery.roomMode ?? "basic",
        roomSize: gallery.roomSize ?? 5,
        decorationLevel: gallery.decorationLevel ?? 5,
      });
    }
  }, [isEdit, gallery, form]);

  const createMutation = useCreateGallery();
  const updateMutation = useUpdateGallery();

  const watchedTitle = form.watch("title");
  const watchedTheme = form.watch("roomTheme");
  const watchedMode  = form.watch("roomMode");
  const watchedSize  = form.watch("roomSize");
  const watchedDeco  = form.watch("decorationLevel");
  const previewTitle = watchedTitle.trim() || "My Gallery";

  function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    if (isEdit) {
      updateMutation.mutate({
        id: galleryId,
        data: {
          title: values.title,
          description: values.description,
          roomTheme: values.roomTheme,
          roomMode: values.roomMode,
          roomSize: values.roomSize,
          decorationLevel: values.decorationLevel,
        },
      }, {
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
      createMutation.mutate({
        data: {
          title: values.title,
          description: values.description,
          roomTheme: values.roomTheme,
          roomMode: values.roomMode,
          roomSize: values.roomSize,
          decorationLevel: values.decorationLevel,
          roomSeed,
        },
      }, {
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

  if (!isLoaded || (isEdit && isGalleryLoading)) {
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
                                  <div className="aspect-[4/3] w-full">
                                    <GalleryThumbnail theme={t.id} title={previewTitle} className="w-full h-full" />
                                  </div>
                                  <div className="p-2.5 bg-card/80 backdrop-blur-sm">
                                    <div className="font-display font-semibold text-sm text-foreground leading-tight">{t.name}</div>
                                    <div className="font-sans text-[10px] text-muted-foreground mt-0.5 leading-snug line-clamp-2">{t.desc}</div>
                                  </div>
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

                  {/* ── Room Layout ── */}
                  <div className="space-y-4 pt-1">
                    <div>
                      <p className="font-sans text-sm text-muted-foreground font-medium">Room Layout</p>
                      <p className="font-sans text-xs text-muted-foreground/60 mt-0.5">
                        Control how your gallery room is furnished and sized.
                      </p>
                    </div>

                    {/* Mode cards */}
                    <FormField
                      control={form.control}
                      name="roomMode"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <div className="grid grid-cols-3 gap-3">
                              {ROOM_MODES.map((mode) => {
                                const selected = field.value === mode.id;
                                return (
                                  <motion.button
                                    key={mode.id}
                                    type="button"
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => field.onChange(mode.id)}
                                    className={`relative rounded-sm border-2 text-left p-3 transition-all duration-300 focus:outline-none ${
                                      selected
                                        ? "border-primary bg-primary/5 shadow-[0_0_12px_rgba(217,119,6,0.25)]"
                                        : "border-border/40 bg-card/30 hover:border-border hover:bg-card/50"
                                    }`}
                                  >
                                    <div className="font-display font-semibold text-sm text-foreground leading-tight mb-1">{mode.name}</div>
                                    <div className="font-sans text-[10px] text-muted-foreground leading-snug">{mode.desc}</div>
                                    {selected && (
                                      <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                                        <Check className="w-3 h-3 text-primary-foreground" />
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

                    {/* Seed display + regenerate — only on CREATE for auto/custom */}
                    {watchedMode !== "basic" && !isEdit && (
                      <motion.div
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-sm bg-card/30 border border-border/30"
                      >
                        <div className="flex-1">
                          <p className="font-sans text-[10px] text-muted-foreground/60 uppercase tracking-widest mb-0.5">Room Seed</p>
                          <p className="font-mono text-sm text-foreground/80">{roomSeed}</p>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="rounded-sm border-border/50 font-sans text-xs gap-1.5 hover:bg-card"
                          onClick={() => setRoomSeed(randomSeed())}
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          Regenerate
                        </Button>
                      </motion.div>
                    )}

                    {/* Size + Decoration sliders — custom mode only */}
                    {watchedMode === "custom" && (
                      <motion.div
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-5 px-3 py-4 rounded-sm bg-card/30 border border-border/30"
                      >
                        <FormField
                          control={form.control}
                          name="roomSize"
                          render={({ field }) => (
                            <FormItem>
                              <div className="flex items-center justify-between mb-3">
                                <FormLabel className="font-sans text-xs text-muted-foreground">Room Size</FormLabel>
                                <span className="font-mono text-xs text-primary">
                                  {watchedSize} — {SIZE_LABELS[watchedSize] ?? ""}
                                </span>
                              </div>
                              <FormControl>
                                <Slider
                                  min={1}
                                  max={10}
                                  step={1}
                                  value={[field.value]}
                                  onValueChange={([v]) => field.onChange(v)}
                                  className="cursor-pointer"
                                />
                              </FormControl>
                              <div className="flex justify-between mt-1">
                                <span className="font-sans text-[9px] text-muted-foreground/40">Intimate</span>
                                <span className="font-sans text-[9px] text-muted-foreground/40">Monumental</span>
                              </div>
                              <FormMessage className="font-sans text-xs" />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="decorationLevel"
                          render={({ field }) => (
                            <FormItem>
                              <div className="flex items-center justify-between mb-3">
                                <FormLabel className="font-sans text-xs text-muted-foreground">Decoration</FormLabel>
                                <span className="font-mono text-xs text-primary">
                                  {watchedDeco} — {DECO_LABELS[watchedDeco] ?? ""}
                                </span>
                              </div>
                              <FormControl>
                                <Slider
                                  min={1}
                                  max={10}
                                  step={1}
                                  value={[field.value]}
                                  onValueChange={([v]) => field.onChange(v)}
                                  className="cursor-pointer"
                                />
                              </FormControl>
                              <div className="flex justify-between mt-1">
                                <span className="font-sans text-[9px] text-muted-foreground/40">Bare</span>
                                <span className="font-sans text-[9px] text-muted-foreground/40">Immersive</span>
                              </div>
                              <FormMessage className="font-sans text-xs" />
                            </FormItem>
                          )}
                        />
                      </motion.div>
                    )}
                  </div>

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
