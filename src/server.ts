import express from 'express';
import path from 'path';
import apiRoutes from './routes/api';

const app = express();

// Middleware
app.use(express.json());
app.use(express.static('public'));

// CORS для разработки
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');

    if (req.method === 'OPTIONS') {
        res.sendStatus(200);
    } else {
        next();
    }
});

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.use('/api', apiRoutes);

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        error: {
            code: 'NOT_FOUND',
            message: 'Endpoint not found',
        },
    });
});

// Error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Unhandled error:', err);
    res.status(500).json({
        error: {
            code: 'INTERNAL_ERROR',
            message: 'Internal server error',
        },
    });
});

const PORT = process.env.PORT || 3003;

app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📊 Dashboard available at http://localhost:${PORT}`);
    console.log(`🔧 API endpoints at http://localhost:${PORT}/api`);
});

export default app;