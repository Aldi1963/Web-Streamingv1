import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/services/auth-service";
import { db } from "@/lib/db";

export async function DELETE(request: Request) {
  const user = await auth.currentUser();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const { id, all } = z.object({ id: z.string().optional(), all: z.boolean().optional() }).parse(await request.json());
  const result = await db.deviceSession.deleteMany({ where: { userId: user.id, ...(all ? {} : { id: id || "__missing__" }) } });
  return NextResponse.json({ message: `${result.count} perangkat dikeluarkan.` });
}
