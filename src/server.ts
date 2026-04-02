import express from 'express'
import path from 'path'
import apiRoutes from './routes/api'

const app = express()

app.use(express.json())
app.use(express.static('public'))

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'))
})

app.use('/api', apiRoutes)

const PORT = process.env.PORT || 3004
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`))