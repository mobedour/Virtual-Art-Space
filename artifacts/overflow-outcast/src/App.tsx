import { useEffect } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ClerkProvider, SignIn, SignUp, useAuth } from "@clerk/react";
import { dark } from "@clerk/themes";
import { publishableKeyFromHost } from "@clerk/react/internal";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SceneProvider, SCENES, useScene } from "@/lib/scene-context";
import { setAuthTokenGetter } from "@workspace/api-client-react";

import Home from "@/pages/home";
import Dashboard from "@/pages/dashboard";
import Profile from "@/pages/profile";
import Galleries from "@/pages/galleries";
import GalleryForm from "@/pages/gallery-form";
import DashboardGalleryArtworks from "@/pages/dashboard-gallery-artworks";
import PublicGalleries from "@/pages/public-galleries";
import PublicGalleryDetail from "@/pages/public-gallery-detail";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

const clerkPublishableKey = publishableKeyFromHost(
  window.location.host,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);

const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL as string | undefined;

const clerkAppearance = {
  baseTheme: dark,
  cssLayerName: "clerk" as const,
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: "hsl(38, 92%, 50%)",
    colorForeground: "hsl(36, 20%, 94%)",
    colorMutedForeground: "hsl(30, 8%, 58%)",
    colorDanger: "hsl(0, 62.8%, 51%)",
    colorBackground: "hsl(24, 12%, 4%)",
    colorInput: "hsl(24, 8%, 16%)",
    colorInputForeground: "hsl(36, 20%, 94%)",
    colorNeutral: "hsl(24, 8%, 30%)",
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    fontFamilyButtons: "'Plus Jakarta Sans', sans-serif",
    borderRadius: "0.25rem",
  },
  elements: {
    rootBox: { display: "flex", justifyContent: "center", width: "100%" },
    cardBox: {
      background: "hsl(24, 10%, 7%)",
      borderRadius: "0.25rem",
      width: "440px",
      maxWidth: "100%",
      overflow: "hidden",
      border: "1px solid hsl(24, 8%, 18%)",
      boxShadow: "0 0 48px rgba(217, 119, 6, 0.08)",
    },
    card: { boxShadow: "none", border: "none", background: "transparent", borderRadius: 0 },
    footer: { boxShadow: "none", border: "none", background: "transparent", borderRadius: 0 },
    headerTitle: {
      fontFamily: "'Playfair Display', serif",
      fontStyle: "italic",
      color: "hsl(36, 20%, 94%)",
      letterSpacing: "-0.01em",
    },
    headerSubtitle: { color: "hsl(30, 8%, 58%)" },
    socialButtonsBlockButtonText: { color: "hsl(36, 20%, 94%)" },
    socialButtonsBlockButton: {
      borderColor: "hsl(24, 8%, 22%)",
      background: "hsl(24, 8%, 10%)",
      color: "hsl(36, 20%, 94%)",
    },
    formFieldLabel: { color: "hsl(30, 8%, 58%)" },
    formFieldInput: {
      background: "hsl(24, 8%, 10%)",
      borderColor: "hsl(24, 8%, 22%)",
      color: "hsl(36, 20%, 94%)",
    },
    formButtonPrimary: {
      background: "hsl(38, 92%, 50%)",
      color: "hsl(24, 12%, 6%)",
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      fontWeight: "600",
    },
    footerActionLink: { color: "hsl(38, 92%, 50%)" },
    footerActionText: { color: "hsl(30, 8%, 58%)" },
    footerAction: { borderTop: "1px solid hsl(24, 8%, 16%)" },
    dividerText: { color: "hsl(30, 8%, 58%)" },
    dividerLine: { background: "hsl(24, 8%, 22%)" },
    identityPreviewEditButton: { color: "hsl(38, 92%, 50%)" },
    formFieldSuccessText: { color: "hsl(142, 72%, 50%)" },
    alertText: { color: "hsl(36, 20%, 94%)" },
    alert: { borderColor: "hsl(24, 8%, 22%)" },
    otpCodeFieldInput: {
      borderColor: "hsl(24, 8%, 22%)",
      background: "hsl(24, 8%, 10%)",
      color: "hsl(36, 20%, 94%)",
    },
    userButtonPopoverCard: { background: "hsl(24, 10%, 7%)", border: "1px solid hsl(24, 8%, 18%)" },
    logoImage: { height: "2rem" },
  },
};

function ClerkAuthSync() {
  const { getToken, isSignedIn } = useAuth();

  useEffect(() => {
    if (isSignedIn) {
      setAuthTokenGetter(() => getToken());
    } else {
      setAuthTokenGetter(null);
    }
    return () => setAuthTokenGetter(null);
  }, [getToken, isSignedIn]);

  return null;
}

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

function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative z-10">
      <SignIn
        routing="path"
        path={`${basePath}/sign-in`}
        fallbackRedirectUrl={`${basePath}/dashboard`}
        signUpUrl={`${basePath}/sign-up`}
        appearance={clerkAppearance}
      />
    </div>
  );
}

function SignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative z-10">
      <SignUp
        routing="path"
        path={`${basePath}/sign-up`}
        fallbackRedirectUrl={`${basePath}/dashboard`}
        signInUrl={`${basePath}/sign-in`}
        appearance={clerkAppearance}
      />
    </div>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/sign-in/*?" component={SignInPage} />
      <Route path="/sign-up/*?" component={SignUpPage} />
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
      <ClerkAuthSync />
      <GlobalBackground />
      <TooltipProvider>
        <WouterRouter base={basePath}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </>
  );
}

export default function App() {
  return (
    <ClerkProvider
      publishableKey={clerkPublishableKey}
      {...(clerkProxyUrl ? { proxyUrl: clerkProxyUrl } : {})}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      signInFallbackRedirectUrl={`${basePath}/dashboard`}
      signUpFallbackRedirectUrl={`${basePath}/dashboard`}
    >
      <QueryClientProvider client={queryClient}>
        <SceneProvider>
          <AppInner />
        </SceneProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}
