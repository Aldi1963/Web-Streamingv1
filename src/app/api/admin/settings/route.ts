import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/services/auth-service";
import { listSafeSettings, saveSetting, settingDefinitions, type SettingKey } from "@/lib/settings";

async function admin() {
  const user = await auth.currentUser();
  return user && ["SUPER_ADMIN", "ADMIN"].includes(user.role) ? user : null;
}

export async function GET() {
  if (!await admin()) return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  return NextResponse.json({ settings: await listSafeSettings() });
}

export async function PUT(request: NextRequest) {
  const user = await admin();
  if (!user) return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  const body = await request.json().catch(() => null) as { settings?: Record<string, unknown> } | null;
  if (!body?.settings || typeof body.settings !== "object") {
    return NextResponse.json({ message: "Payload settings tidak valid." }, { status: 400 });
  }
  const allowed = new Set(Object.keys(settingDefinitions));
  for (const [key, rawValue] of Object.entries(body.settings)) {
    if (!allowed.has(key) || typeof rawValue !== "string" || rawValue.length > 4096) {
      return NextResponse.json({ message: `Setting ${key} tidak valid.` }, { status: 400 });
    }
    // Secret kosong berarti pertahankan nilai lama, bukan menghapus tanpa sengaja.
    if (settingDefinitions[key as SettingKey].sensitive && rawValue === "") continue;
    await saveSetting(key as SettingKey, rawValue.trim(), user.id);
  }
  return NextResponse.json({ message: "Pengaturan tersimpan.", settings: await listSafeSettings() });
}
