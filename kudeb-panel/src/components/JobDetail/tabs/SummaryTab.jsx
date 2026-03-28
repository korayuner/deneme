import { ExternalLink } from 'lucide-react'
import { InlineEditText, InlineEditDate, InlineEditSelect, InlineEditMultiSelect } from '../../common/InlineEdit'
import { useUpdateJob } from '../../../hooks/useJobs'
import { usePersoneller, useIsTurleri } from '../../../hooks/usePersonel'
import { formatDate, getVadeDurumu } from '../../../utils/date'
import Badge from '../../common/Badge'
import clsx from 'clsx'

function Field({ label, children, className = '' }) {
  return (
    <div className={clsx('flex flex-col gap-0.5', className)}>
      <dt className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">{label}</dt>
      <dd className="text-sm text-gray-800 dark:text-gray-200">{children}</dd>
    </div>
  )
}

export default function SummaryTab({ job }) {
  const { mutate: updateJob } = useUpdateJob()
  const { data: personeller = [] } = usePersoneller()
  const personelAdlari = personeller.map((p) => p.ad)
  const { data: isTurleri = [] } = useIsTurleri()
  const isTuruAdlari = isTurleri.map((t) => t.ad)

  const update = (field) => (value) => {
    updateJob({ id: job.id, data: { [field]: value } })
  }

  const vadeDurumu = getVadeDurumu(job.vade_tarihi)

  // Parse kronolojik ozet — lines starting with "- " or numbered
  const kronoloji = job.kronolojik_ozet
    ? job.kronolojik_ozet
        .split('\n')
        .map((l) => l.replace(/^[-*•]\s*/, '').trim())
        .filter(Boolean)
    : []

  return (
    <div className="p-4 overflow-y-auto h-full space-y-5 scrollbar-thin">
      {/* Identity */}
      <section>
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Kimlik Bilgileri</h3>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
          <Field label="İş No">
            <span className="font-mono font-semibold">{job.is_no || '-'}</span>
          </Field>
          <Field label="İlçe">
            <InlineEditText value={job.ilce_adi} onSave={update('ilce_adi')} placeholder="-" />
          </Field>
          <Field label="Mahalle">
            <InlineEditText value={job.mahalle_adi} onSave={update('mahalle_adi')} placeholder="-" />
          </Field>
          <Field label="Ada">
            <InlineEditText value={job.ada} onSave={update('ada')} placeholder="-" />
          </Field>
          <Field label="Parsel">
            <InlineEditText value={job.parsel} onSave={update('parsel')} placeholder="-" />
          </Field>
          <Field label="Eski Ada">
            <InlineEditText value={job.eski_ada} onSave={update('eski_ada')} placeholder="-" />
          </Field>
          <Field label="Eski Parsel">
            <InlineEditText value={job.eski_parsel} onSave={update('eski_parsel')} placeholder="-" />
          </Field>
          <Field label="İş Türü">
            <InlineEditMultiSelect
              value={job.is_turu_adi}
              onSave={update('is_turu_adi')}
              options={isTuruAdlari}
              placeholder="Tür seçilmedi"
            />
          </Field>
        </dl>
      </section>

      {/* Status */}
      <section>
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Durum & Görev</h3>
        <dl className="grid grid-cols-1 gap-y-3">
          <Field label="Görevli Personel">
            <InlineEditSelect
              value={job.gorevli_personel}
              onSave={update('gorevli_personel')}
              options={personelAdlari}
              placeholder="Atanmadı"
            />
          </Field>
          <Field label="Vade Tarihi">
            <div className="flex items-center gap-2">
              <InlineEditDate value={job.vade_tarihi} onSave={update('vade_tarihi')} />
              {vadeDurumu === 'gecmis' && <Badge variant="gecmis">Vadesi geçmiş</Badge>}
              {vadeDurumu === 'yaklasan' && <Badge variant="yaklasan">Bu hafta</Badge>}
            </div>
          </Field>
          <Field label="Son Durum">
            <InlineEditText
              value={job.son_durum}
              onSave={update('son_durum')}
              placeholder="Durum girilmedi"
              multiline
            />
          </Field>
        </dl>
      </section>

      {/* Tescil */}
      {job.tescil_aciklamasi && (
        <section>
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">Tescil Açıklaması</h3>
          <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line leading-relaxed bg-amber-50 dark:bg-amber-900/20 rounded-md p-3 border border-amber-200 dark:border-amber-800">
            {job.tescil_aciklamasi}
          </p>
        </section>
      )}

      {/* Kronoloji */}
      {kronoloji.length > 0 && (
        <section>
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">Kronolojik Özet</h3>
          <ol className="space-y-2">
            {kronoloji.map((item, i) => (
              <li key={i} className="flex gap-2 text-sm text-gray-700 dark:text-gray-300">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 text-xs flex items-center justify-center font-medium">
                  {i + 1}
                </span>
                <span className="leading-relaxed">{item}</span>
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* Kronoloji inline edit */}
      <section>
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">Kronoloji (Düzenle)</h3>
        <InlineEditText
          value={job.kronolojik_ozet}
          onSave={update('kronolojik_ozet')}
          placeholder="Her satıra bir madde girin"
          multiline
        />
      </section>

      {/* Oneri */}
      <section>
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">Öneri</h3>
        <InlineEditText
          value={job.oneri}
          onSave={update('oneri')}
          placeholder="Öneri girilmedi"
          multiline
        />
      </section>

      {/* OSM Link */}
      {job.osm_link && (
        <section>
          <a
            href={job.osm_link}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400"
          >
            <ExternalLink size={14} /> OpenStreetMap'te Görüntüle
          </a>
        </section>
      )}

      {/* Ozet update date */}
      {job.ozet_guncelleme && (
        <div className="text-xs text-gray-400 border-t border-gray-100 dark:border-gray-700 pt-3">
          Son güncelleme: {formatDate(job.ozet_guncelleme)}
        </div>
      )}
    </div>
  )
}
