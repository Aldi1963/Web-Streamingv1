import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";
const db=new PrismaClient();
async function main(){
  const passwordHash=await bcrypt.hash("password",12);
  await db.user.upsert({where:{email:"admin@clipku.com"},update:{},create:{name:"Super Admin",email:"admin@clipku.com",passwordHash,role:Role.SUPER_ADMIN}});
  const demo=await db.user.upsert({where:{email:"user@clipku.com"},update:{},create:{name:"User Demo",email:"user@clipku.com",passwordHash,role:Role.USER}});
  const plans=[
    ["Trial 1 Hari","trial-1-hari",0,1,1,"480p",true],
    ["Basic Bulanan","basic-bulanan",49000,30,1,"720p",false],
    ["Premium Bulanan","premium-bulanan",99000,30,3,"1080p",false],
    ["Premium Tahunan","premium-tahunan",899000,365,5,"4K",false]
  ] as const;
  for(const [name,slug,price,durationDays,maxDevices,maxResolution,isTrial] of plans)await db.plan.upsert({where:{slug},update:{},create:{name,slug,price,durationDays,maxDevices,maxResolution,isTrial}});
  const premium=await db.plan.findUniqueOrThrow({where:{slug:"premium-bulanan"}});
  const active=await db.subscription.findFirst({where:{userId:demo.id,status:"ACTIVE",expiresAt:{gt:new Date()}}});
  if(!active)await db.subscription.create({data:{userId:demo.id,planId:premium.id,status:"ACTIVE",startsAt:new Date(),expiresAt:new Date(Date.now()+30*86400_000)}});
}
main().finally(()=>db.$disconnect());
