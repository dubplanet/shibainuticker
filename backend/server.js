const express = require('express');
const cors = require('cors');
const axios = require('axios');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const app = express();

// Error handling for uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (error) => {
    console.error('Unhandled Rejection:', error);
});

// Enable CORS for your frontend domain
app.use(cors({
    origin: ['https://shibainucointracker.com', 'https://dubplanet.github.io', 'http://localhost:3000'],
    methods: ['GET'],
    credentials: true
}));

// Add request logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// Middleware to parse JSON bodies
app.use(express.json());

// Cache for API responses
const cache = {
    price: { data: null, timestamp: 0 },
    stats: { data: null, timestamp: 0 },
    klines: { data: {}, timestamp: {} }
};

const CACHE_DURATION = 5000; // 5 seconds cache

// Helper function to check if cache is valid
const isCacheValid = (timestamp) => {
    return Date.now() - timestamp < CACHE_DURATION;
};

// Price endpoint
app.get('/api/price', async (req, res) => {
    try {
        console.log('Fetching price data...');
        if (cache.price.data && isCacheValid(cache.price.timestamp)) {
            console.log('Returning cached price data');
            return res.json(cache.price.data);
        }

        const response = await axios.get('https://api.binance.com/api/v3/ticker/price?symbol=SHIBUSDT');
        console.log('Received price data from Binance:', response.data);
        cache.price = {
            data: response.data,
            timestamp: Date.now()
        };
        res.json(response.data);
    } catch (error) {
        console.error('Error fetching price:', error.message);
        res.status(500).json({ error: 'Failed to fetch price data', details: error.message });
    }
});

// 24h stats endpoint
app.get('/api/stats', async (req, res) => {
    try {
        console.log('Fetching stats data...');
        if (cache.stats.data && isCacheValid(cache.stats.timestamp)) {
            console.log('Returning cached stats data');
            return res.json(cache.stats.data);
        }

        const response = await axios.get('https://api.binance.com/api/v3/ticker/24hr?symbol=SHIBUSDT');
        console.log('Received stats data from Binance:', response.data);
        cache.stats = {
            data: response.data,
            timestamp: Date.now()
        };
        res.json(response.data);
    } catch (error) {
        console.error('Error fetching stats:', error.message);
        res.status(500).json({ error: 'Failed to fetch stats data', details: error.message });
    }
});

// Klines/candlestick endpoint
app.get('/api/klines', async (req, res) => {
    try {
        console.log('Fetching klines data...');
        const { interval, limit, startTime } = req.query;
        const cacheKey = `${interval}-${limit}-${startTime}`;

        if (cache.klines.data[cacheKey] && isCacheValid(cache.klines.timestamp[cacheKey])) {
            console.log('Returning cached klines data');
            return res.json(cache.klines.data[cacheKey]);
        }

        const response = await axios.get(`https://api.binance.com/api/v3/klines`, {
            params: {
                symbol: 'SHIBUSDT',
                interval,
                limit,
                startTime
            }
        });

        console.log('Received klines data from Binance');
        cache.klines.data[cacheKey] = response.data;
        cache.klines.timestamp[cacheKey] = Date.now();
        
        res.json(response.data);
    } catch (error) {
        console.error('Error fetching klines:', error.message);
        res.status(500).json({ error: 'Failed to fetch klines data', details: error.message });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    console.log('Health check requested');
    res.json({ 
        status: 'ok',
        timestamp: new Date().toISOString(),
        env: process.env.NODE_ENV,
        port: process.env.PORT || 3000
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Global error handler:', err);
    res.status(500).json({ error: 'Internal server error', details: err.message });
});

// Handle 404 routes
app.use((req, res) => {
    console.log('404 - Route not found:', req.url);
    res.status(404).json({ error: 'Route not found' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server starting...`);
    console.log(`Environment: ${process.env.NODE_ENV}`);
    console.log(`Port: ${PORT}`);
    console.log(`Server running at http://0.0.0.0:${PORT}`);
}); 