import express from 'express'
import uploadRouter from './routes/upload.js'
import photosRouter from './routes/photos.js'
import tkgmRouter from './routes/tkgm.js'

const app = express()
const PORT = process.env.PORT || 4000

app.use(express.json())

// CORS — sadece kudeb-panel'den gelen isteklere izin ver
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN || '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (req.method === 'OPTIONS') return res.sendStatus(204)
  next()
})

app.use('/upload', uploadRouter)
app.use('/photos', photosRouter)
app.use('/tkgm', tkgmRouter)

app.get('/health', (_req, res) => res.json({ status: 'ok' }))

app.listen(PORT, () => {
  console.log(`pdf-service çalışıyor: http://0.0.0.0:${PORT}`)
})
