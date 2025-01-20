// server.js
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const path = require('path');
const cors = require('cors');
require('dotenv').config();

const app = express();

app.use(bodyParser.json());
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

const mongoURI = process.env.MONGODB_URI;

mongoose.connect(mongoURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('MongoDB Atlas connected successfully'))
.catch(err => console.error('MongoDB connection error:', err));

const scoreSchema = new mongoose.Schema({
  name: { type: String, required: true },
  mode: { type: String, enum: ['easy', 'medium', 'hard'], required: true },
  score: { type: Number, required: true },
  date: { type: Date, default: Date.now },
});

scoreSchema.index({ name: 1, mode: 1 }, { unique: true });

const Score = mongoose.model('Score', scoreSchema);

app.post('/submitScore', async (req, res) => {
  const { name, mode, score } = req.body;

  if (!name || !mode || score == null) {
    return res.status(400).json({ message: 'Invalid input' });
  }

  try {
    const existingScore = await Score.findOne({ name: name.trim(), mode });

    if (existingScore) {
      if (score > existingScore.score) {
        existingScore.score = score;
        existingScore.date = Date.now();
        await existingScore.save();
        return res.status(200).json({ message: 'Score updated successfully' });
      } else {
        return res.status(200).json({ message: 'Existing score is higher. No update made.' });
      }
    } else {
      const newScore = new Score({ name: name.trim(), mode, score });
      await newScore.save();
      return res.status(201).json({ message: 'Score submitted successfully' });
    }
  } catch (error) {
    if (error.code === 11000) { 
      return res.status(400).json({ message: 'Duplicate entry. Please use a different name.' });
    }
    console.error('Error submitting score:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/leaderboard', async (req, res) => {
  const { mode } = req.query;
  if (!mode || !['easy', 'medium', 'hard'].includes(mode)) {
    return res.status(400).json({ message: 'Invalid mode' });
  }
  try {
    const topScores = await Score.find({ mode })
      .sort({ score: -1, date: 1 }) 
      .limit(10)
      .select('-_id name score'); 

    res.status(200).json(topScores);
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});
