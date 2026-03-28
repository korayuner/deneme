// İş türlerine göre aşama şablonları
// Sıra önemli — son adım işi kapatır
export const ASAMA_SABLONLARI = {
  'Basit Bakım Onarım': [
    'Dilekçe/Gelen Yazı Alındı',
    'Yerinde İnceleme',
    'Teknik Rapor Hazırlandı',
    'Onarım Ön İzin Belgesi Hazırlandı',
    'Uygulama Denetimi',
    'Onarım Uygunluk Belgesi Gönderildi',
  ],
  'Mimari Proje Kontrol': [
    'Dilekçe/Gelen Yazı Alındı',
    'Yerinde İnceleme',
    '"Ne Zaman Başlayacaksınız" Yazısı Gönderildi',
    'Proje Esaslı Denetim',
    'Teknik Rapor Hazırlandı',
    'Kullanım Uygunluk Belgesi Gönderildi',
  ],
  'Restorasyon Proje Kontrol': [
    'Dilekçe/Gelen Yazı Alındı',
    'Yerinde İnceleme',
    '"Ne Zaman Başlayacaksınız" Yazısı Gönderildi',
    'Proje Esaslı Denetim',
    'Teknik Rapor Hazırlandı',
    'Kullanım Uygunluk Belgesi Gönderildi',
  ],
  'İzinsiz Uygulama': [
    'Gelen Yazı/Şikâyet/İhbar Alındı',
    'Yerinde İnceleme',
    'Aykırılık Tespiti',
    '"Ne Zaman Başlayacaksınız" Yazısı Gönderildi',
    'Teknik Rapor Hazırlandı',
    'Kurul ve Belediye Bildirimi Yapıldı',
  ],
  'Güvenlik Önlemi': [
    'Dilekçe/Gelen Yazı Alındı',
    'Yerinde İnceleme',
    '"Ne Zaman Başlayacaksınız" Yazısı Gönderildi',
    'Teknik Rapor Hazırlandı',
    'Kurula/Belediyeye Yazı Gönderildi',
  ],
  'Diğer': [
    'Gelen Yazı/Dilekçe Alındı',
    'Belge Kontrol',
    'Yerinde İnceleme',
    'Teknik Rapor Hazırlandı',
    'İlgili Kurumlara Yazı Gönderildi',
  ],
}

// Çoklu iş türü için aşamaları birleştir (tekrar edenleri bir kez yaz)
export function mergeAsamaAdlari(isTurleriStr) {
  if (!isTurleriStr) return ASAMA_SABLONLARI['Diğer']
  const types = isTurleriStr.split(',').map((t) => t.trim()).filter(Boolean)
  const seen = new Set()
  const merged = []
  for (const type of types) {
    const steps = ASAMA_SABLONLARI[type] || ASAMA_SABLONLARI['Diğer']
    for (const step of steps) {
      if (!seen.has(step)) {
        seen.add(step)
        merged.push(step)
      }
    }
  }
  return merged.length > 0 ? merged : ASAMA_SABLONLARI['Diğer']
}

// Belge türü renkleri
export const BELGE_TUR_RENK = {
  'Gelen':        'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  'Giden':        'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  'Teknik Rapor': 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  'Kurul Kararı': 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  'Diğer':        'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
}

export const BELGE_TURLER = ['Gelen', 'Giden', 'Teknik Rapor', 'Kurul Kararı', 'Diğer']

// İlerleme % hesapla
export function ilerlemeHesapla(tamamlanan, toplam) {
  if (!toplam || toplam === 0) return 0
  return Math.round((tamamlanan / toplam) * 100)
}

// Varsayılan Gemini promptu (ayarlardan override edilebilir)
export const VARSAYILAN_GEMINI_PROMPT = `ROL: İzmir Büyükşehir Belediyesi KUDEB biriminde çalışan, eski eserler ve imar mevzuatı uzmanısın.

GÖREV: Aşağıdaki belgeyi analiz et ve verileri istenen formatta döndür.

{HARMANLAMA_TALIMATI}

ÖNEMLİ KURALLAR:
1. Markdown (**, ##) kullanma — sadece düz metin.
2. Bilgi bulamazsan o alanı boş bırak, uydurma.
3. Ada/parsel bilgisinde parantez içi eski tapu ifadelerini (örn: "111 ada (e:542)") AYIR: ada="111", eski_ada="542".
4. Aşağıdaki başlık etiketlerini değiştirme.

İSTENEN FORMAT (her alan ayrı satırda):
SAYI: [evrak sayısı]
İLÇE: [ilçe adı]
MAHALLE: [mahalle adı]
ADA: [ada no — sadece sayı, parantez yok]
PARSEL: [parsel no]
ESKİ ADA: [eski ada no, varsa — parantez içindeydi]
ESKİ PARSEL: [eski parsel no, varsa]
KİMDEN: [gönderen kurum/kişi]
KİME: [alıcı]
TARİH: [GG.AA.YYYY]
KONU: [konu başlığı]
VADE TARİHİ: [cevap son tarihi, yoksa boş]
EKLER: [eklerin listesi]
ÖZET: [teknik özet]

BELGE İÇERİĞİ:
---
{BELGE_METNI}
---`
