import type { Metadata } from "next";
import BottomNav from "@/components/bottom-nav";
import BrandMark from "@/components/brand-mark";
import LanguageSwitcher from "@/components/language-switcher";
import MediaGallery from "@/components/media-gallery";
import { ListObjectsV2Command, S3Client } from "@aws-sdk/client-s3";
import { getMediaTokenSecret, getS4Config } from "@/lib/s4-config";
import { cookies } from "next/headers";
import { normalizeSiteLanguage, SITE_LANGUAGE_COOKIE } from "@/lib/site-language";
import { createMediaAccessToken } from "@/lib/media-access-token";

type MediaItem = {
  id: string;
  viewUrl: string;
  downloadUrl: string;
  title?: string;
};

const IMAGE_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp", "gif", "avif"]);
const MEDIA_TOKEN_TTL_MS = 60 * 60 * 1000; // 60 min

export const metadata: Metadata = {
  title: "Media – András Dénes | Trombonist",
  description: "Photos and media gallery of András Dénes, Hungarian trombonist based in Budapest.",
  openGraph: {
    title: "Media – András Dénes | Trombonist",
    description: "Photos and media gallery of András Dénes, Hungarian trombonist based in Budapest.",
    url: "https://andrasdenes.com/media",
  },
};

export const dynamic = "force-dynamic";

function isImageKey(key: string) {
  const ext = key.split(".").pop()?.toLowerCase();
  return !!ext && IMAGE_EXTENSIONS.has(ext);
}

function fileExtension(key: string) {
  return key.split(".").pop()?.toLowerCase() ?? "jpg";
}

async function getMediaItems(): Promise<MediaItem[]> {
  const cfg = getS4Config();
  const tokenSecret = getMediaTokenSecret();
  if (!cfg || !tokenSecret) return [];

  const client = new S3Client({
    endpoint: cfg.endpoint,
    region: cfg.region,
    forcePathStyle: true,
    credentials: {
      accessKeyId: cfg.accessKeyId,
      secretAccessKey: cfg.secretAccessKey,
    },
  });

  // Collect keys with LastModified so we can sort fresh-to-old
  const entries: Array<{ key: string; lastModified: number }> = [];
  let token: string | undefined;

  do {
    const list = await client.send(
      new ListObjectsV2Command({
        Bucket: cfg.bucket,
        Prefix: cfg.prefix,
        ContinuationToken: token,
        MaxKeys: 500,
      }),
    );

    for (const obj of list.Contents ?? []) {
      if (!obj.Key) continue;
      if (!isImageKey(obj.Key)) continue;
      entries.push({
        key: obj.Key,
        lastModified: obj.LastModified?.getTime() ?? 0,
      });
    }

    token = list.IsTruncated ? list.NextContinuationToken : undefined;
  } while (token);

  // Sort by lastModified descending (fresh to old)
  entries.sort((a, b) => b.lastModified - a.lastModified);

  return entries.map((entry, index) => {
    const ext = fileExtension(entry.key);
    const ordinal = String(index + 1).padStart(3, "0");
    const safeName = `andras-denes-media-${ordinal}.${ext}`;
    const accessToken = createMediaAccessToken(
      {
        key: entry.key,
        name: safeName,
        exp: Date.now() + MEDIA_TOKEN_TTL_MS,
      },
      tokenSecret,
    );
    const encodedToken = encodeURIComponent(accessToken);

    return {
      id: `${index}`,
      viewUrl: `/api/media/file?token=${encodedToken}`,
      downloadUrl: `/api/media/file?token=${encodedToken}&download=1`,
    };
  });
}

export default async function MediaPage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>;
}) {
  const cookieStore = await cookies();
  const { lang } = await searchParams;
  
  // URL param takes precedence, then cookie, then default
  const language = normalizeSiteLanguage(
    lang ?? cookieStore.get(SITE_LANGUAGE_COOKIE)?.value,
  );
  
  const mediaLabel = language === "hu" ? "Média" : "Media";
  const labels = language === "hu"
    ? {
        missingConfig: "Az S3 média környezeti változók nincsenek beállítva.",
        noMedia: "A beállított mappában nem találhatók médiafájlok.",
      }
    : {
        missingConfig: "S3 media environment variables are not configured. Add S4_* values in .env.local.",
        noMedia: "No media files found in the configured folder.",
      };

  const mediaItems = await getMediaItems();
  const hasConfig = !!getS4Config();

  return (
    <div className="flex min-h-screen flex-col bg-background-dark text-neutral-100">
      <header className="sticky top-0 z-50 border-b border-neutral-border bg-background-dark/80 backdrop-blur-md">
        <div className="relative flex h-16 w-full items-center justify-center px-6">
          <div className="flex items-center gap-2">
            <BrandMark />
            <h1 className="font-display text-lg font-bold tracking-tight uppercase">{mediaLabel}</h1>
          </div>
          <div className="absolute top-1/2 right-6 -translate-y-1/2">
            <LanguageSwitcher initialLanguage={language} light />
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-6 py-8 pb-24">
        <section className="relative pt-10">
          <h2 className="pointer-events-none absolute top-10 left-1 z-0 max-w-[92%] font-display text-5xl leading-[0.85] font-bold tracking-tight text-white uppercase md:text-6xl lg:text-7xl">
            {mediaLabel}
          </h2>

          {!hasConfig ? (
            <div className="relative z-10 mt-20 rounded-xl border border-neutral-border bg-neutral-dark/40 p-5 text-sm text-neutral-300 md:mt-24">
              {labels.missingConfig}
            </div>
          ) : mediaItems.length === 0 ? (
            <div className="relative z-10 mt-20 rounded-xl border border-neutral-border bg-neutral-dark/40 p-5 text-sm text-neutral-300 md:mt-24">
              {labels.noMedia}
            </div>
          ) : <div className="mt-20 md:mt-24"><MediaGallery items={mediaItems} /></div>}
        </section>
      </main>

      <BottomNav active="media" />
    </div>
  );
}
