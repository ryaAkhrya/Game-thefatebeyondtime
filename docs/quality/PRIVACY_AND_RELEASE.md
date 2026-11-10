# PRIVACY, COPYRIGHT & RELEASE

Game bertema anniversary tetapi bisa dinikmati publik. Ini berarti versi public harus punya cerita yang berdiri sendiri **tanpa** mengungkap foto, tanggal spesifik, kontak, dan pengalaman pribadi pasangan.

## Public build

- Jangan bundel foto pribadi, suara, teks P.S. private, atau nama modern pasangan jika belum diizinkan.
- Sediakan memory fiksi bertema kebiasaan yang dibangun di game, **tidak mengklaim kisah nyata user**.
- Tidak ada login dan tidak ada upload; simpan progres lokal browser. Pemain diberitahu save dapat hilang bila data situs dibersihkan.
- Hanya konten asset yang punya hak pakai dan kredit yang benar; tidak menyalin sprite Final Fantasy/Undertale atau musik berhak cipta.

## Private anniversary build

- Gunakan pipeline build terpisah. Foto, tulisan, dan musik private dimasukkan hanya setelah user menyediakan file dan izin. Pasangan punya hak untuk menentukan apakah konten mereka bisa dipublikasikan.
- Jangan hanya memasang password JS/CSS dan mengira file private aman; browser dapat mengunduh asset yang tersedia publik.
- Jika user ingin tautan rahasia, gunakan hosting yang benar-benar membatasi akses dan verifikasi apa yang tersedia di folder build.

## Data minimization

- Settings/save lokal, tanpa tracking. Tidak mengirim metadata gameplay atau foto ke server.
- Jangan menyimpan informasi rahasia/token API di frontend. Env Vite dengan prefiks publik bukan ruang rahasia.
- Jangan menampilkan pesan private di screenshot publik, preview website atau repo publik.
