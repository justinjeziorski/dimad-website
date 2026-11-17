import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { normalizeCityKey } from "@/lib/locationResolver";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type CityBackgroundRecord = {
  city: string;
  cityKey: string;
  imageUrl: string | null;
  thumbUrl?: string | null;
  photographerName: string | null;
  photographerUrl: string | null;
  unsplashPhotoId?: string | null;
  notFound: boolean;
  updatedAt: string;
};

export async function GET(request: NextRequest) {
  const city = String(request.nextUrl.searchParams.get("city") || "").trim();

  if (!city) {
    return NextResponse.json({ error: "Missing city query parameter" }, { status: 400 });
  }
  if (city.length > 80) {
    return NextResponse.json({ error: "City query is too long" }, { status: 400 });
  }

  const cityKey = normalizeCityKey(city);
  if (!cityKey) {
    return NextResponse.json({ error: "City could not be normalized" }, { status: 400 });
  }

  let docRef;
  try {
    docRef = getAdminDb().collection("city_backgrounds").doc(cityKey);
  } catch (error) {
    console.error("City image Firestore init failed:", error);
    return NextResponse.json({ error: "Firestore is not configured" }, { status: 500 });
  }

  try {
    const cachedSnap = await docRef.get();
    if (cachedSnap.exists) {
      const data = cachedSnap.data() || {};
      return NextResponse.json({
        cached: true,
        ...data
      });
    }

    const accessKey = process.env.UNSPLASH_ACCESS_KEY;
    if (!accessKey) {
      return NextResponse.json({ error: "UNSPLASH_ACCESS_KEY not configured" }, { status: 500 });
    }

    const query = encodeURIComponent(`${city} city skyline architecture`);
    const unsplashUrl = `https://api.unsplash.com/search/photos?query=${query}&orientation=landscape&per_page=1&content_filter=high`;
    const unsplashRes = await fetch(unsplashUrl, {
      cache: "no-store",
      headers: {
        Authorization: `Client-ID ${accessKey}`,
        "Accept-Version": "v1"
      }
    });

    if (!unsplashRes.ok) {
      const errText = await unsplashRes.text();
      console.error("Unsplash API error:", unsplashRes.status, errText);
      return NextResponse.json({ error: "Upstream Unsplash error" }, { status: 502 });
    }

    const unsplashData = await unsplashRes.json();
    const topResult = unsplashData.results?.[0];

    if (!topResult) {
      const emptyPayload: CityBackgroundRecord = {
        city,
        cityKey,
        imageUrl: null,
        photographerName: null,
        photographerUrl: null,
        notFound: true,
        updatedAt: new Date().toISOString()
      };
      await docRef.set(emptyPayload);
      return NextResponse.json({ cached: false, ...emptyPayload });
    }

    const payload: CityBackgroundRecord = {
      city,
      cityKey,
      imageUrl: topResult.urls?.regular || null,
      thumbUrl: topResult.urls?.small || null,
      photographerName: topResult.user?.name || null,
      photographerUrl: topResult.user?.links?.html || null,
      unsplashPhotoId: topResult.id || null,
      notFound: false,
      updatedAt: new Date().toISOString()
    };

    await docRef.set(payload);

    const downloadLocation = topResult.links?.download_location;
    if (downloadLocation) {
      fetch(downloadLocation, {
        cache: "no-store",
        headers: { Authorization: `Client-ID ${accessKey}` }
      }).catch(() => {});
    }

    return NextResponse.json({
      cached: false,
      ...payload
    });
  } catch (error) {
    console.error("City image route failure:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
