"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Tracks whether the referenced YouTube iframe is playing, via the widget
 * `listening` postMessage handshake (no external API script, keeps the
 * youtube-nocookie.com embed domain). Cross-origin iframes cannot be
 * audio-sampled — only the play state is detected; callers derive any visual
 * amplitude from it. Degradation is graceful: if YouTube stops delivering
 * events the hook simply reports "not playing".
 */
export function useYoutubePlayState(
  ref: React.RefObject<HTMLIFrameElement | null>,
): boolean {
  const [playing, setPlaying] = useState(false);
  const stateRef = useRef<number | null>(null);
  const lastSeenRef = useRef(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let cancelled = false;
    const widgetId = "yt-listen-" + Math.random().toString(36).slice(2);

    const sendListening = () => {
      try {
        el.contentWindow?.postMessage(
          JSON.stringify({ event: "listening", id: widgetId, channel: "widget" }),
          "https://www.youtube-nocookie.com",
        );
      } catch {
        /* player not ready — retried by the interval below */
      }
    };

    const onLoad = () => sendListening();
    el.addEventListener("load", onLoad);

    const onMessage = (event: MessageEvent) => {
      if (event.source !== el.contentWindow) return;
      if (
        event.origin !== "https://www.youtube-nocookie.com" &&
        event.origin !== "https://www.youtube.com"
      ) {
        return;
      }
      let data: { event?: string; info?: number | { playerState?: number } } | null =
        null;
      try {
        data = JSON.parse(typeof event.data === "string" ? event.data : "");
      } catch {
        return;
      }
      if (!data || !data.event) return;

      // onStateChange carries the raw state number in `info`; infoDelivery
      // streams { playerState, currentTime, … } while playing.
      const raw = data.info;
      const state =
        typeof raw === "number"
          ? raw
          : typeof raw?.playerState === "number"
            ? raw.playerState
            : null;

      if (!["infoDelivery", "initialDelivery", "onStateChange"].includes(data.event)) {
        return;
      }

      if (state !== null) {
        stateRef.current = state;
        // Explicit pause/end/stop: kill freshness immediately.
        lastSeenRef.current = state === 1 || state === 3 ? Date.now() : 0;
      }
      if (data.event === "infoDelivery" || data.event === "initialDelivery") {
        lastSeenRef.current = Date.now();
      }
    };

    window.addEventListener("message", onMessage);

    sendListening();
    const handshake = window.setInterval(sendListening, 4000);

    // Playing detection: playerState 1 (playing) / 3 (buffering) AND the
    // delivery stream still heartbeating. Pausing stops the stream, so the
    // freshness window ends playback.
    const watchdog = window.setInterval(() => {
      if (cancelled) return;
      const state = stateRef.current;
      const activeState = state === 1 || state === 3;
      const fresh = Date.now() - lastSeenRef.current < 1500;
      setPlaying(activeState && fresh);
    }, 700);

    return () => {
      cancelled = true;
      el.removeEventListener("load", onLoad);
      window.removeEventListener("message", onMessage);
      window.clearInterval(handshake);
      window.clearInterval(watchdog);
    };
  }, [ref]);

  return playing;
}