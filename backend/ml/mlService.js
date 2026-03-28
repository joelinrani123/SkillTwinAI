
'use strict';

const path = require('path');
const fs   = require('fs');

const LABELS       = ['Junior', 'Mid-Level', 'Senior', 'Lead'];
const NUM_FEATURES = 12;
const TTL          = 60 * 60 * 1000; 


let tf            = null;
let _tfModel      = null;
let _tfScaler     = null; 
let TF_READY      = false;

async function initTF() {
  try {
    tf = require('@tensorflow/tfjs-node');
    console.log('[ML] TensorFlow.js loaded:', tf.version.tfjs);
    return true;
  } catch (err) {
    console.warn('[ML] @tensorflow/tfjs-node not installed — using RF+KNN only.');
    console.warn('[ML] Run: npm install @tensorflow/tfjs-node');
    return false;
  }
}


function extractFeatures(user) {
  const skills = user.skills      || [];
  const tests  = user.testResults || [];
  const certs  = (user.certifications || []).filter(c => c.completed);
  const n      = skills.length;
  return [
    n,
    n ? skills.reduce((a, s) => a + (s.level || 0), 0) / n : 0,
    skills.filter(s => s.level >= 80).length,
    skills.filter(s => s.level >= 60 && s.level < 80).length,
    skills.filter(s => s.level >= 40 && s.level < 60).length,
    skills.filter(s => s.level < 40).length,
    new Set(skills.map(s => s.category).filter(Boolean)).size,
    (user.gaps || []).length,
    tests.length,
    tests.length ? tests.reduce((a, t) => a + (t.score || 0), 0) / tests.length : 0,
    user.overallScore || 0,
    certs.length,
  ];
}

function autoLabel(score, numSkills, expertCount) {
  if (score >= 82 || (numSkills >= 14 && expertCount >= 5)) return 3;
  if (score >= 62 || (numSkills >= 8  && expertCount >= 2)) return 2;
  if (score >= 40 || numSkills >= 3)                        return 1;
  return 0;
}

function parseDatasetCSV(csvPath) {
  const lines   = fs.readFileSync(csvPath, 'utf8').trim().split('\n');
  const headers = lines[0].split(',');
  const rows    = [];

  for (let i = 1; i < lines.length; i++) {
    const vals = lines[i].split(',');
    const row  = {};
    headers.forEach((h, j) => {
      const v = vals[j]?.trim();
      row[h]  = isNaN(v) ? v : Number(v);
    });
    rows.push(row);
  }
  return rows;
}

async function seedTrainingData(MLTrainingData) {
  try {
    const existing = await MLTrainingData.countDocuments();
    if (existing >= 1000) {
      console.log(`[ML] Training data already seeded (${existing} records)`);
      return;
    }

    const csvPath = path.join(__dirname, 'dataset.csv');
    if (!fs.existsSync(csvPath)) {
      console.warn('[ML] dataset.csv not found — skipping seed');
      return;
    }

    console.log('[ML] Seeding 1000 Kaggle-derived records into MongoDB…');
    const rows = parseDatasetCSV(csvPath);
    await MLTrainingData.deleteMany({});

    const docs = rows.map((r, i) => ({
      sampleIndex:       i,
      numSkills:         r.numSkills,
      avgSkillLevel:     r.avgSkillLevel,
      expertCount:       r.expertCount,
      advancedCount:     r.advancedCount,
      intermediateCount: r.intermediateCount,
      beginnerCount:     r.beginnerCount,
      categoryCount:     r.categoryCount,
      gapCount:          r.gapCount,
      testCount:         r.testCount,
      avgTestScore:      r.avgTestScore,
      overallScore:      r.overallScore,
      certCount:         r.certCount,
      careerLevelIndex:  r.careerLevelIndex,
      careerLevel:       r.careerLevel,
      source:            'kaggle_derived',
    }));

   
    for (let i = 0; i < docs.length; i += 250) {
      await MLTrainingData.insertMany(docs.slice(i, i + 250), { ordered: false });
    }
    console.log(`[ML] Seeded ${docs.length} records from Kaggle dataset`);
  } catch (err) {
    console.error('[ML] Seed error:', err.message);
  }
}



