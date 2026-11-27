# Gather.in — BNCC EEO Sponsorship & Partner CRM

**Gather.in** adalah prototipe sistem manajemen relasi dan pipeline sponsorship (*Sponsorship & Partner CRM*) untuk divisi **External Event Organizer (EEO) — Bina Nusantara Computer Club (BNCC)**. Aplikasi ini dirancang untuk berjalan secara statis di **GitHub Pages** menggunakan basis data JSON di dalam repositori (`public/data/*.json`) dan persistensi sisi klien (`localStorage` + `sessionStorage`).

---

## 1. Struktur Database Statis (`public/data/`)

Seluruh data awal (*seed data*) disimpan dalam berkas JSON statis pada folder `public/data/` dan dimuat menggunakan path relatif (`./data/*.json`) agar kompatibel dengan subpath GitHub Pages:

| Berkas JSON | Fungsi & Entitas |
|---|---|
| `public/data/users.json` | Daftar akun pengurus BNCC (`role: "admin"` untuk Manager/Bendahara, `role: "member"` untuk Staff EEO) beserta flag `canViewSponsorshipValue`. |
| `public/data/events.json` | Daftar event aktif yang dikelola BNCC (contoh: `BNCC TechSpire 2026`, `TechnoScape 2026`, `BNCC Hackathon`, `BNCC CSR`). |
| `public/data/partners.json` | Data perusahaan/partner per event beserta Contact Person (CP), tahap pipeline (1–9), tanggal kirim proposal, deadline otomatis `D+3` & `D+7`, jadwal meeting, daftar benefit, grade, nominal sponsorship, status MoU, dan riwayat aktivitas partner. |
| `public/data/mou_templates.json` | Template naskah MoU per event (`Sponsorship` dan `Media Partner / Komunitas`) dengan variabel placeholder otomatis. |
| `public/data/edit_requests.json` | Antrean permintaan pembaruan data Contact Person yang diajukan oleh Staff EEO (`Pending`, `Approved`, `Rejected` + alasan penolakan). |
| `public/data/activity_logs.json` | Audit trail aktivitas lintas kategori (`Proposal & Pipeline`, `Contact Person`, `Pitching & MoU`, `Impor & Handover`) lengkap dengan penanda `sensitive` untuk nominal kontrak. |

---

## 2. Alur Data (*Data Flow*) Aplikasi

```text
[public/data/*.json]  ──(fetch ./data/*.json saat inisialisasi)──▶  [jsonDb.ts]
                                                                        │
                                          ┌─────────────────────────────┴─────────────────────────────┐
                                          ▼                                                           ▼
                            [sessionStorage: Sesi User]                                [localStorage: gatherin_eeo_db_v2]
                                          │                                                           │
                                          └──────────────────────▶ [App State (React)] ◀──────────────┘
                                                                          │
                      ┌───────────────────────────────────────────────────┼───────────────────────────────────────────────────┐
                      ▼                                                   ▼                                                   ▼
         [Role: ADMIN (Manager/Bendahara)]                     [Event Switcher Context]                         [Role: MEMBER (Staff EEO)]
         - Lihat Total Deal & Nominal                          - Filter partners, templates,                    - Nominal Deal disembunyikan/dimask
         - Edit langsung CP & Pitching/Grading                   editRequests, & logs per eventId               - Edit CP masuk antrean Approval
         - Approve / Reject Edit Request                                                                        - Tab Pitching & Grading disembunyikan
         - Buat Event & Kelola Template MoU                                                                     - Bisa input proposal, follow-up, meeting, impor
```

### Penjelasan Alur Data per Fitur

1. **Inisialisasi & Persistensi (`src/services/jsonDb.ts`)**
   - Saat aplikasi dibuka pertama kali, `loadDatabaseState()` mengambil seluruh file JSON dari `public/data/*.json` secara paralel (`Promise.all`).
   - Data *seed* tersebut disalin ke `localStorage` (`gatherin_eeo_db_v2`) sehingga seluruh perubahan selama sesi prototipe (proposal baru, persetujuan edit, perubahan progress, jadwal meeting, template MoU, impor spreadsheet) tetap bertahan saat halaman di-*refresh*.
   - Tombol **Reset Data** di sidebar memanggil `resetDatabaseToSeed()` untuk mengembalikan `localStorage` ke kondisi awal `public/data/*.json`.

