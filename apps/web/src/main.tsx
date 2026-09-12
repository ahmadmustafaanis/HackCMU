import { Auth0Provider, type AppState } from "@auth0/auth0-react";
import { StrictMode, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, useNavigate } from "react-router-dom";
import App from "./App.tsx";
import "./index.css";
import { SessionProvider } from "./state/session.tsx";

// Empty-string fallbacks let Auth0Provider mount even when the env vars
// aren't configured yet — Auth0SignInButton itself checks for that case and
// never actually triggers a login, so no real request is made with them.
const AUTH0_DOMAIN = (import.meta.env.VITE_AUTH0_DOMAIN as string | undefined) ?? "";
const AUTH0_CLIENT_ID = (import.meta.env.VITE_AUTH0_CLIENT_ID as string | undefined) ?? "";

/** Must be inside <BrowserRouter> to hand Auth0Provider a navigate-based
 * onRedirectCallback (Auth0's own recommended React Router pattern) — after
 * Universal Login redirects back with `code`/`state` query params, this
 * strips them from the URL via a router navigation instead of a raw
 * location change. We deliberately use loginWithRedirect (not
 * loginWithPopup) — the popup flow doesn't get the same double-invoke
 * protection as the redirect path (see auth0-provider's `didInitialise`
 * guard), which under React 18/19 StrictMode's dev-only double-effect
 * invocation left the ID token uncached after a real, successful login. */
function Auth0ProviderWithRedirect({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  return (
    <Auth0Provider
      domain={AUTH0_DOMAIN}
      clientId={AUTH0_CLIENT_ID}
      authorizationParams={{ redirect_uri: window.location.origin }}
      onRedirectCallback={(appState?: AppState) => {
        navigate(appState?.returnTo ?? "/", { replace: true });
      }}
    >
      {children}
    </Auth0Provider>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <Auth0ProviderWithRedirect>
        <SessionProvider>
          <App />
        </SessionProvider>
      </Auth0ProviderWithRedirect>
    </BrowserRouter>
  </StrictMode>
);
