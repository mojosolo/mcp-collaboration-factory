import { NextRequest, NextResponse } from "next/server";

interface CorsConfig {
  allowedOrigins: string[] | string;
  allowedMethods: string[];
  allowedHeaders: string[];
  exposedHeaders?: string[];
  credentials: boolean;
  maxAge?: number;
  preflightContinue?: boolean;
  optionsSuccessStatus?: number;
}

const productionCorsConfig: CorsConfig = {
  allowedOrigins: [
    "https://projectwe.ai",
    "https://www.projectwe.ai",
    "https://app.projectwe.ai",
    "https://admin.projectwe.ai",
  ],
  allowedMethods: ["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"],
  allowedHeaders: [
    "Accept",
    "Accept-Language",
    "Content-Language",
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "X-CSRF-Token",
    "X-API-Key",
  ],
  exposedHeaders: [
    "X-RateLimit-Limit",
    "X-RateLimit-Remaining",
    "X-RateLimit-Reset",
    "X-Request-ID",
    "X-Response-Time",
  ],
  credentials: true,
  maxAge: 86400, // 24 hours
  optionsSuccessStatus: 200,
};

const developmentCorsConfig: CorsConfig = {
  allowedOrigins: [
    "http://localhost:3010",
    "http://localhost:3000",
    "http://127.0.0.1:3010",
    "http://127.0.0.1:3000",
    "https://projectwe.ai",
    "https://www.projectwe.ai",
  ],
  allowedMethods: ["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"],
  allowedHeaders: ["*"],
  exposedHeaders: ["*"],
  credentials: true,
  maxAge: 86400,
  optionsSuccessStatus: 200,
};

function isOriginAllowed(
  origin: string | null,
  allowedOrigins: string[] | string,
): boolean {
  if (!origin) return true; // Same-origin requests don't have an Origin header

  if (typeof allowedOrigins === "string") {
    return allowedOrigins === "*" || allowedOrigins === origin;
  }

  return allowedOrigins.includes(origin) || allowedOrigins.includes("*");
}

export function corsMiddleware(
  request: NextRequest,
  config?: CorsConfig,
): NextResponse | null {
  const corsConfig =
    config ||
    (process.env.NODE_ENV === "production"
      ? productionCorsConfig
      : developmentCorsConfig);

  const origin = request.headers.get("origin");
  const method = request.method;

  // Check if origin is allowed
  if (origin && !isOriginAllowed(origin, corsConfig.allowedOrigins)) {
    return new NextResponse("CORS policy violation", { status: 403 });
  }

  // Handle preflight requests
  if (method === "OPTIONS") {
    const response = new NextResponse(null, {
      status: corsConfig.optionsSuccessStatus || 204,
    });

    // Set CORS headers for preflight
    if (origin && isOriginAllowed(origin, corsConfig.allowedOrigins)) {
      response.headers.set("Access-Control-Allow-Origin", origin);
    }

    response.headers.set(
      "Access-Control-Allow-Methods",
      corsConfig.allowedMethods.join(", "),
    );
    response.headers.set(
      "Access-Control-Allow-Headers",
      corsConfig.allowedHeaders.join(", "),
    );

    if (corsConfig.credentials) {
      response.headers.set("Access-Control-Allow-Credentials", "true");
    }

    if (corsConfig.maxAge) {
      response.headers.set(
        "Access-Control-Max-Age",
        corsConfig.maxAge.toString(),
      );
    }

    return response;
  }

  // For actual requests, we'll add CORS headers to the response in the main middleware
  return null;
}

export function addCorsHeaders(
  response: NextResponse,
  request: NextRequest,
  config?: CorsConfig,
): void {
  const corsConfig =
    config ||
    (process.env.NODE_ENV === "production"
      ? productionCorsConfig
      : developmentCorsConfig);

  const origin = request.headers.get("origin");

  // Set CORS headers for actual requests
  if (origin && isOriginAllowed(origin, corsConfig.allowedOrigins)) {
    response.headers.set("Access-Control-Allow-Origin", origin);
  } else if (corsConfig.allowedOrigins.includes("*")) {
    response.headers.set("Access-Control-Allow-Origin", "*");
  }

  if (corsConfig.credentials) {
    response.headers.set("Access-Control-Allow-Credentials", "true");
  }

  if (corsConfig.exposedHeaders && corsConfig.exposedHeaders.length > 0) {
    response.headers.set(
      "Access-Control-Expose-Headers",
      corsConfig.exposedHeaders.join(", "),
    );
  }

  // Vary header to indicate that the response varies based on the Origin header
  const varyHeader = response.headers.get("Vary");
  if (varyHeader) {
    if (!varyHeader.includes("Origin")) {
      response.headers.set("Vary", `${varyHeader}, Origin`);
    }
  } else {
    response.headers.set("Vary", "Origin");
  }
}

// Strict CORS for API endpoints
export function apiCorsMiddleware(request: NextRequest): NextResponse | null {
  const strictConfig: CorsConfig = {
    allowedOrigins:
      process.env.NODE_ENV === "production"
        ? [
            "https://projectwe.ai",
            "https://www.projectwe.ai",
            "https://app.projectwe.ai",
          ]
        : ["http://localhost:3010", "http://127.0.0.1:3010"],
    allowedMethods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-API-Key",
      "X-CSRF-Token",
    ],
    credentials: true,
    maxAge: 300, // 5 minutes for API preflight cache
  };

  return corsMiddleware(request, strictConfig);
}

// Public CORS for marketing pages and assets
export function publicCorsMiddleware(
  request: NextRequest,
): NextResponse | null {
  const publicConfig: CorsConfig = {
    allowedOrigins: "*",
    allowedMethods: ["GET", "HEAD"],
    allowedHeaders: [
      "Accept",
      "Accept-Language",
      "Content-Language",
      "Content-Type",
    ],
    credentials: false,
    maxAge: 86400, // 24 hours
  };

  return corsMiddleware(request, publicConfig);
}

// WebSocket CORS (for Pusher, Socket.io, etc.)
export function webSocketCorsMiddleware(
  request: NextRequest,
): NextResponse | null {
  const wsConfig: CorsConfig = {
    allowedOrigins:
      process.env.NODE_ENV === "production"
        ? [
            "https://projectwe.ai",
            "https://www.projectwe.ai",
            "https://app.projectwe.ai",
          ]
        : ["http://localhost:3010", "http://127.0.0.1:3010"],
    allowedMethods: ["GET", "POST"],
    allowedHeaders: [
      "Authorization",
      "X-Requested-With",
      "Sec-WebSocket-Extensions",
      "Sec-WebSocket-Key",
      "Sec-WebSocket-Protocol",
      "Sec-WebSocket-Version",
    ],
    credentials: true,
    maxAge: 86400,
  };

  return corsMiddleware(request, wsConfig);
}
