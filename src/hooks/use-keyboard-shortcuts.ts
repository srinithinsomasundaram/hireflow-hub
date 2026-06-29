import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";

export function useKeyboardShortcuts() {
  const navigate = useNavigate();

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName;
      const isTyping = ["INPUT", "TEXTAREA", "SELECT"].includes(tag)
        || (e.target as HTMLElement).isContentEditable;

      // Shortcuts that work even while typing
      if (e.key === "Escape") return; // handled by shadcn modals

      if (isTyping) return;

      switch (e.key) {
        case "d":
        case "D":
          navigate({ to: "/dashboard" });
          break;
        case "p":
        case "P":
          navigate({ to: "/pipeline" });
          break;
        case "j":
        case "J":
          navigate({ to: "/jobs" });
          break;
        case "n":
        case "N":
          if (e.metaKey || e.ctrlKey) return; // let browser handle Cmd+N
          navigate({ to: "/jobs/new" });
          break;
        case "i":
        case "I":
          navigate({ to: "/interviews" });
          break;
        case "c":
        case "C":
          navigate({ to: "/candidates" });
          break;
        case "/": {
          e.preventDefault();
          // Focus the first visible search input on the page
          const input = document.querySelector<HTMLInputElement>(
            'input[placeholder*="earch"], input[type="search"]'
          );
          if (input) input.focus();
          break;
        }
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [navigate]);
}
