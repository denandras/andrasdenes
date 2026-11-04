"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  DEFAULT_SITE_LANGUAGE,
  normalizeSiteLanguage,
  SITE_LANGUAGE_COOKIE,
  type SiteLanguage,
} from "@/lib/site-language";

const SITE_LANGUAGE_STORAGE_KEY = "site-language";
const SITE_LANGUAGE_EVENT = "site-language-change";

function readCookieLanguage(): SiteLanguage | null {
  if (typeof document === "undefined") return null;
  const entries = document.cookie.split(";").map((part) => part.trim());
  const hit = entries.find((entry) => entry.startsWith(`${SITE_LANGUAGE_COOKIE}=`));
  if (!hit) return null;
  const value = decodeURIComponent(hit.split("=").slice(1).join("="));
  return normalizeSiteLanguage(value);
}

function persistLanguage(next: SiteLanguage) {
  localStorage.setItem(SITE_LANGUAGE_STORAGE_KEY, next);
  document.cookie = `${SITE_LANGUAGE_COOKIE}=${next}; path=/; max-age=31536000; SameSite=Lax`;
  window.dispatchEvent(new CustomEvent(SITE_LANGUAGE_EVENT, { detail: next }));
}

export function useSiteLanguage(initialLanguage?: SiteLanguage) {
  const [language, setLanguage] = useState<SiteLanguage>(() => {
    if (initialLanguage) return normalizeSiteLanguage(initialLanguage);
    if (typeof window === "undefined") return DEFAULT_SITE_LANGUAGE;
    const fromStorage = window.localStorage.getItem(SITE_LANGUAGE_STORAGE_KEY);
    const fromCookie = readCookieLanguage();
    return normalizeSiteLanguage(fromStorage ?? fromCookie ?? DEFAULT_SITE_LANGUAGE);
  });

  // Sync from initialLanguage prop changes (after router.refresh() from server)
  useEffect(() => {
    if (initialLanguage && normalizeSiteLanguage(initialLanguage) !== language) {
      setLanguage(normalizeSiteLanguage(initialLanguage));
    }
  }, [initialLanguage]);

  useEffect(() => {
    persistLanguage(language);
  }, [language]);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== SITE_LANGUAGE_STORAGE_KEY) return;
      setLanguage(normalizeSiteLanguage(event.newValue));
    };

    const onCustom = (event: Event) => {
      const detail = (event as CustomEvent<SiteLanguage>).detail;
      setLanguage(normalizeSiteLanguage(detail));
    };

    window.addEventListener("storage", onStorage);
    window.addEventListener(SITE_LANGUAGE_EVENT, onCustom as EventListener);

    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(SITE_LANGUAGE_EVENT, onCustom as EventListener);
    };
  }, []);

  const api = useMemo(() => ({
    language,
    setLanguage: (next: SiteLanguage) => {
      const normalized = normalizeSiteLanguage(next);
      setLanguage(normalized);
    },
  }), [language]);

  return api;
}

export default function LanguageSwitcher({
  initialLanguage,
  light = false,
}: {
  initialLanguage?: SiteLanguage;
  light?: boolean;
}) {
  const router = useRouter();
  const { language, setLanguage } = useSiteLanguage();
  const [isSwitching, setIsSwitching] = useState(false);
  const activeLanguage = initialLanguage ? normalizeSiteLanguage(initialLanguage) : language;

  const setAndRefresh = (next: SiteLanguage) => {
    if (next === activeLanguage || isSwitching) return;
    setIsSwitching(true);
    // Persist BEFORE router.refresh(): the refresh request must carry the new
    // language cookie, otherwise the server responds with the old initialLanguage
    // and the sync effect in useSiteLanguage reverts the toggle (bug: EN->HU
    // showed EN content with the concerts section unmounted).
    persistLanguage(next);
    setLanguage(next);
    router.refresh();
  };

  // Reset switching state after refresh completes
  useEffect(() => {
    if (isSwitching) {
      const timeout = setTimeout(() => setIsSwitching(false), 100);
      return () => clearTimeout(timeout);
    }
  }, [language, isSwitching]);

  return (
    <div
      className={`inline-flex items-center text-xs font-bold tracking-wider ${
        light ? "text-white" : "text-neutral-200"
      }`}
    >
      <button
        type="button"
        disabled={activeLanguage === "hu" || isSwitching}
        onClick={() => setAndRefresh("hu")}
        className={`px-1.5 py-0.5 transition-opacity ${activeLanguage === "hu" ? "cursor-default text-white" : "cursor-pointer text-white/80 hover:text-white"} ${isSwitching ? "opacity-50" : ""}`}
      >
        HU
      </button>
      <span className="px-1 text-white/70">|</span>
      <button
        type="button"
        disabled={activeLanguage === "en" || isSwitching}
        onClick={() => setAndRefresh("en")}
        className={`px-1.5 py-0.5 transition-opacity ${activeLanguage === "en" ? "cursor-default text-white" : "cursor-pointer text-white/80 hover:text-white"} ${isSwitching ? "opacity-50" : ""}`}
      >
        EN
      </button>
    </div>
  );
}
