const express = require('express');
const cors = require('cors');
const axios = require('axios');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const app = express();

// Enable CORS for your frontend domain
app.use(cors({
    origin: ['https://dubplanet.github.io', 'http://localhost:3000'],
    methods: ['GET']
}));

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
        if (cache.price.data && isCacheValid(cache.price.timestamp)) {
            return res.json(cache.price.data);
        }

        const response = await axios.get('https://api.binance.com/api/v3/ticker/price?symbol=SHIBUSDT');
        cache.price = {
            data: response.data,
            timestamp: Date.now()
        };
        res.json(response.data);
    } catch (error) {
        console.error('Error fetching price:', error.message);
        res.status(500).json({ error: 'Failed to fetch price data' });
    }
});

// 24h stats endpoint
app.get('/api/stats', async (req, res) => {
    try {
        if (cache.stats.data && isCacheValid(cache.stats.timestamp)) {
            return res.json(cache.stats.data);
        }

        const response = await axios.get('https://api.binance.com/api/v3/ticker/24hr?symbol=SHIBUSDT');
        cache.stats = {
            data: response.data,
            timestamp: Date.now()
        };
        res.json(response.data);
    } catch (error) {
        console.error('Error fetching stats:', error.message);
        res.status(500).json({ error: 'Failed to fetch stats data' });
    }
});

// Klines/candlestick endpoint
app.get('/api/klines', async (req, res) => {
    try {
        const { interval, limit, startTime } = req.query;
        const cacheKey = `${interval}-${limit}-${startTime}`;

        if (cache.klines.data[cacheKey] && isCacheValid(cache.klines.timestamp[cacheKey])) {
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

        cache.klines.data[cacheKey] = response.data;
        cache.klines.timestamp[cacheKey] = Date.now();
        
        res.json(response.data);
    } catch (error) {
        console.error('Error fetching klines:', error.message);
        res.status(500).json({ error: 'Failed to fetch klines data' });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
}); 