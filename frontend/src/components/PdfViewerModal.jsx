import { useState } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'

pdfjs.GlobalWorkerOptions.workerSrc = workerSrc

export default function PdfViewerModal({ fileUrl, pageNumber, title, onClose }) {
  const [numPages, setNumPages] = useState(null)
  const [page, setPage] = useState(pageNumber)
  const [error, setError] = useState(false)

  return (
    <div className="pdf-modal-overlay" onClick={onClose}>
      <div className="pdf-modal-box" onClick={e => e.stopPropagation()}>
        <div className="pdf-modal-header">
          <span className="pdf-modal-title">{title} — صفحة {page}</span>
          <button className="pdf-modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="pdf-modal-body">
          {error ? (
            <div className="pdf-modal-error">تعذّر تحميل الملف</div>
          ) : (
            <Document
              file={fileUrl}
              onLoadSuccess={({ numPages }) => setNumPages(numPages)}
              onLoadError={() => setError(true)}
              loading={<div className="pdf-modal-loading">جاري التحميل...</div>}
            >
              <Page pageNumber={page} width={Math.min(window.innerWidth - 40, 700)} />
            </Document>
          )}
        </div>

        {numPages && (
          <div className="pdf-modal-nav">
            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}>السابقة ‹</button>
            <span>{page} / {numPages}</span>
            <button disabled={page >= numPages} onClick={() => setPage(p => p + 1)}>› التالية</button>
          </div>
        )}
      </div>
    </div>
  )
}
