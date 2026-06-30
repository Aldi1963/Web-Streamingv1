"use client";
import Hls from "hls.js";
import { useEffect, useRef, useState } from "react";

export function VideoPlayer({ contentId }: { contentId: string }) {
  const ref = useRef<HTMLVideoElement>(null); const [error,setError]=useState(""); const [loading,setLoading]=useState(true);
  async function load() {
    setLoading(true); setError("");
    const response=await fetch(`/api/watch/${contentId}`,{method:"POST"});
    if(!response.ok){setError((await response.json()).message);setLoading(false);return}
    const {url,type}=await response.json(); const video=ref.current!;
    video.muted = true;
    if(type==="hls"&&Hls.isSupported()){const hls=new Hls();hls.loadSource(url);hls.attachMedia(video);hls.on(Hls.Events.ERROR,(_,data)=>data.fatal&&setError("Video gagal diputar."));}
    else video.src=url;
    setLoading(false); await video.play().catch(()=>{});
  }
  useEffect(()=>{load()},[]);
  return <div className="panel">{loading&&<p>Menyiapkan stream…</p>}{error?<><p>{error}</p><button className="button" onClick={load}>Coba lagi</button></>:<video ref={ref} controls autoPlay muted playsInline style={{width:"100%",maxHeight:"75vh",background:"#000"}}/>}</div>
}
