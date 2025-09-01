// app.js - Main server file
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/smartbins';
mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log('Connected to MongoDB');
}).catch(err => {
    console.error('MongoDB connection error:', err);
});

// Smart Bin Schema
const binSchema = new mongoose.Schema({
    name: { type: String, required: true },
    location: { type: String, required: true },
    capacity: { type: Number, required: true },
    type: { type: String, required: true, enum: ['general', 'recyclable', 'organic', 'hazardous'] },
    fillLevel: { type: Number, default: 0, min: 0, max: 100 },
    status: { type: String, default: 'active', enum: ['active', 'full', 'maintenance'] },
    createdAt: { type: Date, default: Date.now },
    lastUpdated: { type: Date, default: Date.now }
});

const Bin = mongoose.model('Bin', binSchema);

// GET all bins
app.get('/api/bins', async (req, res) => {
    try {
        const bins = await Bin.find();
        res.json(bins);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET single bin
app.get('/api/bins/:id', async (req, res) => {
    try {
        const bin = await Bin.findById(req.params.id);
        if (!bin) {
            return res.status(404).json({ error: 'Bin not found' });
        }
        res.json(bin);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// CREATE new bin
app.post('/api/bins', async (req, res) => {
    try {
        const { name, location, capacity, type, fillLevel } = req.body;
        
        const status = fillLevel >= 90 ? 'full' : fillLevel >= 80 ? 'maintenance' : 'active';
        
        const newBin = new Bin({
            name,
            location,
            capacity,
            type,
            fillLevel: fillLevel || 0,
            status
        });
        
        const savedBin = await newBin.save();
        res.status(201).json(savedBin);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// UPDATE bin
app.put('/api/bins/:id', async (req, res) => {
    try {
        const { name, location, capacity, type, fillLevel, status } = req.body;
        
        const updatedBin = await Bin.findByIdAndUpdate(
            req.params.id,
            {
                name,
                location,
                capacity,
                type,
                fillLevel,
                status,
                lastUpdated: new Date()
            },
            { new: true }
        );
        
        if (!updatedBin) {
            return res.status(404).json({ error: 'Bin not found' });
        }
        
        res.json(updatedBin);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// DELETE bin
app.delete('/api/bins/:id', async (req, res) => {
    try {
        const deletedBin = await Bin.findByIdAndDelete(req.params.id);
        if (!deletedBin) {
            return res.status(404).json({ error: 'Bin not found' });
        }
        res.json({ message: 'Bin deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Dashboard stats
app.get('/api/stats', async (req, res) => {
    try {
        const totalBins = await Bin.countDocuments();
        const activeBins = await Bin.countDocuments({ status: 'active' });
        const fullBins = await Bin.countDocuments({ status: 'full' });
        
        const bins = await Bin.find();
        const avgFillLevel = bins.length > 0 
            ? bins.reduce((sum, bin) => sum + bin.fillLevel, 0) / bins.length 
            : 0;
        
        res.json({
            totalBins,
            activeBins,
            fullBins,
            avgFillLevel: Math.round(avgFillLevel)
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Serve frontend
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
app.listen(PORT, () => {
    console.log(`Smart Bins Management System running on port ${PORT}`);
    console.log(`Visit: http://localhost:${PORT}`);
});