function computeScaler(X) {
  const n   = X.length;
  const dim = X[0].length;
  const mean = new Array(dim).fill(0);
  const std  = new Array(dim).fill(0);

  // Mean
  for (const row of X) row.forEach((v, i) => { mean[i] += v / n; });
  // Std
  for (const row of X) row.forEach((v, i) => { std[i] += (v - mean[i]) ** 2 / n; });
  std.forEach((v, i) => { std[i] = Math.sqrt(v) || 1; });

  return { mean, std };
}

function applyScaler(X, scaler) {
  return X.map(row => row.map((v, i) => (v - scaler.mean[i]) / scaler.std[i]));
}

async function trainTFModel(X_raw, y) {
  if (!tf) return null;
  try {
    const scaler  = computeScaler(X_raw);
    const X_scaled = applyScaler(X_raw, scaler);
    _tfScaler     = scaler;

    const xTensor = tf.tensor2d(X_scaled, [X_scaled.length, NUM_FEATURES]);
    const yTensor = tf.tensor1d(y, 'int32');

    const model = tf.sequential({
      layers: [
        tf.layers.dense({ inputShape: [NUM_FEATURES], units: 64, activation: 'relu',
          kernelInitializer: 'glorotUniform' }),
        tf.layers.dropout({ rate: 0.2 }),
        tf.layers.dense({ units: 32, activation: 'relu' }),
        tf.layers.dropout({ rate: 0.15 }),
        tf.layers.dense({ units: 16, activation: 'relu' }),
        tf.layers.dense({ units: 4,  activation: 'softmax' }),
      ],
    });

    model.compile({
      optimizer: tf.train.adam(0.001),
      loss:      'sparseCategoricalCrossentropy',
      metrics:   ['accuracy'],
    });

    console.log('[ML] Training TensorFlow.js model…');
    const history = await model.fit(xTensor, yTensor, {
      epochs:          80,
      batchSize:       32,
      validationSplit: 0.15,
      shuffle:         true,
      verbose:         0,
    });

    const finalAcc = history.history.val_acc?.slice(-1)[0] ||
                     history.history.acc?.slice(-1)[0] || '?';
    console.log(`[ML] TF model trained — val_accuracy: ${typeof finalAcc === 'number' ? (finalAcc * 100).toFixed(1) + '%' : finalAcc}`);

    xTensor.dispose();
    yTensor.dispose();

    _tfModel  = model;
    TF_READY  = true;
    return model;
  } catch (err) {
    console.error('[ML] TF training error:', err.message);
    TF_READY = false;
    return null;
  }
}

function tfPredict(features) {
  if (!TF_READY || !_tfModel || !_tfScaler) return null;
  try {
    const scaled  = features.map((v, i) => (v - _tfScaler.mean[i]) / _tfScaler.std[i]);
    const input   = tf.tensor2d([scaled], [1, NUM_FEATURES]);
    const probs   = _tfModel.predict(input).dataSync();
    input.dispose();

    const labelIdx  = probs.indexOf(Math.max(...probs));
    const maxProb   = probs[labelIdx];
    return { label: labelIdx, probability: maxProb, probs: Array.from(probs) };
  } catch {
    return null;
  }
}

