import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getMediaTokenSecret, getS4ArtPrefix, getS4Config, getS4CvPrefix, getS4UpcomingPrefix } from "@/lib/s4-config";
import { verifyMediaAccessToken } from "@/lib/media-access-token";

const IMAGE_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp", "gif", "avif"]);
const DOCUMENT_EXTENSIONS = new Set(["pdf"]);
const RATE_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 120;

type RateEntry = {
  count: number;
  resetAt: number;
};

const rateStore = new Map<string, RateEntry>();

function fallbackContentType(key: string) {
  const ext = key.split(".").pop()?.toLowerCase();
  if (ext === "pdf") return "application/pdf";
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  if (ext === "gif") return "image/gif";
  if (ext === "avif") return "image/avif";
  return "image/jpeg";
}

function isSupportedMediaKey(key: string) {
  const ext = key.split(".").pop()?.toLowerCase();
  if (!ext) return false;
  return IMAGE_EXTENSIONS.has(ext) || DOCUMENT_EXTENSIONS.has(ext);
}

function sanitizeDownloadName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "-");
}

function isAllowedPrefixKey(key: string, prefix: string) {
  const normalizedPrefix = prefix.replace(/^\/+/, "");
  if (!normalizedPrefix) return false;

  if (normalizedPrefix.endsWith("/")) {
    return key.startsWith(normalizedPrefix);
  }

  return key === normalizedPrefix || key.startsWith(`${normalizedPrefix}/`);
}

function getAllowedPrefixes(primaryPrefix: string) {
  const candidates = [primaryPrefix, getS4CvPrefix(), getS4UpcomingPrefix(), getS4ArtPrefix()]
    .map((value) => value?.trim())
    .filter((value): value is string => !!value);

  return [...new Set(candidates)];
}

function getClientIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = request.headers.get("x-real-ip")?.trim();
  return forwarded || realIp || "unknown";
}

function enforceRateLimit(request: Request) {
  const now = Date.now();
  const ip = getClientIp(request);
  const existing = rateStore.get(ip);

  if (!existing || existing.resetAt <= now) {
    rateStore.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return { limited: false, remaining: RATE_LIMIT_MAX - 1, resetAt: now + RATE_WINDOW_MS };
  }

  if (existing.count >= RATE_LIMIT_MAX) {
    return { limited: true, remaining: 0, resetAt: existing.resetAt };
  }

  existing.count += 1;
  rateStore.set(ip, existing);
  return { limited: false, remaining: RATE_LIMIT_MAX - existing.count, resetAt: existing.resetAt };
}

export async function GET(request: Request) {
  const cfg = getS4Config();
  const tokenSecret = getMediaTokenSecret();

  if (!cfg || !tokenSecret) {
    return new Response("S4 configuration missing", { status: 500 });
  }

  const rateResult = enforceRateLimit(request);
  if (rateResult.limited) {
    const retryAfterSeconds = Math.max(1, Math.ceil((rateResult.resetAt - Date.now()) / 1000));
    return new Response("Too many requests", {
      status: 429,
      headers: {
        "Retry-After": String(retryAfterSeconds),
        "X-RateLimit-Limit": String(RATE_LIMIT_MAX),
        "X-RateLimit-Remaining": "0",
      },
    });
  }

  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");
  const download = searchParams.get("download") === "1";

  if (!token) {
    return new Response("Missing token", { status: 400 });
  }

  const payload = verifyMediaAccessToken(token, tokenSecret);
  if (!payload) {
    return new Response("Invalid or expired token", { status: 403 });
  }

  const key = payload.key;
  const allowedPrefixes = getAllowedPrefixes(cfg.prefix);
  const hasAllowedPrefix = allowedPrefixes.some((prefix) => isAllowedPrefixKey(key, prefix));
  if (!hasAllowedPrefix) {
    return new Response("Forbidden key prefix", { status: 403 });
  }
  if (!isSupportedMediaKey(key)) {
    return new Response("Unsupported media type", { status: 400 });
  }

  const client = new S3Client({
    endpoint: cfg.endpoint,
    region: cfg.region,
    forcePathStyle: true,
    credentials: {
      accessKeyId: cfg.accessKeyId,
      secretAccessKey: cfg.secretAccessKey,
    },
  });

  try {
    const output = await client.send(
      new GetObjectCommand({
        Bucket: cfg.bucket,
        Key: key,
      }),
    );

    if (!output.Body) {
      return new Response("File not found", { status: 404 });
    }

    const stream = output.Body.transformToWebStream();
    const contentType = output.ContentType || fallbackContentType(key);
    const safeName = sanitizeDownloadName(payload.name || "image.jpg");
    const disposition = download
      ? `attachment; filename="${safeName}"`
      : "inline";

    return new Response(stream, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": disposition,
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch {
    return new Response("Unable to fetch file", { status: 404 });
  }
}
