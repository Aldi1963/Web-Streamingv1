import { access } from "fs/promises";
import { constants } from "fs";
import { db } from "../src/lib/db";

type Result={name:string;status:"OK"|"WARNING"|"ERROR";message:string};
const results:Result[]=[];
async function check(name:string,fn:()=>Promise<string>){try{results.push({name,status:"OK",message:await fn()})}catch(e){results.push({name,status:"ERROR",message:String(e)})}}
async function main(){
await check("Environment",async()=>{const required=["DATABASE_URL","AUTH_SECRET","CLIPKU_API_BASE_URL"];const missing=required.filter(x=>!process.env[x]);if(missing.length)throw new Error(`Kosong: ${missing.join(", ")}`);return "variabel wajib tersedia"});
await check("Database",async()=>{await db.$queryRaw`SELECT 1`;return "terhubung"});
await check("Clipku API",async()=>{const r=await fetch(process.env.CLIPKU_API_BASE_URL??"https://api.clipku.com",{signal:AbortSignal.timeout(10000)});if(!r.ok)throw new Error(`HTTP ${r.status}`);return `HTTP ${r.status}`});
await check("Documentation",async()=>{const text=await(await fetch(process.env.CLIPKU_API_BASE_URL??"https://api.clipku.com")).text();if(!text.includes("const PROVIDERS"))throw new Error("format dokumentasi berubah");return "provider registry ditemukan"});
await check("Folder permission",async()=>{await access(".",constants.R_OK|constants.W_OK);return "read/write"});
await check("Cache",async()=>`${await db.apiCache.count()} entri`);
await check("API error log",async()=>`${await db.apiLog.count({where:{errorMessage:{not:null}}})} error tercatat`);
const payment=process.env.PAYMENT_PROVIDER??"pakasir";
results.push({name:"Payment gateway",status:process.env.PAKASIR_API_KEY||process.env.MIDTRANS_SERVER_KEY||process.env.XENDIT_SECRET_KEY?"OK":"WARNING",message:`${payment}: kredensial ${process.env.PAKASIR_API_KEY?"tersedia":"belum lengkap"}`});
results.push({name:"Cron",status:"WARNING",message:"verifikasi scheduler dari panel VPS/cPanel"});
console.table(results);await db.$disconnect();if(results.some(x=>x.status==="ERROR"))process.exitCode=1;
}
main().catch((error)=>{console.error(error);process.exitCode=1});
