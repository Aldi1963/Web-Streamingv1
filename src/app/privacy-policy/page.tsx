import type { Metadata } from "next";

export const metadata: Metadata = { title: "Kebijakan Privasi" };

export default function PrivacyPolicyPage() {
  return <main className="legal-page">
    <h1>Kebijakan Privasi</h1>
    <p>Terakhir diperbarui: 12 Juli 2026.</p>
    <h2>Data yang kami proses</h2>
    <p>Clipku memproses data akun, sesi perangkat, alamat IP, histori tontonan, langganan, dan transaksi yang diperlukan untuk menyediakan serta mengamankan layanan.</p>
    <h2>Penggunaan data</h2>
    <p>Data digunakan untuk autentikasi, pemutaran konten, dukungan pelanggan, pencegahan penyalahgunaan, pemrosesan pembayaran, dan peningkatan layanan.</p>
    <h2>Pihak ketiga dan penyimpanan</h2>
    <p>Data pembayaran dapat diproses oleh penyedia pembayaran yang dipilih. Metadata dan media berasal dari provider yang tercantum pada layanan. Kami tidak menjual data pribadi pengguna.</p>
    <h2>Hak pengguna</h2>
    <p>Pengguna dapat memperbarui data akun, mengakhiri sesi perangkat, dan meminta penghapusan akun melalui dukungan Clipku, sesuai kewajiban penyimpanan yang berlaku.</p>
    <h2>Keamanan</h2>
    <p>Kami menerapkan enkripsi transport, pembatasan akses, session management, dan monitoring. Tidak ada sistem yang sepenuhnya bebas risiko, sehingga insiden akan ditangani sesuai ketentuan yang berlaku.</p>
  </main>;
}
