const router         = require('express').Router();
const auth           = require('../middleware/auth');
const User           = require('../models/User');
const TestResult     = require('../models/TestResult');
const MLTrainingData = require('../models/MLTrainingData');
const { generateTestQuestions } = require('../services/groqService');


router.get('/skills', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('skills').lean();
    res.json({ skills: (user.skills || []).map(s => s.name).sort() });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


router.get('/questions/:skill', auth, async (req, res) => {
  try {
    const skill    = decodeURIComponent(req.params.skill);
    const user     = await User.findById(req.user._id).select('skills').lean();
    const hasSkill = (user.skills || []).some(s => s.name.toLowerCase() === skill.toLowerCase());
    if (!hasSkill) {
      return res.status(403).json({ message: 'You can only take assessments for skills you have added.' });
    }
    const questions = await generateTestQuestions(skill, 20);
    res.json({ questions, skill });
  } catch (err) {
    console.error('[tests/questions]', err.message);
    res.status(500).json({ message: 'Failed to generate questions: ' + err.message });
  }
});

router.post('/submit', auth, async (req, res) => {
  try {
    const { skill, score, correct, total, timeTaken, questions } = req.body;
    if (!skill || score === undefined) return res.status(400).json({ message: 'skill and score required' });

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });


    const tr = await TestResult.create({
      userId:    user._id,
      skill,
      score:     Math.round(score),
      correct:   correct   || 0,
      total:     total     || 20,
      timeTaken: timeTaken || 0,
      questions: (questions || []).map(q => ({
        question:      q.question,
        options:       q.options || [],
        correctIndex:  typeof q.correctIndex === 'number' ? q.correctIndex : 0,
        correctAnswer: q.correctAnswer || '',
        chosenIndex:   q.chosenIndex !== undefined ? q.chosenIndex : null,
        chosenAnswer:  q.chosenAnswer || null,
        isCorrect:     q.isCorrect || false,
      })),
    });

    const skillObj = user.skills.find(s => s.name.toLowerCase() === skill.toLowerCase());
    if (skillObj) {
      // For abandoned tests the frontend sends abandoned:true; cap skill level contribution to 30%
      const effectiveScore = req.body.abandoned ? Math.min(score, 30) : score;
      const newLevel = Math.round(skillObj.level * 0.6 + effectiveScore * 0.4);
      skillObj.level = Math.min(100, Math.max(0, newLevel));
    }

   
    user.testResults.push({
      skill,
      score:   Math.round(score),
      correct: correct || 0,
      total:   total   || 20,
      date:    new Date(),
    });
    if (user.testResults.length > 200) user.testResults = user.testResults.slice(-200);

  
    if (score >= 40) {
      user.gaps = user.gaps.filter(g => g.toLowerCase() !== skill.toLowerCase());
    }

    user.lastActive = new Date();
    await user.save();

    try {
      const n      = (user.skills || []).length;
      const tests  = user.testResults || [];
      const certs  = (user.certifications || []).filter(c => c.completed);
      const expert = (user.skills || []).filter(s => s.level >= 80).length;
      const features = [
        n,
        n ? (user.skills || []).reduce((a, s) => a + (s.level || 0), 0) / n : 0,
        expert,
        (user.skills || []).filter(s => s.level >= 60 && s.level < 80).length,
        (user.skills || []).filter(s => s.level >= 40 && s.level < 60).length,
        (user.skills || []).filter(s => s.level < 40).length,
        new Set((user.skills || []).map(s => s.category).filter(Boolean)).size,
        (user.gaps || []).length,
        tests.length,
        tests.length ? tests.reduce((a, t) => a + (t.score || 0), 0) / tests.length : 0,
        user.overallScore || 0,
        certs.length,
      ];
      const labelIdx = user.overallScore >= 82 || (n >= 14 && expert >= 5) ? 3
                     : user.overallScore >= 62 || (n >= 8  && expert >= 2) ? 2
                     : user.overallScore >= 40 || n >= 3                   ? 1 : 0;
      const LABELS = ['Junior', 'Mid-Level', 'Senior', 'Lead'];
      await MLTrainingData.create({
        sampleIndex:       Date.now() + Math.floor(Math.random() * 9999),
        numSkills:         features[0],  avgSkillLevel:     Math.round(features[1] * 10) / 10,
        expertCount:       features[2],  advancedCount:     features[3],
        intermediateCount: features[4],  beginnerCount:     features[5],
        categoryCount:     features[6],  gapCount:          features[7],
        testCount:         features[8],  avgTestScore:      Math.round(features[9] * 10) / 10,
        overallScore:      features[10], certCount:         features[11],
        careerLevelIndex:  labelIdx,     careerLevel:       LABELS[labelIdx],
        source:            'real',
      });
    } catch (_) {}

    res.status(201).json({
      result:         { ...tr.toObject(), questionDetails: tr.questions || [] },
      skillLevel:     skillObj ? skillObj.level : null,
      overallScore:   user.overallScore,
      gaps:           user.gaps,
      message:        `Test submitted. Skill level updated to ${skillObj ? skillObj.level : Math.round(score)}%.`,
    });
  } catch (err) {
    console.error('[tests/submit]', err.message);
    res.status(500).json({ message: err.message });
  }
});


router.get('/history', auth, async (req, res) => {
  try {
    const raw = await TestResult.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .lean();

    const results = raw.map(r => ({
      ...r,
      questionDetails: r.questions || [],
    }));

    res.json({ results });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;