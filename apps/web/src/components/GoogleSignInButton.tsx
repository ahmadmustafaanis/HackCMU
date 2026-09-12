import { useEffect, useRef, useState } from "react";

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

interface GoogleSignInButtonProps {
  onCredential: (idToken: string) => void;
}

/** Renders Google's own "Sign in with Google" button (via the Identity
 * Services script tag in index.html) and forwards the resulting ID token to
 * `onCredential` for the caller to POST to /api/auth/google. Falls back to a
 * plain explanatory note if VITE_GOOGLE_CLIENT_ID isn't configured yet,
 * rather than rendering a broken/non-functional button. */
export default function GoogleSignInButton({ onCredential }: GoogleSignInButtonProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scriptReady, setScriptReady] = useState(false);

  useEffect(() => {
    if (!CLIENT_ID) return;

    let cancelled = false;
    const checkReady = () => {
      if (cancelled) return;
      if (window.google?.accounts?.id) {
        setScriptReady(true);
      } else {
        setTimeout(checkReady, 100);
      }
    };
    checkReady();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!CLIENT_ID || !scriptReady || !containerRef.current || !window.google) return;

    window.google.accounts.id.initialize({
      client_id: CLIENT_ID,
      callback: (response) => onCredential(response.credential),
    });
    window.google.accounts.id.renderButton(containerRef.current, {
      type: "standard",
      theme: "outline",
      size: "large",
      shape: "pill",
      text: "continue_with",
      width: 320,
    });
    // onCredential is expected to be a stable callback (from a parent
    // component's function-scope closure); re-running this effect on every
    // render would keep re-initializing the button unnecessarily.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scriptReady]);

  if (!CLIENT_ID) {
    return (
      <p className="text-xs text-muted">
        Google sign-in isn&apos;t configured yet — set <code>VITE_GOOGLE_CLIENT_ID</code> in{" "}
        <code>apps/web/.env</code> to enable it.
      </p>
    );
  }

  return <div ref={containerRef} className="flex justify-center" />;
}
