# Plan: Auth Gate Modal Sebelum Upgrade PRO

> **Goal:** Ketika user baru (tamu / belum login) mencoba melakukan upgrade ke PRO atau membeli paket tryout, tampilkan modal popup peringatan untuk Registrasi / Login terlebih dahulu agar akun dan transaksi mereka terhubung dengan benar.

---

## Current Context / Assumptions

1. **Komponen Modal:** `src/components/UpgradeProModal.tsx` saat ini langsung membuka tampilan pembayaran QRIS Saweria dan memanggil `/api/payment/create-order` tanpa memvalidasi apakah user sudah login.
2. **Kondisi Tanpa Login:** Jika user belum login, order dibuat tanpa `user_id` atau hanya memakai placeholder, sehingga setelah pembayaran selesai user tidak otomatis mendapatkan hak akses PRO pada akun mereka.
3. **Sistem Auth:** 
   - `src/lib/useUser.ts` menyediakan hook `useUser()` dengan properti `{ user, loading }`.
   - Halaman login berada di `/login` dan menerima query parameter `?redirect=...` untuk kembali ke halaman asal setelah login/register sukses.
4. **Desain & Tema:** Mengikuti palet Claude Amber (`#faf9f5`, `#c96442`, `#1e293b`), font Outfit, rounded corners, dan ikon dari `@phosphor-icons/react` saja.

---

## Architecture & Proposed Approach

Kita akan membuat popup peringatan **Auth Required** langsung di dalam alur Upgrade:

1. **Komponen Dialog Bersih (`AuthPromptModal.tsx` atau embedded di `UpgradeProModal.tsx`):**
   - Pendekatan terbaik & DRY: Menambahkan sub-state `auth_required` atau gate check di `UpgradeProModal.tsx` sebelum order dibuat.
   - Jika `!user` saat modal dibuka atau saat tombol "Lanjut ke Pembayaran" diklik, modal menampilkan kartu ajakan ramah:
     - Ikon Crown / Lock dengan aksen amber
     - Judul: "Masuk atau Daftar Terlebih Dahulu"
     - Deskripsi: "Untuk mengaktifkan fitur PRO dan menyimpan riwayat belajar serta akses paket secara permanen, kamu perlu masuk ke akun Lolos.in terlebih dahulu."
     - Tombol aksi utama: **"Masuk / Daftar Akun"** (mengarahkan ke `/login?redirect=...`)
     - Tombol batal / sekunder: "Nanti Saja" (menutup modal)
2. **Preserve Redirect URL:**
   - Parameter `redirect` diarahkan ke halaman aktif (misal `/simulasi` atau `/riwayat`) agar setelah OTP/login selesai, user kembali ke konteks yang sama.

---

## Step-by-Step Tasks

### Task 1: Tambahkan Deteksi Auth & Tampilan Auth Required di `UpgradeProModal.tsx`

**File target:** `src/components/UpgradeProModal.tsx`

**Rincian perubahan:**
1. Import `useUser` dari `@/lib/useUser`
2. Import `usePathname` dari `next/navigation`
3. Import ikon `UserPlus`, `LockKey` dari `@phosphor-icons/react`
4. Cek `user` saat modal `isOpen`:
   - Jika `!user && !loading`, cegah pemanggilan `fetchOrder()` otomatis agar tidak membuat order yatim (orphan order) di database.
   - Tampilkan view khusus `auth_required` di dalam modal atau replace step info dengan card ajakan login.

**Snippet kode:**
```tsx
// Di dalam UpgradeProModal.tsx
const { user, loading: userLoading } = useUser();
const pathname = usePathname();

useEffect(() => {
  if (!isOpen) {
    setStep('info');
    setOrderInfo(null);
    setErrorMessage('');
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    return;
  }

  // Jika belum login, jangan fetch order ke backend
  if (!user && !userLoading) {
    return;
  }

  const initialPlan = packageId && triggerPackage ? 'single' : 'pro';
  setSelectedPlan(initialPlan);

  fetch('/api/user/status')
    .then((r) => r.json())
    .then((d) => {
      if (d.email) setUserEmail(d.email);
    })
    .catch(() => null);

  fetchOrder(initialPlan);
}, [isOpen, packageId, triggerPackage, fetchOrder, user, userLoading]);
```

