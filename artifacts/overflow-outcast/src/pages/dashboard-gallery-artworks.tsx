import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useParams } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  useListArtworks,
  useCreateArtwork,
  useUpdateArtwork,
  useDeleteArtwork,
  useGetGallery,
  getGetGalleryQueryKey,
  getListArtworksQueryKey,
  getGetDashboardStatsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { DashboardLayout } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import {
  ArrowLeft,
  Loader2,
  Plus,
  Pencil,
  Trash2,
  Image as ImageIcon,
  Upload,
  MapPin,
} from "lucide-react";

type Artwork = {
  id: number;
  galleryId: number;
  title: string;
  description?: string | null;
  imageUrl: string;
  artistName?: string | null;
  year?: string | null;
  medium?: string | null;
  dimensions?: string | null;
  xPosition: number;
  yPosition: number;
  zPosition: number;
  rotation: number;
  scale: number;
  isManuallyPlaced: boolean;
  createdAt: string;
};

const HALF_W = 9;
const HALF_D = 9;
const WALL_INSET = 0.12;
const HANG_Y = 0.8;
const SLOT_POSITIONS = [-6, -3, 0, 3, 6];

const WALL_NAMES = ["Back", "Right", "Front", "Left"] as const;
const SLOT_LABELS = ["Far Left", "Left", "Center", "Right", "Far Right"] as const;

function computeArtworkPosition(wallId: number, wallSlot: number) {
  const along = SLOT_POSITIONS[wallSlot - 1];
  switch (wallId) {
    case 0:
      return { x: along, y: HANG_Y, z: -(HALF_D - WALL_INSET), rotation: 0 };
    case 1:
      return { x: HALF_W - WALL_INSET, y: HANG_Y, z: along, rotation: -Math.PI / 2 };
    case 2:
      return { x: along, y: HANG_Y, z: HALF_D - WALL_INSET, rotation: Math.PI };
    case 3:
      return { x: -(HALF_W - WALL_INSET), y: HANG_Y, z: along, rotation: Math.PI / 2 };
    default:
      return { x: 0, y: HANG_Y, z: -(HALF_D - WALL_INSET), rotation: 0 };
  }
}

function detectWallFromRotation(rotation: number): number {
  if (Math.abs(rotation) < 0.2) return 0;
  if (Math.abs(rotation + Math.PI / 2) < 0.2) return 1;
  if (Math.abs(Math.abs(rotation) - Math.PI) < 0.2) return 2;
  if (Math.abs(rotation - Math.PI / 2) < 0.2) return 3;
  return 0;
}

function detectSlotFromPosition(wallId: number, x: number, z: number): number {
  const along = wallId === 0 || wallId === 2 ? x : z;
  let closestSlot = 3;
  let minDist = Infinity;
  SLOT_POSITIONS.forEach((pos, i) => {
    const dist = Math.abs(along - pos);
    if (dist < minDist) {
      minDist = dist;
      closestSlot = i + 1;
    }
  });
  return closestSlot;
}

type PlacedArtworkDot = {
  id: number;
  wallId: number;
  slotIndex: number;
  isCurrent: boolean;
  isManual: boolean;
};

