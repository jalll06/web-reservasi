const path = require('path');
const express = require('express');
require('dotenv').config();
const apiHandler = require('./api/index');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.all('/api', async (req, res) => {
    try {
        await apiHandler(req, res);
    } catch (err) {
        console.error('API error:', err);
        if (!res.headersSent) {
            res.status(500).json({ success: false, message: 'Internal server error' });
        }
    }
});

app.use(express.static(path.join(__dirname)));

app.use((req, res) => {
    res.status(404).send('Not Found');
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