**Tampilan JSX jika `!user && !userLoading`:**
```tsx
if (isOpen && !user && !userLoading) {
  const loginUrl = `/login?redirect=${encodeURIComponent(pathname || '/simulasi')}`;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="card-modern max-w-md w-full p-6 text-center space-y-5 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition"
        >
          <XCircle size={22} weight="bold" />
        </button>

        <div
          className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center text-white shadow-md"
          style={{ background: '#c96442' }}
        >
          <Crown size={28} weight="fill" />
        </div>

        <div className="space-y-1.5">
          <h2 className="text-xl font-bold text-gray-800">
            Masuk atau Buat Akun Dulu
          </h2>
          <p className="text-xs text-gray-500 leading-relaxed max-w-sm mx-auto">
            Akses PRO dan paket tryout akan terikat permanen ke akun kamu. Silakan login atau registrasi gratis dalam 30 detik sebelum melanjutkan pembayaran.
          </p>
        </div>

        <div className="p-3.5 bg-orange-50/70 border border-orange-200 rounded-xl text-left space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-orange-800">
            <CheckCircle size={15} weight="fill" className="text-orange-600" />
            <span>Keuntungan Akun Terdaftar:</span>
          </div>
          <ul className="text-[11px] text-gray-600 space-y-1 pl-5 list-disc">
            <li>Akses tryout tidak akan hilang jika berganti browser / HP</li>
            <li>Progress roadmap & analisa kelemahan tersimpan aman</li>
            <li>Status PRO aktif otomatis setelah QRIS terverifikasi</li>
          </ul>
        </div>

        <div className="flex flex-col gap-2 pt-1">
          <Link
            href={loginUrl}
            className="w-full py-3 rounded-xl font-semibold text-white text-sm flex items-center justify-center gap-2 shadow-sm transition hover:opacity-95"
            style={{ background: '#c96442' }}
          >
            <span>Masuk / Daftar Akun</span>
            <ArrowRight size={16} weight="bold" />
          </Link>
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl text-xs font-medium text-gray-500 hover:bg-gray-100 transition"
          >
            Nanti Saja
          </button>
        </div>
      </div>
    </div>
  );
}
```

---

### Task 2: Verifikasi & Build Testing

**Commands:**
1. Jalankan `npm run build` untuk memastikan tidak ada kesalahan TypeScript / ESLint.
   - Target output: Exit code 0, semua route terkompilasi.
2. Cek semua titik pemanggilan `UpgradeProModal`:
   - `src/app/simulasi/page.tsx`
   - `src/app/riwayat/page.tsx`
   - Tombol navbar atau landing page (jika ada)

---

## Tests / Validation

1. **Uji Skenario Belum Login (Guest):**
   - Buka `/simulasi` dalam mode incognito / akun keluar.
   - Klik paket tryout berbayar (misal Tryout 3 atau Tryout 4 yang bertanda gembok PRO).
   - Modal muncul dengan judul **"Masuk atau Buat Akun Dulu"**.
   - Tombol "Masuk / Daftar Akun" memiliki link `/login?redirect=%2Fsimulasi`.
   - Tidak ada panggilan network ke `/api/payment/create-order`.
2. **Uji Skenario Sudah Login:**
   - Login dengan akun valid.
   - Buka `/simulasi` dan klik paket berbayar.
   - Modal langsung menampilkan pilihan paket dan QRIS pembayaran seperti biasa.

---

## Risks & Tradeoffs

- **UX Friction:** Menambah satu langkah bagi user yang ingin cepat bayar, tapi sangat krusial untuk mencegah keluhan *"Saya sudah bayar tapi tryout-nya belum terbuka karena saya belum login"*.
- **Redirect Seamlessness:** Query `?redirect=...` harus dipastikan dipatuhi oleh form login OTP agar user langsung diarahkan kembali ke simulasi. (Sudah diverifikasi di `src/app/login/page.tsx`).