function FloorPlanPreview({
  dots,
  activeWallId,
  activeSlot,
}: {
  dots: PlacedArtworkDot[];
  activeWallId: number;
  activeSlot: number;
}) {
  const PAD = 28;
  const SVG_SIZE = 200;
  const INNER = SVG_SIZE - PAD * 2;

  const toSvgAlongBack = (slotIdx: number) =>
    PAD + ((SLOT_POSITIONS[slotIdx] + 9) / 18) * INNER;
  const toSvgAlongSide = (slotIdx: number) =>
    PAD + ((SLOT_POSITIONS[slotIdx] + 9) / 18) * INNER;

  const getDotCoords = (wallId: number, slotIdx: number) => {
    switch (wallId) {
      case 0:
        return { cx: toSvgAlongBack(slotIdx), cy: PAD + 3 };
      case 1:
        return { cx: PAD + INNER - 3, cy: toSvgAlongSide(slotIdx) };
      case 2:
        return { cx: toSvgAlongBack(slotIdx), cy: PAD + INNER - 3 };
      case 3:
        return { cx: PAD + 3, cy: toSvgAlongSide(slotIdx) };
      default:
        return { cx: SVG_SIZE / 2, cy: SVG_SIZE / 2 };
    }
  };

  const activeDot = getDotCoords(activeWallId, activeSlot - 1);

  return (
    <svg
      width={SVG_SIZE}
      height={SVG_SIZE}
      className="w-full max-w-[200px]"
      viewBox={`0 0 ${SVG_SIZE} ${SVG_SIZE}`}
    >
      <rect
        x={PAD}
        y={PAD}
        width={INNER}
        height={INNER}
        fill="#1a1714"
        stroke="#3d3020"
        strokeWidth={1.5}
      />

      <rect x={PAD} y={PAD - 2} width={INNER} height={4} fill="#2a2016" />
      <rect x={PAD} y={PAD + INNER - 2} width={INNER} height={4} fill="#2a2016" />
      <rect x={PAD - 2} y={PAD} width={4} height={INNER} fill="#2a2016" />
      <rect x={PAD + INNER - 2} y={PAD} width={4} height={INNER} fill="#2a2016" />

      <text x={SVG_SIZE / 2} y={PAD - 8} textAnchor="middle" fontSize="8" fill="#7a6a4a" fontFamily="monospace">
        BACK
      </text>
      <text x={SVG_SIZE / 2} y={PAD + INNER + 16} textAnchor="middle" fontSize="8" fill="#7a6a4a" fontFamily="monospace">
        FRONT
      </text>
      <text
        x={PAD - 10}
        y={SVG_SIZE / 2}
        textAnchor="middle"
        fontSize="8"
        fill="#7a6a4a"
        fontFamily="monospace"
        transform={`rotate(-90, ${PAD - 10}, ${SVG_SIZE / 2})`}
      >
        LEFT
      </text>
      <text
        x={PAD + INNER + 10}
        y={SVG_SIZE / 2}
        textAnchor="middle"
        fontSize="8"
        fill="#7a6a4a"
        fontFamily="monospace"
        transform={`rotate(90, ${PAD + INNER + 10}, ${SVG_SIZE / 2})`}
      >
        RIGHT
      </text>

      <circle
        cx={SVG_SIZE / 2}
        cy={SVG_SIZE / 2}
        r={4}
        fill="none"
        stroke="#3d3020"
        strokeWidth={1}
        strokeDasharray="2,3"
      />

      {dots.map((dot, i) => {
        if (dot.isCurrent) return null;
        const { cx, cy } = getDotCoords(dot.wallId, dot.slotIndex);
        return (
          <circle
            key={i}
            cx={cx}
            cy={cy}
            r={4}
            fill={dot.isManual ? "#92400e" : "#44403c"}
            stroke="#78716c"
            strokeWidth={1}
          />
        );
      })}

      <circle
        cx={activeDot.cx}
        cy={activeDot.cy}
        r={5}
        fill="#d97706"
        stroke="#fbbf24"
        strokeWidth={1.5}
      />
    </svg>
  );
}

const formSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  artistName: z.string().optional(),
  year: z.string().optional(),
  medium: z.string().optional(),
  dimensions: z.string().optional(),
  imageUrl: z.string().min(1, "An image is required"),
  placementEnabled: z.boolean().default(false),
  wallId: z.number().int().min(0).max(3).default(0),
  wallSlot: z.number().int().min(1).max(5).default(3),
});

type FormValues = z.infer<typeof formSchema>;