2. **Autentikasi & Penguncian Role (`src/utils/auth.ts`)**
   - Pengguna memilih kartu role (**ADMIN — Manager** atau **MEMBER — Staff EEO**) lalu memasukkan email `@bncc.net` dan password.
   - `authenticateUser()` memvalidasi domain email, kecocokan kredensial pada `users.json`, serta kesesuaian role yang dipilih dengan role akun.
   - Sesi pengguna aktif disimpan di `sessionStorage` (`gatherin_eeo_session_v2`), sedangkan hak akses UI diturunkan melalui `getRolePermissions(user)`.

3. **Konteks Event Aktif (`activeEventId`)**
   - Perubahan dropdown **Event Aktif Dikelola** di sidebar atau banner overview memfilter `partners`, `mouTemplates`, `editRequests`, dan `activityLogs` berdasarkan `eventId` yang dipilih.
   - Khusus **Manager**, tombol `+ Event Baru` menambahkan entitas event baru ke state `events` dan langsung mengaktifkan event tersebut.

4. **Input Proposal Baru & Reminder Otomatis D+3 / D+7 (`src/utils/pipeline.ts`)**
   - Saat form **+ Proposal Baru** atau **Impor Spreadsheet** dijalankan, `computeAutoDeadlines(proposalSentAt)` menghitung otomatis tanggal `deadlineD3` (+3 hari) dan `deadlineD7` (+7 hari).
   - `isPartnerOverdue()` memeriksa proposal berstatus `Pending` yang belum selesai follow-up dan tanggal jatuh temponya telah melewati tanggal hari ini, lalu memunculkannya di panel **Perlu Follow-Up Segera** dan popover lonceng notifikasi.

5. **Alur *Maker-Checker* Contact Person (`Staff -> Approval -> Manager`)**
   - **Staff EEO (`member`)** yang mengubah data Contact Person pada modal detail perusahaan tidak langsung mengubah `partners`, melainkan membuat objek `EditRequestRecord` baru berstatus `Pending` berisi perbandingan `oldValue` dan `newValue` di `editRequests`.
   - Badge merah pada menu **Persetujuan Edit** di sidebar Manager bertambah otomatis.
   - **Manager (`admin`)** membandingkan *Nilai Lama* vs *Nilai Baru* lalu memilih:
     - **Setujui & Terapkan**: Mengubah status request menjadi `Approved`, menimpa `partner.contactPerson` dengan `newValue`, dan menambahkan riwayat ke `partner.history` serta `activityLogs`.
     - **Tolak**: Membuka modal alasan penolakan (wajib diisi), menyimpan status `Rejected` beserta `rejectionReason` ke riwayat keputusan, tanpa mengubah data partner utama.
   - Jika **Manager** mengedit CP langsung di detail partner, perubahan langsung diterapkan ke `partners` dan dicatat di audit trail.

6. **Pipeline 9 Tahap, Meeting Schedule, & Pitching/Grading**
   - Setiap partner melewati 9 tahap berurutan: `Follow-up Day +3`, `Follow-up Day +7`, `Company response`, `Get PIC`, `Schedule meeting`, `Pitching`, `Interest follow-up`, `Grading`, dan `MoU`.
   - Tab **1. Follow Up & Progres** dan **2. Meeting Schedule** dapat diakses oleh kedua role.
   - Tab **3. Pitching & Grading** hanya terbuka untuk **Manager** guna mengisi ringkasan meeting, `Grade`, nominal sponsorship (`sponsorshipValue`), checklist benefit, serta status hasil (`Pending` / `Accept` / `Decline` dengan alasan penolakan wajib saat memilih `Decline`).

