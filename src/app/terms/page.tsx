import type { Metadata } from "next";

export const metadata: Metadata = { title: "Ketentuan Layanan" };

export default function TermsPage() {
  return <main className="legal-page">
    <h1>Ketentuan Layanan</h1>
    <p>Terakhir diperbarui: 12 Juli 2026.</p>
    <h2>Akun dan akses</h2>
    <p>Pengguna bertanggung jawab menjaga keamanan akun dan tidak membagikan akses di luar batas perangkat paket. Akses dapat dibatasi ketika terdeteksi penyalahgunaan.</p>
    <h2>Langganan dan pembayaran</h2>
    <p>Fitur premium aktif setelah pembayaran berhasil diverifikasi. Masa akses, harga, dan batas perangkat mengikuti paket yang dipilih pada saat transaksi.</p>
    <h2>Konten</h2>
    <p>Metadata dan media disediakan melalui provider pihak ketiga. Ketersediaan judul atau episode dapat berubah dan gangguan provider dapat memengaruhi pemutaran.</p>
    <h2>Penggunaan yang dilarang</h2>
    <p>Pengguna dilarang mengakali kontrol akses, menyalahgunakan proxy media, melakukan scraping berlebihan, menyerang layanan, atau mendistribusikan ulang media tanpa izin.</p>
    <h2>Perubahan layanan</h2>
    <p>Ketentuan dapat diperbarui untuk mencerminkan perubahan produk, provider, keamanan, atau hukum. Versi terbaru selalu diterbitkan pada halaman ini.</p>
  </main>;
}
