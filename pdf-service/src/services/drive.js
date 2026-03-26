/**
 * Google Drive Servisi
 *
 * Klasör yapısı:
 *   KUDEB Arşivi (root — env'den ID gelir)
 *   └── 2025
 *       └── 2025-001_Konak İlçesi, Alsancak Mahallesi, 123 Ada, 45 Parsel
 *           ├── Belgeler
 *           └── Fotoğraflar
 *               └── 2025-03-15_Saha İncelemesi
 *                   ├── IMG_001.jpg
 *                   └── IMG_002.jpg
 *
 * Kimlik doğrulama: Google Service Account
 *   - GOOGLE_APPLICATION_CREDENTIALS=/app/credentials.json
 *   - GOOGLE_DRIVE_ROOT_FOLDER_ID=1abc...xyz
 */

import { google } from 'googleapis'
import { createReadStream } from 'fs'

const ROOT_FOLDER_ID = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID

function getDrive() {
  const auth = new google.auth.GoogleAuth({
    keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS,
    scopes: ['https://www.googleapis.com/auth/drive'],
  })
  return google.drive({ version: 'v3', auth })
}

// ─── Klasör Yönetimi ─────────────────────────────────────────────────────────

/**
 * Verilen isimde klasör yoksa oluşturur, varsa ID'sini döner.
 */
async function klasorBulVeyaOlustur(drive, isim, parentId) {
  const arama = await drive.files.list({
    q: `name='${isim.replace(/'/g, "\\'")}' and '${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: 'files(id,name)',
    spaces: 'drive',
  })

  if (arama.data.files.length > 0) {
    return arama.data.files[0].id
  }

  const yeni = await drive.files.create({
    requestBody: {
      name: isim,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentId],
    },
    fields: 'id',
  })

  return yeni.data.id
}

/**
 * Bir iş için tam klasör yapısını oluşturur/bulur.
 * Döner: { jobFolderId, belgelerFolderId, fotograflarFolderId }
 */
export async function getVeyaOlusturIsKlasoru(isNo, meta = {}) {
  if (!ROOT_FOLDER_ID) throw new Error('GOOGLE_DRIVE_ROOT_FOLDER_ID env değişkeni tanımlı değil.')

  const drive = getDrive()
  const yil = isNo.split('-')[0] || String(new Date().getFullYear())

  // 1. Yıl klasörü
  const yilFolderId = await klasorBulVeyaOlustur(drive, yil, ROOT_FOLDER_ID)

  // 2. İş klasörü: "2025-001_Konak İlçesi, Alsancak Mah., 123 Ada, 45 Parsel"
  const isKlasorAdi = olusturIsKlasorAdi(isNo, meta)
  const jobFolderId = await klasorBulVeyaOlustur(drive, isKlasorAdi, yilFolderId)

  // 3. Alt klasörler
  const [belgelerFolderId, fotograflarFolderId] = await Promise.all([
    klasorBulVeyaOlustur(drive, 'Belgeler', jobFolderId),
    klasorBulVeyaOlustur(drive, 'Fotoğraflar', jobFolderId),
  ])

  return { jobFolderId, belgelerFolderId, fotograflarFolderId }
}

/**
 * Fotoğraflar klasörü altında tarih/açıklama alt klasörü oluşturur.
 * Örn: "2025-03-15_Saha İncelemesi"
 */
export async function getVeyaOlusturIncelemeKlasoru(fotograflarFolderId, incelemeTarihi, aciklama = '') {
  const drive = getDrive()
  const tarihStr = incelemeTarihi || new Date().toISOString().split('T')[0]
  const ad = aciklama ? `${tarihStr}_${aciklama}` : tarihStr
  return klasorBulVeyaOlustur(drive, temizAd(ad), fotograflarFolderId)
}

// ─── Dosya Yükleme ────────────────────────────────────────────────────────────

/**
 * Fotoğrafı Drive'a yükler.
 * @returns {{ id, webViewLink, thumbnailLink }}
 */
export async function fotografYukle(filePath, fileName, folderId, mimeType = 'image/jpeg') {
  const drive = getDrive()

  const res = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: [folderId],
    },
    media: {
      mimeType,
      body: createReadStream(filePath),
    },
    fields: 'id,name,webViewLink,thumbnailLink,size,createdTime',
  })

  // Linki herkese açık yap (okuma yetkisi — şirket içi kullanım için)
  await drive.permissions.create({
    fileId: res.data.id,
    requestBody: { role: 'reader', type: 'anyone' },
  })

  return res.data
}

/**
 * PDF veya Word belgesini Belgeler klasörüne yükler.
 */
export async function belgeYukle(filePath, fileName, belgelerFolderId, mimeType = 'application/pdf') {
  const drive = getDrive()

  const res = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: [belgelerFolderId],
    },
    media: {
      mimeType,
      body: createReadStream(filePath),
    },
    fields: 'id,name,webViewLink,size,createdTime',
  })

  return res.data
}

// ─── Listeleme ────────────────────────────────────────────────────────────────

/**
 * Bir inceleme klasöründeki fotoğrafları listeler.
 */
export async function fotograflariListele(folderId) {
  const drive = getDrive()

  const res = await drive.files.list({
    q: `'${folderId}' in parents and mimeType contains 'image/' and trashed=false`,
    fields: 'files(id,name,webViewLink,thumbnailLink,size,createdTime)',
    orderBy: 'createdTime',
    spaces: 'drive',
  })

  return res.data.files || []
}

/**
 * Fotoğraflar klasörü altındaki tüm inceleme alt klasörlerini ve içindeki
 * fotoğrafları döner.
 */
export async function tumIncelmeleriGetir(fotograflarFolderId) {
  const drive = getDrive()

  // Alt klasörler (inceleme tarihleri)
  const klasorler = await drive.files.list({
    q: `'${fotograflarFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: 'files(id,name,webViewLink,createdTime)',
    orderBy: 'createdTime desc',
    spaces: 'drive',
  })

  const sonuclar = await Promise.all(
    (klasorler.data.files || []).map(async (klasor) => ({
      id: klasor.id,
      ad: klasor.name,
      link: klasor.webViewLink,
      tarih: klasor.createdTime,
      fotograflar: await fotograflariListele(klasor.id),
    }))
  )

  return sonuclar
}

/**
 * Bir işin Drive klasör linkini döner.
 */
export async function isDriveLinkiniGetir(jobFolderId) {
  const drive = getDrive()
  const res = await drive.files.get({
    fileId: jobFolderId,
    fields: 'webViewLink',
  })
  return res.data.webViewLink
}

// ─── Yardımcılar ─────────────────────────────────────────────────────────────

function olusturIsKlasorAdi(isNo, meta) {
  const parcalar = [isNo]
  if (meta.ilce)    parcalar.push(meta.ilce)
  if (meta.mahalle) parcalar.push(meta.mahalle)
  if (meta.ada)     parcalar.push(`${meta.ada} Ada`)
  if (meta.parsel)  parcalar.push(`${meta.parsel} Parsel`)
  return temizAd(parcalar.join('_'))
}

function temizAd(s) {
  return s.replace(/[\\/:*?"<>|]/g, '-').trim().slice(0, 200)
}