//Random forest
class DecisionTree {
  constructor({ maxDepth = 12, minSamples = 2, maxFeatures = null } = {}) {
    this.maxDepth = maxDepth; this.minSamples = minSamples;
    this.maxFeatures = maxFeatures; this.root = null;
  }
  fit(X, y) { this.root = this._node(X, y, 0); }
  _node(X, y, d) {
    if (X.length < this.minSamples || d >= this.maxDepth) return { leaf: true, p: this._maj(y) };
    if (new Set(y).size === 1) return { leaf: true, p: y[0] };
    const { fi, th, lm } = this._split(X, y);
    if (fi === null) return { leaf: true, p: this._maj(y) };
    return {
      leaf: false, fi, th,
      l: this._node(X.filter((_, i) => lm[i]),  y.filter((_, i) => lm[i]),  d + 1),
      r: this._node(X.filter((_, i) => !lm[i]), y.filter((_, i) => !lm[i]), d + 1),
    };
  }
  _split(X, y) {
    const n = X.length, bg = this._gini(y);
    let bG = -Infinity, bFi = null, bTh = null, bLm = null;
    const nf  = X[0].length;
    const k   = this.maxFeatures ? Math.min(this.maxFeatures, nf) : nf;
    const sub = this._samp(Array.from({ length: nf }, (_, i) => i), k);
    for (const fi of sub) {
      const vals = [...new Set(X.map(r => r[fi]))].sort((a, b) => a - b);
      for (let t = 0; t < vals.length - 1; t++) {
        const th = (vals[t] + vals[t + 1]) / 2;
        const lm = X.map(r => r[fi] <= th);
        const ly = y.filter((_, i) => lm[i]), ry = y.filter((_, i) => !lm[i]);
        if (!ly.length || !ry.length) continue;
        const g = bg - (ly.length / n) * this._gini(ly) - (ry.length / n) * this._gini(ry);
        if (g > bG) { bG = g; bFi = fi; bTh = th; bLm = lm; }
      }
    }
    return { fi: bFi, th: bTh, lm: bLm };
  }
  _gini(y) {
    const n = y.length, c = {};
    for (const v of y) c[v] = (c[v] || 0) + 1;
    return 1 - Object.values(c).reduce((s, x) => s + (x / n) ** 2, 0);
  }
  _maj(y) {
    const c = {};
    for (const v of y) c[v] = (c[v] || 0) + 1;
    return Number(Object.entries(c).sort((a, b) => b[1] - a[1])[0][0]);
  }
  _samp(a, k) {
    const c = [...a], r = [];
    for (let i = 0; i < k; i++) { const x = Math.floor(Math.random() * c.length); r.push(c.splice(x, 1)[0]); }
    return r;
  }
  predict(x) { let n = this.root; while (!n.leaf) n = x[n.fi] <= n.th ? n.l : n.r; return n.p; }
}

class RandomForest {
  constructor({ nTrees = 40, maxDepth = 12, maxFeatures = 5, minSamples = 2 } = {}) {
    this.nTrees = nTrees; this.maxDepth = maxDepth;
    this.maxFeatures = maxFeatures; this.minSamples = minSamples; this.trees = [];
  }
  fit(X, y) {
    this.trees = [];
    const n = X.length;
    for (let t = 0; t < this.nTrees; t++) {
      const idx  = Array.from({ length: n }, () => Math.floor(Math.random() * n));
      const tree = new DecisionTree({ maxDepth: this.maxDepth, minSamples: this.minSamples, maxFeatures: this.maxFeatures });
      tree.fit(idx.map(i => X[i]), idx.map(i => y[i]));
      this.trees.push(tree);
    }
  }
  predict(x) {
    const v = {};
    for (const t of this.trees) { const p = t.predict(x); v[p] = (v[p] || 0) + 1; }
    const b = Object.entries(v).sort((a, b) => b[1] - a[1])[0];
    return { label: Number(b[0]), probability: b[1] / this.trees.length };
  }
}

//KNN

class KNN {
  constructor(k = 7) { this.k = k; this.X = []; this.y = []; this.mu = []; this.sd = []; }
  fit(X, y) {
    this.y = y;
    const n = X.length, f = X[0].length;
    this.mu = Array(f).fill(0);
    for (const r of X) r.forEach((v, i) => { this.mu[i] += v; });
    this.mu = this.mu.map(s => s / n);
    const vr = Array(f).fill(0);
    for (const r of X) r.forEach((v, i) => { vr[i] += (v - this.mu[i]) ** 2; });
    this.sd = vr.map(v => Math.sqrt(v / n) || 1);
    this.X  = X.map(r => this._n(r));
  }
  _n(x) { return x.map((v, i) => (v - this.mu[i]) / this.sd[i]); }
  _d(a, b) { return Math.sqrt(a.reduce((s, v, i) => s + (v - b[i]) ** 2, 0)); }
  predict(x) {
    const xn = this._n(x);
    const ds = this.X.map((r, i) => ({ d: this._d(xn, r), l: this.y[i] })).sort((a, b) => a.d - b.d);
    const v  = {};
    for (const nb of ds.slice(0, this.k)) v[nb.l] = (v[nb.l] || 0) + 1;
    const b = Object.entries(v).sort((a, b) => b[1] - a[1])[0];
    return { label: Number(b[0]), probability: b[1] / this.k };
  }
}

//model catch
let _rf = null, _knn = null, _trainedAt = null;


