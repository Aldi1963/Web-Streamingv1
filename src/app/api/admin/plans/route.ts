import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/services/auth-service";
import { db } from "@/lib/db";

const input=z.object({id:z.string().optional(),name:z.string().trim().min(2).max(80),slug:z.string().regex(/^[a-z0-9-]+$/),price:z.number().min(0),durationDays:z.number().int().min(1).max(3650),isTrial:z.boolean(),isActive:z.boolean()});
async function admin(){const user=await auth.currentUser();return user&&["SUPER_ADMIN","ADMIN"].includes(user.role)?user:null}
export async function GET(){if(!await admin())return NextResponse.json({message:"Forbidden"},{status:403});return NextResponse.json(await db.plan.findMany({include:{_count:{select:{subscriptions:true}}},orderBy:[{isActive:"desc"},{price:"asc"}]}))}
export async function POST(request:Request){const user=await admin();if(!user)return NextResponse.json({message:"Forbidden"},{status:403});const data=input.omit({id:true}).parse(await request.json());const plan=await db.plan.create({data:{...data,maxDevices:1,maxResolution:"1080p"}});await db.adminAuditLog.create({data:{adminId:user.id,action:"PLAN_CREATE",entityType:"Plan",entityId:plan.id,detail:{name:plan.name}}});return NextResponse.json({message:"Paket dibuat.",plan})}
export async function PATCH(request:Request){const user=await admin();if(!user)return NextResponse.json({message:"Forbidden"},{status:403});const data=input.parse(await request.json());if(!data.id)return NextResponse.json({message:"ID paket wajib."},{status:400});const {id,...values}=data;const plan=await db.plan.update({where:{id},data:values});await db.adminAuditLog.create({data:{adminId:user.id,action:"PLAN_UPDATE",entityType:"Plan",entityId:id,detail:{name:plan.name}}});return NextResponse.json({message:"Paket diperbarui.",plan})}
