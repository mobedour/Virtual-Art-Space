import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/lib/auth";
import { SceneProvider, SCENES, useScene } from "@/lib/scene-context";

import Home from "@/pages/home";
import Login from "@/pages/login";
import Register from "@/pages/register";
import Dashboard from "@/pages/dashboard";
import Profile from "@/pages/profile";
import Galleries from "@/pages/galleries";
import GalleryForm from "@/pages/gallery-form";
import DashboardGalleryArtworks from "@/pages/dashboard-gallery-artworks";
import PublicGalleries from "@/pages/public-galleries";
import PublicGalleryDetail from "@/pages/public-gallery-detail";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

function GlobalBackground() {
  const { activeScene } = useScene();
  const scene = SCENES[activeScene];

  return (
    <div className="fixed inset-0 z-0" style={{ background: "#0e0a04" }}>
      <div
        key={activeScene}
        className="absolute inset-0 bg-fade-in"
        style={{
          backgroundImage: `url('${scene.img}')`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />
      <div
        className="absolute inset-0 transition-[background] duration-700"
        style={{ background: scene.overlay }}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 35%, rgba(0,0,0,0.55) 100%)",
        }}
      />
    </div>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/dashboard/profile" component={Profile} />
      <Route path="/dashboard/galleries" component={Galleries} />
      <Route path="/dashboard/galleries/new" component={GalleryForm} />
      <Route path="/dashboard/galleries/:id/edit" component={GalleryForm} />
      <Route path="/dashboard/galleries/:id/artworks" component={DashboardGalleryArtworks} />
      <Route path="/galleries" component={PublicGalleries} />
      <Route path="/gallery/:slug" component={PublicGalleryDetail} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AppInner() {
  return (
    <>
      <GlobalBackground />
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AuthProvider>
            <Router />
          </AuthProvider>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <SceneProvider>
        <AppInner />
      </SceneProvider>
    </QueryClientProvider>
  );
}
