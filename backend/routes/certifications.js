const router        = require('express').Router();
const auth          = require('../middleware/auth');
const User          = require('../models/User');
const Certification = require('../models/Certification');
const LearningPath  = require('../models/LearningPath');
const Activity      = require('../models/Activity');
const { generateLearningPath } = require('../services/groqService');


//get 
router.get('/', auth, async (req, res) => {
  try {
    const certs = await Certification.find({ userId: req.user._id }).sort({ issuedAt: -1 }).lean();
    res.json({ certifications: certs });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


router.get('/search', auth, async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || !q.trim()) return res.json({ results: [] });

    const POPULAR = [
      'JavaScript','TypeScript','Python','Java','C++','Go','Rust','Swift',
      'React','Vue.js','Angular','Node.js','Express.js','Django','FastAPI',
      'MongoDB','PostgreSQL','MySQL','Redis','Elasticsearch',
      'Docker','Kubernetes','AWS','Google Cloud','Azure',
      'Machine Learning','Deep Learning','Data Science','NLP',
      'GraphQL','REST API','Microservices','System Design',
      'Git','CI/CD','Linux','Networking','Cybersecurity',
      'React Native','Flutter','iOS Development','Android Development',
      'HTML','CSS','Sass','Tailwind CSS','Bootstrap','jQuery',
      'Spring Boot','Laravel','Ruby on Rails','ASP.NET','Flask',
      'TensorFlow','PyTorch','Pandas','NumPy','Scikit-learn',
      'Jenkins','Terraform','Ansible','Prometheus','Grafana',
      'Figma','UI/UX Design','Agile','Scrum','Project Management',
    ];

    const query = q.trim();
    // Only return results where the skill name STARTS WITH or CONTAINS the query
    // as a word boundary — not arbitrary substring matches
    const results = POPULAR.filter(t => {
      const tl = t.toLowerCase();
      const ql = query.toLowerCase();
      // Must start with the query OR a word in the skill starts with query
      return tl.startsWith(ql) || tl.split(/[\s.\/\-]+/).some(word => word.startsWith(ql));
    }).slice(0, 8);

    res.json({ results });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


router.get('/paths', auth, async (req, res) => {
  try {
    const paths = await LearningPath.find({ userId: req.user._id }).sort({ createdAt: -1 }).lean();
    res.json({ paths });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/start-path', auth, async (req, res) => {
  try {
    const { skillName, category } = req.body;
    if (!skillName) return res.status(400).json({ message: 'skillName is required' });

 
    const existing = await LearningPath.findOne({ userId: req.user._id, skillName });
    if (existing) return res.json({ path: existing, message: 'Path already started' });

    const user = await User.findById(req.user._id);
    const hasSkill = user.skills.find(s => s.name.toLowerCase() === skillName.toLowerCase());
    if (!hasSkill) {
      user.skills.push({ name: skillName.trim(), level: 30, category: category || 'Other' });
      await user.save();
    }

    const pathData = await generateLearningPath(skillName);

    const path = await LearningPath.create({
      userId:    req.user._id,
      skillName: skillName.trim(),
      category:  category || 'Other',
      modules:   pathData.modules || [],
      progress:  0,
    });

    res.status(201).json({ path, message: `Learning path for "${skillName}" created!` });
  } catch (err) {
    console.error('[certs/start-path]', err.message);
    res.status(500).json({ message: err.message });
  }
});


router.get('/path/:skillName', auth, async (req, res) => {
  try {
    const skillName = decodeURIComponent(req.params.skillName);
    const path = await LearningPath.findOne({ userId: req.user._id, skillName }).lean();
    if (!path) return res.status(404).json({ message: 'No learning path found for this skill' });
    res.json({ path });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


router.post('/path/:skillName/task', auth, async (req, res) => {
  try {
    const skillName = decodeURIComponent(req.params.skillName);
    const { moduleId, taskId } = req.body;

    const path = await LearningPath.findOne({ userId: req.user._id, skillName });
    if (!path) return res.status(404).json({ message: 'Learning path not found' });

    const mod  = path.modules.find(m => m.id === moduleId);
    if (!mod) return res.status(404).json({ message: 'Module not found' });

    const task = mod.tasks.find(t => t.id === taskId);
    if (!task) return res.status(404).json({ message: 'Task not found' });

    task.completed   = true;
    task.completedAt = new Date();

    mod.completed = mod.tasks.every(t => t.completed);

 
    const totalTasks = path.modules.reduce((a, m) => a + m.tasks.length, 0);
    const doneTasks  = path.modules.reduce((a, m) => a + m.tasks.filter(t => t.completed).length, 0);
    path.progress = totalTasks ? Math.round((doneTasks / totalTasks) * 100) : 0;


    if (path.progress === 100 && !path.completed) {
      path.completed    = true;
      path.completedAt  = new Date();
      path.certUnlocked = true;

   
      await awardCertificate(req.user._id, skillName, path.category || 'General');
    } else {
     
      const user = await User.findById(req.user._id);
      const skill = user.skills.find(s => s.name.toLowerCase() === skillName.toLowerCase());
      if (skill) {
        skill.level = Math.min(100, skill.level + 1); 
        user.lastActive = new Date();
        await user.save();
      }
    }

    await path.save();
    res.json({ path, progress: path.progress, certUnlocked: path.certUnlocked });
  } catch (err) {
    console.error('[certs/path-task]', err.message);
    res.status(500).json({ message: err.message });
  }
});



router.post('/path/:skillName/complete-module', auth, async (req, res) => {
  try {
    const skillName = decodeURIComponent(req.params.skillName);
    const { moduleId } = req.body;
    if (!moduleId) return res.status(400).json({ message: 'moduleId is required' });

    const path = await LearningPath.findOne({ userId: req.user._id, skillName });
    if (!path) return res.status(404).json({ message: 'Learning path not found' });

    const mod = path.modules.find(m => m.id === moduleId);
    if (!mod) return res.status(404).json({ message: 'Module not found' });

   
    for (const task of mod.tasks) {
      if (!task.completed) {
        task.completed   = true;
        task.completedAt = new Date();
      }
    }
    mod.completed = true;

 
    const totalTasks = path.modules.reduce((a, m) => a + m.tasks.length, 0);
    const doneTasks  = path.modules.reduce((a, m) => a + m.tasks.filter(t => t.completed).length, 0);
    path.progress = totalTasks ? Math.round((doneTasks / totalTasks) * 100) : 0;

 
    if (path.progress === 100 && !path.completed) {
      path.completed    = true;
      path.completedAt  = new Date();
      path.certUnlocked = true;
      await awardCertificate(req.user._id, skillName, path.category || 'General');
    } else {
      
      const user  = await User.findById(req.user._id);
      const skill = user.skills.find(s => s.name.toLowerCase() === skillName.toLowerCase());
      if (skill) {
        skill.level = Math.min(100, skill.level + 5);
        user.lastActive = new Date();
        await user.save();
      }
    }

    await path.save();
    res.json({ path, progress: path.progress, certUnlocked: !!path.certUnlocked });
  } catch (err) {
    console.error('[certs/complete-module]', err.message);
    res.status(500).json({ message: err.message });
  }
});


async function awardCertificate(userId, skillName, category) {
  const existing = await Certification.findOne({ userId, skillName });
  if (existing) return existing;

  const user = await User.findById(userId).select('skills name certifications').lean();

  // Score shown on certificate reflects learning path completion (always 100% path = merit/distinction baseline)
  // Test scores do NOT automatically grant certificates — only completing the full learning path does.
  const earnedScore = 80; // Learning path completion baseline score

  const cert = await Certification.create({
    userId, skillName,
    name:        `${skillName} Certification`,
    category:    category || 'General',
    scoreBoost:  4,
    earnedScore,
    learningCompleted: true,
  });

  await User.findByIdAndUpdate(userId, {
    $push: {
      certifications: {
        certId:      cert._id.toString(),
        name:        cert.name,
        category:    cert.category,
        scoreBoost:  cert.scoreBoost,
        progress:    100,
        completed:   true,
        completedAt: new Date(),
        enrolledAt:  new Date(),
      },
    },
    lastActive: new Date(),
  });

  // Boost skill level to at least 80% upon certificate completion
  const userDoc = await User.findById(userId);
  if (userDoc) {
    const skill = userDoc.skills.find(s => s.name.toLowerCase() === skillName.toLowerCase());
    if (skill) {
      skill.level = Math.max(skill.level, 80);
    } else {
      userDoc.skills.push({ name: skillName.trim(), level: 80, category: category || 'Other' });
    }
    await userDoc.save();
  }

  await Activity.create({
    userId,
    user: user.name || 'User',
    action: `Earned "${cert.name}" certificate by completing learning path`,
    type: 'cert_complete',
  });

  return cert;
}


router.post('/claim', auth, async (req, res) => {
  try {
    const { skillName } = req.body;
    if (!skillName?.trim()) {
      return res.status(400).json({ message: 'skillName is required' });
    }

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

  
    const skill = user.skills.find(
      s => s.name.toLowerCase() === skillName.trim().toLowerCase()
    );
    if (!skill) {
      return res.status(403).json({ message: 'You must have this skill to claim a certificate for it' });
    }

 
    const THRESHOLD = 70;
    const relevantTests = (user.testResults || []).filter(
      t => t.skill.toLowerCase() === skillName.trim().toLowerCase() && t.score >= THRESHOLD
    );
    if (!relevantTests.length) {
      return res.status(403).json({
        message: `You need a test score of at least ${THRESHOLD}% in ${skillName} to claim this certificate`,
      });
    }

    const existing = await Certification.findOne({ userId: user._id, skillName: skillName.trim() });
    if (existing) {
      return res.status(409).json({ message: 'Certificate already claimed', certification: existing });
    }

    const bestScore = Math.max(...relevantTests.map(t => t.score));
    const scoreBoost = Math.max(3, Math.round(bestScore / 20));

    const cert = await Certification.create({
      userId:    user._id,
      skillName: skillName.trim(),
      name:      `${skillName.trim()} Certification`,
      category:  skill.category || 'General',
      scoreBoost,
      earnedScore: bestScore,
      learningCompleted: false,
    });

    const alreadyInProfile = user.certifications.find(
      c => c.name.toLowerCase() === cert.name.toLowerCase()
    );
    if (!alreadyInProfile) {
      user.certifications.push({
        certId:      cert._id.toString(),
        name:        cert.name,
        category:    cert.category,
        scoreBoost:  cert.scoreBoost,
        progress:    100,
        completed:   true,
        completedAt: new Date(),
        enrolledAt:  new Date(),
      });
      user.lastActive = new Date();
      await user.save();
    }

    await Activity.create({
      userId: user._id,
      user:   user.name,
      action: `${user.name} claimed "${cert.name}" certificate`,
      type:   'cert_claim',
    });

    res.status(201).json({
      certification: cert,
      message: `${cert.name} certificate claimed successfully!`,
      scoreBoost,
    });
  } catch (err) {
    console.error('[certs/claim]', err.message);
    res.status(500).json({ message: err.message });
  }
});


router.get('/eligible', auth, async (req, res) => {
  try {
    const paths = await LearningPath.find({ userId: req.user._id, certUnlocked: true }).lean();
    const earned = await Certification.find({ userId: req.user._id }).select('skillName').lean();
    const earnedNames = new Set(earned.map(c => c.skillName.toLowerCase()));

    const eligible = paths
      .filter(p => !earnedNames.has(p.skillName.toLowerCase()))
      .map(p => ({ skill: p.skillName, category: p.category, progress: p.progress }));

    res.json({ eligible, threshold: 100 });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