async function trainModels(UserModel, MLTrainingData) {
 
  const dbSamples = await MLTrainingData.find({}).lean();

  let X = [], y = [];
  for (const s of dbSamples) {
    X.push([
      s.numSkills, s.avgSkillLevel, s.expertCount, s.advancedCount,
      s.intermediateCount, s.beginnerCount, s.categoryCount, s.gapCount,
      s.testCount, s.avgTestScore, s.overallScore, s.certCount,
    ]);
    y.push(s.careerLevelIndex);
  }

  try {
    const realUsers = await UserModel.find({
      role: 'user',
      $expr: { $gte: [{ $size: '$skills' }, 1] },
    }).select('skills testResults gaps overallScore certifications').lean();

    for (const u of realUsers) {
      X.push(extractFeatures(u));
      y.push(autoLabel(
        u.overallScore || 0,
        (u.skills || []).length,
        (u.skills || []).filter(s => s.level >= 80).length,
      ));
    }
    console.log(`[ML] Training set: ${dbSamples.length} Kaggle + ${realUsers.length} real users = ${X.length} total`);
  } catch (e) {
    console.warn('[ML] Could not load real users:', e.message);
  }

  // Train RF
  _rf = new RandomForest({ nTrees: 40, maxDepth: 12, maxFeatures: 5 });
  _rf.fit(X, y);

  // Train KNN
  _knn = new KNN(7);
  _knn.fit(X, y);

  // Train TensorFlow model
  if (tf) {
    trainTFModel(X, y).then(() => {
      console.log('[ML] TF model ready');
    });
  }

  _trainedAt = Date.now();
  console.log(`[ML] RF + KNN trained at ${new Date().toISOString()} on ${X.length} samples`);
}


function applyInactivityPenalty(user) {
  const now        = new Date();
  const lastActive = user.lastActive ? new Date(user.lastActive) : now;
  const diffDays   = Math.floor((now - lastActive) / (1000 * 60 * 60 * 24));

  if (diffDays < 1) return { penalised: false, daysInactive: 0 };


  const reductionPerSkill = Math.min(diffDays * 2, 20);
  let changed = false;

  for (const skill of (user.skills || [])) {
    if (skill.level > 10) {
      const newLevel = Math.max(10, skill.level - reductionPerSkill);
      if (newLevel !== skill.level) {
        skill.level = newLevel;
        changed = true;
      }
   
      if (skill.level < 40) {
        const gaps = user.gaps || [];
        if (!gaps.includes(skill.name)) {
          gaps.push(skill.name);
          user.gaps = gaps;
        }
      }
    }
  }

  return {
    penalised:    changed,
    daysInactive: diffDays,
    penalty:      reductionPerSkill,
    message:      changed
      ? `Skill levels reduced by up to ${reductionPerSkill} pts — ${diffDays} day(s) without activity.`
      : null,
  };
}


