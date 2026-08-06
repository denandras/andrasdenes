import type { Metadata } from "next";
import { GetObjectCommand, ListObjectsV2Command, S3Client } from "@aws-sdk/client-s3";
import CvPageClient from "@/components/cv-page-client";
import { cookies } from "next/headers";
import { createMediaAccessToken } from "@/lib/media-access-token";
import { normalizeSiteLanguage, SITE_LANGUAGE_COOKIE } from "@/lib/site-language";
import { getMediaTokenSecret, getS4Config, getS4CvPrefix, getS4UpcomingPrefix } from "@/lib/s4-config";

export const metadata: Metadata = {
  title: "CV – András Dénes | Trombonist",
  description: "Curriculum vitae of András Dénes — Hungarian trombonist based in Budapest. Principal trombone of Alba Regia Symphony Orchestra, member of Óbudai Danubia Orchestra.",
  openGraph: {
    title: "CV – András Dénes | Trombonist",
    description: "Curriculum vitae of András Dénes — Hungarian trombonist based in Budapest.",
    url: "https://andrasdenes.com/cv",
  },
};

export const dynamic = "force-dynamic";

function isPdfKey(key: string) {
  return key.toLowerCase().endsWith(".pdf");
}

function isMarkdownKey(key: string) {
  const lowered = key.toLowerCase();
  return lowered.endsWith(".md") || lowered.endsWith(".markdown");
}

function fileNameFromKey(key: string) {
  const parts = key.split("/");
  return (parts[parts.length - 1] || "").toLowerCase();
}

function cvFileNameFromKey(key: string) {
  const parts = key.split("/");
  return parts[parts.length - 1] || "cv.pdf";
}

function ensureTrailingSlash(prefix: string) {
  return prefix.endsWith("/") ? prefix : `${prefix}/`;
}

type UpcomingConcert = {
  date: string;
  city: string;
  venue: string;
  note?: string;
  href?: string;
};

function isLikelyHref(value: string | undefined) {
  if (!value) return false;
  return /^(https?:\/\/|mailto:|tel:|\/)/i.test(value.trim());
}

function parseUpcomingConcertsMarkdown(raw: string): UpcomingConcert[] {
  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const bulletRows = lines
    .filter((line) => line.startsWith("- "))
    .map((line) => line.slice(2).trim());

  const tableRows = lines
    .filter((line) => line.startsWith("|") && line.endsWith("|"))
    .filter((line) => !/\|\s*[-:]+\s*\|/.test(line))
    .map((line) => line.slice(1, -1).trim())
    .filter((line) => !/^dátum\s*\|/i.test(line) && !/^date\s*\|/i.test(line));

  const sourceRows = bulletRows.length > 0 ? bulletRows : tableRows;

  return sourceRows
    .map((line) => line.split("|").map((part) => part.trim()))
    .filter((parts) => parts.length >= 3)
    .map((parts) => {
      // Format: date | city | venue | title | link
      const fourth = parts[3] || undefined;   // title
      const fifth = parts[4] || undefined;     // link
      const href = isLikelyHref(fifth) ? fifth : isLikelyHref(fourth) ? fourth : undefined;
      const note = href === fourth ? undefined : fourth;

      return {
        date: parts[0],
        city: parts[1] || "",
        venue: parts[2] || "",
        note,
        href,
      };
    });
}

function chooseUpcomingMarkdownKey(objects: Array<{ Key?: string; LastModified?: Date }>): string | null {
  const markdownObjects = objects.filter((obj) => obj.Key && isMarkdownKey(obj.Key));
  if (!markdownObjects.length) return null;

  const preferredNames = new Set([
    "upcoming-concerts.md",
    "upcoming concerts.md",
    "upcoming.md",
    "upcoming_concerts.md",
    "koncertek.md",
  ]);
  const preferred = markdownObjects.find((obj) => obj.Key && preferredNames.has(fileNameFromKey(obj.Key)));
  return preferred?.Key ?? null;
}

function createS4Client() {
  const cfg = getS4Config();
  if (!cfg) return null;

  const client = new S3Client({
    endpoint: cfg.endpoint,
    region: cfg.region,
    forcePathStyle: true,
    credentials: {
      accessKeyId: cfg.accessKeyId,
      secretAccessKey: cfg.secretAccessKey,
    },
  });

  return { cfg, client };
}

async function getCvDownloadUrl(): Promise<string | null> {
  const s4 = createS4Client();
  const tokenSecret = getMediaTokenSecret();
  const cvPrefixRaw = getS4CvPrefix();
  if (!s4 || !tokenSecret || !cvPrefixRaw) return null;

  const prefix = ensureTrailingSlash(cvPrefixRaw);

  try {
    let token: string | undefined;

    do {
      const list = await s4.client.send(
        new ListObjectsV2Command({
          Bucket: s4.cfg.bucket,
          Prefix: prefix,
          ContinuationToken: token,
          MaxKeys: 500,
        }),
      );

      const firstPdf = (list.Contents ?? []).find((obj) => obj.Key && isPdfKey(obj.Key));
      if (firstPdf?.Key) {
        const tokenValue = createMediaAccessToken(
          {
            key: firstPdf.Key,
            name: cvFileNameFromKey(firstPdf.Key),
            exp: Date.now() + 1000 * 60 * 60 * 24,
          },
          tokenSecret,
        );
        const encodedToken = encodeURIComponent(tokenValue);
        return `/api/media/file?token=${encodedToken}&download=1`;
      }

      token = list.IsTruncated ? list.NextContinuationToken : undefined;
    } while (token);

    return null;
  } catch {
    return null;
  }
}

async function getUpcomingConcerts(): Promise<UpcomingConcert[]> {
  const s4 = createS4Client();
  const upcomingPrefixRaw = getS4UpcomingPrefix() ?? getS4CvPrefix();
  if (!s4 || !upcomingPrefixRaw) return [];

  const prefix = ensureTrailingSlash(upcomingPrefixRaw);

  try {
    let token: string | undefined;
    let markdownKey: string | null = null;
    const markdownCandidates: Array<{ Key?: string; LastModified?: Date }> = [];

    do {
      const list = await s4.client.send(
        new ListObjectsV2Command({
          Bucket: s4.cfg.bucket,
          Prefix: prefix,
          ContinuationToken: token,
          MaxKeys: 500,
        }),
      );

      markdownCandidates.push(...(list.Contents ?? []));
      markdownKey = chooseUpcomingMarkdownKey(markdownCandidates);
      if (markdownKey) break;

      token = list.IsTruncated ? list.NextContinuationToken : undefined;
    } while (token);

    if (!markdownKey) return [];

    const objectOutput = await s4.client.send(
      new GetObjectCommand({
        Bucket: s4.cfg.bucket,
        Key: markdownKey,
      }),
    );

    if (!objectOutput.Body) return [];

    const markdown = await objectOutput.Body.transformToString();
    return parseUpcomingConcertsMarkdown(markdown);
  } catch {
    return [];
  }
}

export default async function CvPage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>;
}) {
  const cookieStore = await cookies();
  const { lang } = await searchParams;
  
  // URL param takes precedence, then cookie, then default
  const initialLanguage = normalizeSiteLanguage(
    lang ?? cookieStore.get(SITE_LANGUAGE_COOKIE)?.value,
  );

  const [cvDownloadUrl, upcomingConcerts] = await Promise.all([
    getCvDownloadUrl(),
    getUpcomingConcerts(),
  ]);

  return (
    <CvPageClient
      cvDownloadUrl={cvDownloadUrl}
      initialLanguage={initialLanguage}
      upcomingConcerts={upcomingConcerts}
    />
  );
}
