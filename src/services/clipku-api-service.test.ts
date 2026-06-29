import { describe,expect,it,vi } from "vitest";
vi.mock("@/lib/db",()=>({db:{}}));
import { ClipkuApiService } from "./clipku-api-service";
describe("Clipku response mapper",()=>{it("maps nested JSON",()=>{const service=new ClipkuApiService();expect(service.mapResponse({data:{id:"1",category:{name:"Drama"}}},{id:"data.id",category:"data.category.name"})).toEqual({id:"1",category:"Drama"})})});
describe("documentation reader",()=>{it("keeps only requested media categories",()=>{const html=`<script>const PROVIDERS = [{ id: 'demo', name: 'Demo Movie', color: '#fff', badge: 'VIDEO', category: 'Movie API', endpoints: [{ id: 'home', path: '/demo/home', desc: 'Homepage', fields: [] }] }];</script>`;const endpoints=new ClipkuApiService().parseEndpoints(html);expect(endpoints[0]).toMatchObject({providerSlug:"demo",path:"/demo/home",providerType:"Movie"})})});