async function predict(user, UserModel, MLTrainingData) {
  if (!_rf || !_knn || Date.now() - _trainedAt > TTL) {
    await trainModels(UserModel, MLTrainingData);
  }

  const features = extractFeatures(user);

  
  const rfResult  = _rf.predict(features);
  const knnResult = _knn.predict(features);
  const tfResult  = tfPredict(features);

 
  let weightedLabel;
  let confidence;
  if (tfResult) {
    weightedLabel = rfResult.label  * 0.30
                  + knnResult.label * 0.20
                  + tfResult.label  * 0.50;
    confidence = Math.round(
      (rfResult.probability * 0.30 + knnResult.probability * 0.20 + tfResult.probability * 0.50) * 100
    );
  } else {
    weightedLabel = rfResult.label * 0.60 + knnResult.label * 0.40;
    confidence    = Math.round(((rfResult.probability + knnResult.probability) / 2) * 100);
  }

  const labelIdx    = Math.max(0, Math.min(3, Math.round(weightedLabel)));
  const careerLevel = LABELS[labelIdx];

 
  const skills   = user.skills || [];
  const tests    = user.testResults || [];
  const certs    = (user.certifications || []).filter(c => c.completed);
  const expert   = skills.filter(s => s.level >= 80).length;
  const avgSkill = skills.length ? skills.reduce((a, s) => a + s.level, 0) / skills.length : 0;
  const avgTest  = tests.length  ? tests.reduce((a, t) => a + t.score, 0)  / tests.length  : 0;
  const certBonus   = Math.min(certs.length * 5, 20);
  const expertBonus = expert * 2;

  let readinessScore = Math.round(
    avgSkill * 0.35 + avgTest * 0.35 + (user.overallScore || 0) * 0.20 + expertBonus + certBonus
  );

 
  const inactivity = applyInactivityPenalty(user);
  if (inactivity.penalised) {
    readinessScore = Math.max(0, readinessScore - inactivity.penalty);
  }

  readinessScore = Math.min(100, Math.max(0, readinessScore));

  return {
    careerLevel,
    confidence,
    readinessScore,
    inactivity,
    topSkills:    [...skills].sort((a, b) => b.level - a.level).slice(0, 5).map(s => s.name),
    improvements: [...skills].sort((a, b) => a.level - b.level).filter(s => s.level < 60).slice(0, 4).map(s => s.name),
    scoreBreakdown: {
      skillProficiency:   Math.round(avgSkill),
      assessmentScore:    Math.round(avgTest),
      certificationBonus: certBonus,
      expertiseBonus:     expertBonus,
      inactivityPenalty:  inactivity.penalised ? inactivity.penalty : 0,
    },
    recommendations: buildRecs(user, careerLevel, inactivity),
    _internal: {
      rfLabel:  LABELS[rfResult.label],  rfProb:  rfResult.probability,
      knnLabel: LABELS[knnResult.label], knnProb: knnResult.probability,
      tfLabel:  tfResult ? LABELS[tfResult.label] : null,
      tfProb:   tfResult?.probability || null,
      tfReady:  TF_READY,
      ensemble: TF_READY ? 'TF(50%)+RF(30%)+KNN(20%)' : 'RF(60%)+KNN(40%)',
    },
  };
}

function buildRecs(user, level, inactivity) {
  const recs   = [];
  const score  = user.overallScore || 0;
  const tests  = user.testResults  || [];
  const skills = user.skills       || [];
  const certs  = (user.certifications || []).filter(c => c.completed);

  if (inactivity?.penalised) {
    recs.push(`⚠️ Your profile score is reduced — you haven't taken a test in ${inactivity.daysInactive} days. Take a test now to recover your score.`);
  }
  if (!skills.length)           recs.push('Add your skills to unlock personalised score analysis.');
  if (skills.length < 5)        recs.push('Track at least 5 skills to improve your profile score.');
  if (tests.length < 5)         recs.push('Take at least 5 assessments — each test score contributes to your overall rating.');
  if (!certs.length)            recs.push('Complete a learning path to earn your first certificate.');
  if (score < 50 && tests.length > 0) recs.push('Retake assessments after focused practice — consistent high scores raise your level.');
  if (score >= 50 && score < 70) recs.push('Push 2–3 skills above 80% proficiency to advance to the next level.');
  if (score >= 70)               recs.push('Strong profile — contribute to open-source or build a portfolio project to signal expertise.');
  if (level === 'Senior')        recs.push('Write technical articles or mentor others to demonstrate leadership readiness.');
  if (level === 'Lead')          recs.push('System design and cross-team collaboration are your strongest differentiators.');

  return recs.slice(0, 5);
}

//retrain
async function retrain(UserModel, MLTrainingData) {
  _rf = null; _knn = null; _trainedAt = null; _tfModel = null; TF_READY = false;
  await trainModels(UserModel, MLTrainingData);
  return {
    message:   'Models retrained',
    dbSamples: await MLTrainingData.countDocuments(),
    tfReady:   TF_READY,
    ensemble:  TF_READY ? 'TF(50%)+RF(30%)+KNN(20%)' : 'RF(60%)+KNN(40%)',
  };
}

function getModelInfo() {
  return {
    trainedAt:  _trainedAt ? new Date(_trainedAt).toISOString() : null,
    status:     _rf ? 'ready' : 'not trained',
    tfReady:    TF_READY,
    ensemble:   TF_READY ? 'TF(50%)+RF(30%)+KNN(20%)' : 'RF(60%)+KNN(40%)',
    trainingData: 'Kaggle-derived 1000 records + real users',
  };
}

initTF();

module.exports = {
  predict,
  retrain,
  getModelInfo,
  extractFeatures,
  seedTrainingData,
  applyInactivityPenalty,
};
