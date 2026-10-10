# TannProduct — Premium Creator Asset Store

TannProduct adalah PWA/static web store premium untuk aset Roblox. Versi ini **tidak memakai token, login, GitHub API dari browser, Node.js, Supabase, atau server upload**. Kamu menambahkan file secara manual ke folder `products/`, lalu mendaftarkan detailnya di `products.json`.

## Fitur

- Katalog publik dengan kartu produk, kategori, label Free/Premium, deskripsi, versi, dan harga IDR.
- Pencarian langsung, filter gratis/premium/tersimpan, dan pengurutan.
- Simpan/favorit di browser pengunjung masing-masing.
- Detail produk, tombol download, tautan pembelian eksternal, dan salin link produk.
- Tombol **Tambah Produk** berisi panduan tanpa token untuk memperbarui folder produk.
- Format aset Roblox `.rbxm` / `.rbxmx` melalui folder publik `products/`.
- PWA installable, shell offline, dan layout responsif untuk desktop maupun mobile.
- Tiga model `.rbxmx` demo disertakan sebagai isi awal katalog.

## Deploy ke Vercel

1. Unduh ZIP dan ekstrak folder `TannProduct`.
2. Unggah seluruh isi folder tersebut ke repository GitHub yang digunakan untuk deployment Vercel. Pastikan folder `products/` dan file `products.json` ikut terunggah.
3. Di Vercel, impor repository tadi. Pilih preset **Other** atau static site. Tidak perlu build command, install command, Node.js, atau backend.
4. Deploy. Setiap kali perubahan di-commit/push ke branch deployment, Vercel akan menjalankan deployment baru.

## Menambahkan produk gratis

1. Siapkan file model Roblox, misalnya `tann-gui.rbxmx`.
2. Salin file tersebut ke folder `products/` sehingga path-nya menjadi `products/tann-gui.rbxmx`.
3. Buka `products.json` yang berada di root project. Tambahkan satu objek baru ke dalam array JSON, dipisahkan koma dari objek sebelumnya. Contoh:

   ```json
   {
     "id": "tann-gui",
     "name": "Tann GUI Kit",
     "description": "Komponen UI Roblox yang bisa dikustomisasi.",
     "category": "UI / GUI",
     "type": "free",
     "price": 0,
     "version": "1.0.0",
     "format": "RBXMX",
     "filePath": "products/tann-gui.rbxmx",
     "downloadUrl": "/products/tann-gui.rbxmx",
     "purchaseUrl": "",
     "date": "2026-10-10",
     "accent": "violet"
   }
   ```

4. Pastikan ekstensi, huruf besar/kecil, `filePath`, dan `downloadUrl` cocok persis dengan nama file di folder. `id` harus unik.
5. Commit/push `products/tann-gui.rbxmx` dan perubahan `products.json` ke GitHub. Setelah deployment Vercel selesai, produk akan terlihat di katalog.

**Penting:** situs statis tidak dapat membaca daftar isi folder server secara otomatis. Karena itu, menaruh file ke folder `products/` saja belum cukup; file baru juga harus didaftarkan dalam `products.json`. Tombol **Tambah Produk** di situs menampilkan panduan ini tanpa meminta kredensial.

## Produk premium

Untuk produk premium, isi objek produk dengan `"type": "paid"`, harga `price` dalam Rupiah, dan URL HTTPS pada `purchaseUrl`. Jangan unggah file premium ke folder `products/` yang publik. Situs ini hanya menampilkan harga dan meneruskan pengunjung ke tautan pembelian; pembayaran dan penguncian file tidak diimplementasikan dalam situs statis tanpa layanan tambahan.

## Struktur proyek

```text
TannProduct/
├── index.html
├── styles.css
├── app.js
├── config.js
├── products.json
├── manifest.webmanifest
├── sw.js
├── icon.svg
├── vercel.json
└── products/
    ├── neon-platform.rbxmx
    ├── spawn-beacon.rbxmx
    └── crystal-decor.rbxmx
```

## Catatan

- Semua file dalam folder `products/` yang di-deploy ke situs publik dapat diakses siapa saja melalui URL langsung.
- Katalog disajikan dari file `products.json`; tidak ada database ataupun API upload.
- Favorit tersimpan di browser masing-masing pengunjung.
- PWA memerlukan HTTPS untuk perilaku service worker dan instalasi penuh; Vercel menyediakan HTTPS untuk deployment.

© TannProduct — Premium Creator Asset Store.