7. **Template MoU Event & Substitusi Placeholder Otomatis**
   - Partner dengan hasil `Accept` muncul pada daftar **Generate MoU Otomatis (Partner Accepted)**.
   - `renderMouDocument()` menyuntikkan nilai `{{event}}`, `{{tanggal}}`, `{{nama_company}}`, `{{cp}}`, `{{jabatan_cp}}`, `{{grade}}`, `{{nilai}}`, dan `{{benefit}}` secara dinamis.
   - Untuk akun **Staff EEO**, placeholder `{{nilai}}` otomatis disamarkan menjadi `[Nominal Dibatasi — Hanya Manager EEO & Bendahara]`, dan tombol pengelolaan template (`+ Template MoU Baru`, `Edit Template`, `Tandai MoU Selesai`) dinonaktifkan.

8. **Impor Spreadsheet / CSV (`parseSpreadsheetInput`)**
   - Mendukung tempel langsung (*copy-paste* TSV dari Google Sheets/Excel) maupun unggah file `.csv`.
   - Setiap baris divalidasi (Company, CP, Kontak, PIC, Format Tanggal `YYYY-MM-DD`) dan langsung dihitung jadwal D+3 / D+7 sebelum diimpor ke event aktif.

9. **Log Aktivitas & Audit Trail**
   - Setiap mutasi (proposal baru, follow-up, meeting, pengajuan/keputusan edit CP, grading, MoU, impor) otomatis menulis record baru ke `activityLogs`.
   - Entri yang bertanda `sensitive: true` menyembunyikan `sensitiveDetail` (nominal deal/kontrak) apabila dibuka oleh akun **Staff EEO**.

---

## 3. Matriks Hak Akses Role (RBAC)

| Kemampuan / Fitur | ADMIN (Manager EEO / Bendahara) | MEMBER (Staff EEO) |
|---|---|---|
| Melihat Daftar & Detail Sponsorship (Follow-Up & Meeting) | Ya | Ya |
| Input Proposal Baru & Impor Spreadsheet (Auto D+3 / D+7) | Ya | Ya |
| Melihat Nominal Deal & Total Nilai Sponsorship | **Ya** | **Tidak (Dibatasi/Disamarkan)** |
| Tab `3. Pitching & Grading` & Penetapan Grade/Nominal/Accept/Decline | **Ya** | **Tidak** |
| Pembaruan Contact Person (CP) | Langsung tersimpan | Mengajukan *Edit Request* ke Manager |
| Menu `Persetujuan Edit` (Approve / Reject dengan alasan) | **Ya** | **Tidak (Menu disembunyikan)** |
| Membuat Event Baru (`+ Event Baru`) | **Ya** | **Tidak** |
| Membuat/Mengedit Template MoU & Menandai MoU Selesai | **Ya** | **Tidak (Hanya lihat & preview tanpa nominal)** |
| Log Aktivitas & Audit Trail | Penuh (termasuk detail nominal) | Detail nominal sensitif disamarkan |

---

## 4. Akun Uji Prototype (`public/data/users.json`)

| Role | Nama | Email | Password |
|---|---|---|---|
| **ADMIN (Manager EEO)** | Hugo Mahesa | `cluster5@bncc.net` | `cluster5gacor` |
| **MEMBER (Staff EEO)** | Ahmad Fauzi | `cluster5@bncc.net` | `cluster5gacor` |
| **ADMIN (Manager EEO - Alternatif)** | Nathan Wijaya | `abcd.manager@bncc.net` | `eeo2026` |
| **ADMIN (Bendahara - Alternatif)** | Bendahara Umum BNCC | `bendahara@bncc.net` | `eeo2026` |
| **MEMBER (Staff EEO - Alternatif)** | Dhina Kusuma | `dhina.staff@bncc.net` | `eeo2026` |

---

## 5. Menjalankan & Deploy ke GitHub Pages

### Pengembangan Lokal
```bash
npm install --legacy-peer-deps
npm run dev
```

### Pengujian Unit & Build Produksi
```bash
npx tsx --test src/utils/auth.test.ts src/utils/pipeline.test.ts
npm run lint
npm run build
```

### Deploy GitHub Pages
Workflow `.github/workflows/deploy-pages.yml` otomatis membangun aplikasi menggunakan Vite (`base: './'`) dan memublikasikan isi folder `dist/` ke GitHub Pages setiap kali terdapat push ke branch `main`.