function ArtworkFormDialog({
  open,
  onClose,
  galleryId,
  artwork,
  existingArtworks,
}: {
  open: boolean;
  onClose: () => void;
  galleryId: number;
  artwork?: Artwork | null;
  existingArtworks: Artwork[];
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEdit = !!artwork;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      artistName: "",
      year: "",
      medium: "",
      dimensions: "",
      imageUrl: "",
      placementEnabled: false,
      wallId: 0,
      wallSlot: 3,
    },
  });

  const watchPlacementEnabled = form.watch("placementEnabled");
  const watchWallId = form.watch("wallId");
  const watchWallSlot = form.watch("wallSlot");

  useEffect(() => {
    if (open) {
      if (artwork) {
        let wallId = 0;
        let wallSlot = 3;
        if (artwork.isManuallyPlaced) {
          wallId = detectWallFromRotation(artwork.rotation);
          wallSlot = detectSlotFromPosition(wallId, artwork.xPosition, artwork.zPosition);
        }
        form.reset({
          title: artwork.title,
          description: artwork.description ?? "",
          artistName: artwork.artistName ?? "",
          year: artwork.year ?? "",
          medium: artwork.medium ?? "",
          dimensions: artwork.dimensions ?? "",
          imageUrl: artwork.imageUrl,
          placementEnabled: artwork.isManuallyPlaced,
          wallId,
          wallSlot,
        });
        setImagePreview(artwork.imageUrl);
      } else {
        form.reset({
          title: "",
          description: "",
          artistName: "",
          year: "",
          medium: "",
          dimensions: "",
          imageUrl: "",
          placementEnabled: false,
          wallId: 0,
          wallSlot: 3,
        });
        setImagePreview("");
      }
    }
  }, [open, artwork, form]);

  const createMutation = useCreateArtwork();
  const updateMutation = useUpdateArtwork();

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const dataUrl = evt.target?.result as string;
      form.setValue("imageUrl", dataUrl, { shouldValidate: true });
      setImagePreview(dataUrl);
    };
    reader.readAsDataURL(file);
  }

  function onSubmit(values: FormValues) {
    setIsSubmitting(true);

    const placementData = values.placementEnabled
      ? (() => {
          const pos = computeArtworkPosition(values.wallId, values.wallSlot);
          return {
            xPosition: pos.x,
            yPosition: pos.y,
            zPosition: pos.z,
            rotation: pos.rotation,
            isManuallyPlaced: true,
          };
        })()
      : { isManuallyPlaced: false };

    const invalidate = () => {
      queryClient.invalidateQueries({ queryKey: getListArtworksQueryKey(galleryId) });
      queryClient.invalidateQueries({ queryKey: getGetDashboardStatsQueryKey() });
    };

    if (isEdit && artwork) {
      updateMutation.mutate(
        {
          id: artwork.id,
          data: {
            title: values.title,
            description: values.description || undefined,
            artistName: values.artistName || undefined,
            year: values.year || undefined,
            medium: values.medium || undefined,
            dimensions: values.dimensions || undefined,
            imageUrl: values.imageUrl,
            ...placementData,
          },
        },
        {
          onSuccess: () => {
            invalidate();
            toast({ title: "ARTWORK UPDATED", description: "Changes saved successfully." });
            onClose();
          },
          onError: () => {
            toast({ variant: "destructive", title: "ERROR", description: "Failed to update artwork." });
          },
          onSettled: () => setIsSubmitting(false),
        }
      );
    } else {
      createMutation.mutate(
        {
          data: {
            galleryId,
            title: values.title,
            description: values.description || undefined,
            artistName: values.artistName || undefined,
            year: values.year || undefined,
            medium: values.medium || undefined,
            dimensions: values.dimensions || undefined,
            imageUrl: values.imageUrl,
            ...placementData,
          },
        },
        {
          onSuccess: () => {
            invalidate();
            toast({ title: "ARTWORK ADDED", description: "The artwork has been added to this gallery." });
            onClose();
          },
          onError: () => {
            toast({ variant: "destructive", title: "ERROR", description: "Failed to add artwork." });
          },
          onSettled: () => setIsSubmitting(false),
        }
      );
    }
  }

  const floorPlanDots: PlacedArtworkDot[] = existingArtworks
    .filter((a) => a.id !== artwork?.id)
    .map((a) => {
      if (a.isManuallyPlaced) {
        const wId = detectWallFromRotation(a.rotation);
        const slot = detectSlotFromPosition(wId, a.xPosition, a.zPosition);
        return { id: a.id, wallId: wId, slotIndex: slot - 1, isCurrent: false, isManual: true };
      }
      return null;
    })
    .filter((d): d is PlacedArtworkDot => d !== null);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="bg-card border-border/50 rounded-none max-w-xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="font-display font-bold text-xl text-white tracking-widest uppercase">
            {isEdit ? "Edit Artwork" : "Add Artwork"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col min-h-0 flex-1">
            <div className="overflow-y-auto flex-1 space-y-5 pr-1">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-mono text-xs tracking-wider text-muted-foreground">
                      ARTWORK_TITLE *
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="E.g. Untitled No. 7"
                        className="font-mono bg-background/50 border-border/50 focus-visible:ring-primary rounded-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="font-mono text-xs" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="artistName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-mono text-xs tracking-wider text-muted-foreground">
                      ARTIST_NAME
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="E.g. Layla Al-Rashid"
                        className="font-mono bg-background/50 border-border/50 focus-visible:ring-primary rounded-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="font-mono text-xs" />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="year"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-mono text-xs tracking-wider text-muted-foreground">
                        YEAR
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="E.g. 2024"
                          className="font-mono bg-background/50 border-border/50 focus-visible:ring-primary rounded-none"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className="font-mono text-xs" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="medium"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-mono text-xs tracking-wider text-muted-foreground">
                        MEDIUM
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="E.g. Oil on canvas"
                          className="font-mono bg-background/50 border-border/50 focus-visible:ring-primary rounded-none"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className="font-mono text-xs" />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="dimensions"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-mono text-xs tracking-wider text-muted-foreground">
                      DIMENSIONS
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="E.g. 80 × 60 cm"
                        className="font-mono bg-background/50 border-border/50 focus-visible:ring-primary rounded-none"
                        {...field}
                      />
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
                    <FormLabel className="font-mono text-xs tracking-wider text-muted-foreground">
                      DESCRIPTION
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="What does this piece represent?"
                        className="font-mono bg-background/50 border-border/50 focus-visible:ring-primary rounded-none min-h-[80px] resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="font-mono text-xs" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="imageUrl"
                render={() => (
                  <FormItem>
                    <FormLabel className="font-mono text-xs tracking-wider text-muted-foreground">
                      ARTWORK_IMAGE *
                    </FormLabel>
                    <div className="space-y-3">
                      {imagePreview ? (
                        <div className="relative w-full aspect-video border border-border/50 overflow-hidden group">
                          <img
                            src={imagePreview}
                            alt="Artwork preview"
                            className="w-full h-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity font-mono text-xs text-white tracking-widest"
                          >
                            <Upload className="w-4 h-4 mr-2" /> REPLACE IMAGE
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="w-full aspect-video border border-dashed border-border/50 flex flex-col items-center justify-center gap-3 hover:border-primary/50 hover:bg-primary/5 transition-colors"
                        >
                          <ImageIcon className="w-8 h-8 text-muted-foreground/40" />
                          <span className="font-mono text-xs text-muted-foreground tracking-widest">
                            CLICK TO UPLOAD IMAGE
                          </span>
                        </button>
                      )}
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleFileChange}
                      />
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-px bg-border/40" />
                        <span className="font-mono text-[10px] text-muted-foreground tracking-widest">
                          OR PASTE URL
                        </span>
                        <div className="flex-1 h-px bg-border/40" />
                      </div>
                      <Input
                        placeholder="https://example.com/artwork.jpg"
                        className="font-mono bg-background/50 border-border/50 focus-visible:ring-primary rounded-none text-xs"
                        value={imagePreview.startsWith("data:") ? "" : imagePreview}
                        onChange={(e) => {
                          const url = e.target.value;
                          form.setValue("imageUrl", url, { shouldValidate: true });
                          setImagePreview(url);
                        }}
                      />
                    </div>
                    <FormMessage className="font-mono text-xs" />
                  </FormItem>
                )}
              />

              {/* Placement section */}
              <div className="border border-border/40 bg-background/30">
                <button
                  type="button"
                  onClick={() =>
                    form.setValue("placementEnabled", !watchPlacementEnabled)
                  }
                  className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-card/50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-primary" />
                    <span className="font-mono text-xs tracking-widest text-white">
                      GALLERY_PLACEMENT
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] text-muted-foreground tracking-widest">
                      {watchPlacementEnabled
                        ? `${WALL_NAMES[watchWallId]} · ${SLOT_LABELS[watchWallSlot - 1]}`
                        : "AUTO"}
                    </span>
                    <div
                      className={`w-7 h-4 rounded-full transition-colors relative ${
                        watchPlacementEnabled ? "bg-primary" : "bg-muted/40"
                      }`}
                    >
                      <div
                        className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${
                          watchPlacementEnabled ? "translate-x-3.5" : "translate-x-0.5"
                        }`}
                      />
                    </div>
                  </div>
                </button>

                {watchPlacementEnabled && (
                  <div className="px-3 pb-3 pt-0 space-y-4 border-t border-border/40">
                    <div className="flex gap-3 mt-3">
                      <div className="flex-1 space-y-2">
                        <p className="font-mono text-[10px] tracking-widest text-muted-foreground">
                          WALL
                        </p>
                        <div className="grid grid-cols-2 gap-1.5">
                          {WALL_NAMES.map((name, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() => form.setValue("wallId", i)}
                              className={`px-2 py-1.5 font-mono text-[10px] tracking-widest border transition-colors ${
                                watchWallId === i
                                  ? "border-primary bg-primary/10 text-primary"
                                  : "border-border/50 text-muted-foreground hover:border-primary/40 hover:text-white"
                              }`}
                            >
                              {name.toUpperCase()}
                            </button>
                          ))}
                        </div>

                        <p className="font-mono text-[10px] tracking-widest text-muted-foreground pt-1">
                          POSITION
                        </p>
                        <div className="flex gap-1">
                          {SLOT_LABELS.map((label, i) => (
                            <button
                              key={i}
                              type="button"
                              title={label}
                              onClick={() => form.setValue("wallSlot", i + 1)}
                              className={`flex-1 py-2 font-mono text-[10px] border transition-colors ${
                                watchWallSlot === i + 1
                                  ? "border-primary bg-primary/10 text-primary"
                                  : "border-border/50 text-muted-foreground hover:border-primary/40"
                              }`}
                            >
                              {i + 1}
                            </button>
                          ))}
                        </div>
                        <div className="flex justify-between px-0.5">
                          <span className="font-mono text-[9px] text-muted-foreground/60">
                            Left
                          </span>
                          <span className="font-mono text-[9px] text-muted-foreground/60">
                            Center
                          </span>
                          <span className="font-mono text-[9px] text-muted-foreground/60">
                            Right
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-col items-center gap-1.5">
                        <p className="font-mono text-[10px] tracking-widest text-muted-foreground self-start">
                          FLOOR PLAN
                        </p>
                        <FloorPlanPreview
                          dots={floorPlanDots}
                          activeWallId={watchWallId}
                          activeSlot={watchWallSlot}
                        />
                        <p className="font-mono text-[9px] text-muted-foreground/50 text-center">
                          ● this artwork
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <DialogFooter className="pt-4 pb-1 border-t border-border/30 flex gap-3 justify-end shrink-0">
              <Button
                type="button"
                variant="outline"
                className="rounded-none border-border/50 font-mono hover:bg-card"
                onClick={onClose}
              >
                CANCEL
              </Button>
              <Button
                type="submit"
                className="rounded-none font-mono tracking-widest bg-primary text-white hover:bg-primary/90"
                disabled={isSubmitting}
              >
                {isSubmitting && <Loader2 className="animate-spin w-4 h-4 mr-2" />}
                {isEdit ? "SAVE_CHANGES" : "ADD_ARTWORK"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default function DashboardGalleryArtworks() {
  const [, setLocation] = useLocation();
  const params = useParams();
  const { user, isLoading: isAuthLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const galleryId = parseInt(params.id ?? "0");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingArtwork, setEditingArtwork] = useState<Artwork | null>(null);

  useEffect(() => {
    if (!isAuthLoading && !user) {
      setLocation("/login");
    }
  }, [user, isAuthLoading, setLocation]);

  const { data: gallery, isLoading: isGalleryLoading } = useGetGallery(galleryId, {
    query: { queryKey: getGetGalleryQueryKey(galleryId), enabled: !!user && galleryId > 0 },
  });

  const { data: artworks, isLoading: isArtworksLoading } = useListArtworks(galleryId, {
    query: { queryKey: getListArtworksQueryKey(galleryId), enabled: !!user && galleryId > 0 },
  });

  const deleteMutation = useDeleteArtwork();

  function openAdd() {
    setEditingArtwork(null);
    setDialogOpen(true);
  }

  function openEdit(artwork: Artwork) {
    setEditingArtwork(artwork);
    setDialogOpen(true);
  }

  function handleDelete(id: number, title: string) {
    if (!window.confirm(`Delete "${title}"? This cannot be undone.`)) return;
    deleteMutation.mutate(
      { id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListArtworksQueryKey(galleryId) });
          queryClient.invalidateQueries({ queryKey: getGetDashboardStatsQueryKey() });
          toast({ title: "ARTWORK REMOVED", description: "The piece has been erased from this gallery." });
        },
        onError: () => {
          toast({ variant: "destructive", title: "ERROR", description: "Failed to delete artwork." });
        },
      }
    );
  }

  const isLoading = isAuthLoading || isGalleryLoading || isArtworksLoading;

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[50vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  const artworkList = (artworks ?? []) as Artwork[];

  function getPlacementLabel(artwork: Artwork): string {
    if (!artwork.isManuallyPlaced) return "Auto";
    const wallId = detectWallFromRotation(artwork.rotation);
    const slot = detectSlotFromPosition(wallId, artwork.xPosition, artwork.zPosition);
    return `${WALL_NAMES[wallId]} · ${SLOT_LABELS[slot - 1]}`;
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="flex items-start gap-4 border-b border-border/50 pb-6">
          <Button
            asChild
            variant="ghost"
            size="icon"
            className="rounded-none hover:bg-card mt-1 shrink-0"
          >
            <Link href="/dashboard/galleries">
              <ArrowLeft className="w-5 h-5" />
            </Link>
          </Button>
          <div className="flex-1 min-w-0">
            <p className="font-mono text-xs text-muted-foreground tracking-widest mb-1">
              GALLERY / {gallery?.title?.toUpperCase() ?? "..."}
            </p>
            <h1 className="text-3xl font-display font-bold tracking-widest text-white uppercase truncate">
              ARTWORKS
            </h1>
          </div>
          <Button
            onClick={openAdd}
            className="rounded-none bg-primary text-white font-mono tracking-widest hover:bg-primary/90 shadow-[0_0_10px_rgba(217,119,6,0.3)] shrink-0"
          >
            <Plus className="w-4 h-4 mr-2" /> ADD_ARTWORK
          </Button>
        </div>

        {artworkList.length === 0 ? (
          <div className="py-24 border border-dashed border-border flex flex-col items-center justify-center text-center bg-card/20">
            <ImageIcon className="w-12 h-12 text-muted-foreground/20 mb-4" />
            <p className="font-mono text-muted-foreground mb-6 tracking-widest text-sm">
              NO ARTWORKS IN THIS GALLERY
            </p>
            <Button
              onClick={openAdd}
              variant="outline"
              className="rounded-none border-primary/50 text-primary hover:bg-primary hover:text-white font-mono"
            >
              ADD FIRST ARTWORK
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {artworkList.map((artwork, i) => (
              <Card
                key={artwork.id}
                className="bg-card/40 border-border/50 backdrop-blur-sm rounded-none overflow-hidden group hover:border-primary/40 transition-colors animate-in fade-in slide-in-from-bottom-4"
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <div className="aspect-video bg-background/50 overflow-hidden relative">
                  {artwork.imageUrl ? (
                    <img
                      src={artwork.imageUrl}
                      alt={artwork.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon className="w-10 h-10 text-muted-foreground/20" />
                    </div>
                  )}
                  <div className="absolute top-2 right-2">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 font-mono text-[9px] tracking-widest border ${
                        artwork.isManuallyPlaced
                          ? "bg-primary/20 border-primary/40 text-primary"
                          : "bg-black/40 border-border/30 text-muted-foreground/60"
                      }`}
                    >
                      <MapPin className="w-2.5 h-2.5" />
                      {getPlacementLabel(artwork)}
                    </span>
                  </div>
                </div>
                <CardContent className="p-4">
                  <h3 className="font-display font-semibold text-base text-white truncate mb-1">
                    {artwork.title}
                  </h3>
                  {artwork.artistName && (
                    <p className="font-mono text-xs text-primary truncate mb-1">
                      {artwork.artistName}
                      {artwork.year ? `, ${artwork.year}` : ""}
                    </p>
                  )}
                  {(artwork.medium || artwork.dimensions) && (
                    <p className="font-mono text-[10px] text-muted-foreground/70 truncate mt-0.5">
                      {[artwork.medium, artwork.dimensions].filter(Boolean).join(" · ")}
                    </p>
                  )}
                  {artwork.description && (
                    <p className="font-sans text-xs text-muted-foreground line-clamp-2 mt-1">
                      {artwork.description}
                    </p>
                  )}
                  <div className="mt-4 pt-3 border-t border-border/30 flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-none border-border/50 font-mono text-xs hover:text-white hover:border-primary/50 h-8 px-3"
                      onClick={() => openEdit(artwork)}
                    >
                      <Pencil className="w-3.5 h-3.5 mr-1.5" /> EDIT
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-none border-border/50 font-mono text-xs text-destructive hover:bg-destructive/10 hover:text-destructive hover:border-destructive/50 h-8 px-3"
                      onClick={() => handleDelete(artwork.id, artwork.title)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <ArtworkFormDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        galleryId={galleryId}
        artwork={editingArtwork}
        existingArtworks={artworkList}
      />
    </DashboardLayout>
  );
}
