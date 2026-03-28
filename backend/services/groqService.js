'use strict';


function parseJSON(raw) {
  
  let clean = raw
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();


  try { return JSON.parse(clean); } catch (_) {}

  
  clean = clean.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, '');


  try { return JSON.parse(clean); } catch (_) {}


  const firstBrace   = clean.indexOf('{');
  const firstBracket = clean.indexOf('[');
  let start = -1, end = -1, isArray = false;

  if (firstBrace === -1 && firstBracket === -1) throw new Error('No JSON object or array found in response');

  if (firstBrace === -1) { isArray = true; start = firstBracket; }
  else if (firstBracket === -1) { start = firstBrace; }
  else if (firstBracket < firstBrace) { isArray = true; start = firstBracket; }
  else { start = firstBrace; }

  
  const open  = isArray ? '[' : '{';
  const close = isArray ? ']' : '}';
  let depth = 0, inStr = false, escape = false;
  for (let i = start; i < clean.length; i++) {
    const ch = clean[i];
    if (escape)          { escape = false; continue; }
    if (ch === '\\')     { escape = true;  continue; }
    if (ch === '"')      { inStr = !inStr; continue; }
    if (inStr)           { continue; }
    if (ch === open)     { depth++; }
    if (ch === close)    { depth--; if (depth === 0) { end = i; break; } }
  }

  if (end === -1) {
  
    clean = clean.slice(start) + (isArray ? ']' : '}');
    try { return JSON.parse(clean); } catch (_) {}
    throw new Error('Malformed JSON: could not find closing bracket');
  }

  const extracted = clean.slice(start, end + 1);
  try { return JSON.parse(extracted); } catch (_) {}


  try {
    const sanitised = sanitiseJSONStrings(extracted);
    return JSON.parse(sanitised);
  } catch (e) {
    throw new Error(`JSON parse failed after all recovery attempts: ${e.message}`);
  }
}


function sanitiseJSONStrings(raw) {
  let out = '';
  let inStr = false, escape = false;
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    if (escape) {

      const valid = ['"','\\','/','b','f','n','r','t','u'];
      out += valid.includes(ch) ? '\\' + ch : ch;
      escape = false;
      continue;
    }
    if (ch === '\\' && inStr) { escape = true; continue; }
    if (ch === '"') { inStr = !inStr; out += ch; continue; }
    if (inStr) {
     
      if (ch === '\n') { out += '\\n'; continue; }
      if (ch === '\r') { out += '\\r'; continue; }
      if (ch === '\t') { out += '\\t'; continue; }
      if (ch.charCodeAt(0) < 32) { continue; } 
      out += ch;
      continue;
    }
    out += ch;
  }
  return out;
}

async function callGroq(messages, { temperature = 0.7, maxTokens = 1000 } = {}) {
  const key = process.env.GROQ_API_KEY;
  if (!key || key === 'your_groq_api_key_here') {
    throw new Error('GROQ_API_KEY not set. Get a free key at https://console.groq.com');
  }
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
    body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages, temperature, max_tokens: maxTokens }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(`Groq API error ${response.status}: ${err?.error?.message || response.statusText}`);
  }
  const data = await response.json();
  return data.choices?.[0]?.message?.content?.trim() || '';
}


async function generateTestQuestions(skill, count = 20) {
  const seeds = [
    'Focus on real-world debugging scenarios.',
    'Include questions about common pitfalls and edge cases.',
    'Focus on performance optimisation and best practices.',
    'Include questions about integration patterns and architecture.',
    'Focus on security considerations and common vulnerabilities.',
    'Include tricky syntax and behaviour questions.',
    'Focus on testing strategies and test-driven development.',
    'Include questions about tooling, configuration, and ecosystem.',
  ];
  const seed = seeds[Math.floor(Math.random() * seeds.length)];

  const messages = [
    {
      role: 'system',
      content: 'You are an expert technical interviewer. Return ONLY valid JSON, no markdown, no explanation, no code fences. Generate a DIFFERENT set of questions each time you are called.',
    },
    {
      role: 'user',
      content: `Generate exactly ${count} UNIQUE multiple-choice questions to test practical knowledge of "${skill}".
Variation theme: ${seed}

Return ONLY a JSON array. Use simple ASCII strings only — no special characters, no curly quotes, no em-dashes:
[
  {
    "question": "Question text here?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctIndex": 0
  }
]

Rules:
- correctIndex is 0-based (0, 1, 2, or 3)
- options are plain strings — no A. B. prefixes
- Mix difficulty: 5 easy, 8 medium, 7 hard
- All scenario-based and practical
- Return ONLY the JSON array, nothing else`,
    },
  ];

  const raw  = await callGroq(messages, { temperature: 0.92, maxTokens: 5000 });
  const data = parseJSON(raw);

  return data.map(q => {
    const idx = typeof q.correctIndex === 'number' ? q.correctIndex
              : typeof q.answer      === 'number' ? q.answer : 0;
    return {
      question:      q.question,
      options:       q.options,
      correctIndex:  idx,
      correctAnswer: q.options[idx],
    };
  });
}

async function generateLearningPath(skillName) {
 
  const structureMessages = [
    {
      role: 'system',
      content: 'You are a technical educator. Return ONLY valid JSON with no markdown fences. Use plain ASCII — no curly quotes, no special punctuation.',
    },
    {
      role: 'user',
      content: `Create a structured learning path for "${skillName}" with exactly 8 modules.

Return ONLY this JSON structure:
{
  "modules": [
    {
      "id": "m1",
      "title": "Module title",
      "estimatedMins": 20,
      "content": "Two to three sentence summary of what this module covers and why it matters.",
      "keyPoints": [
        "Detailed takeaway sentence explaining the first core concept learned in this module — at least 15 words.",
        "Detailed takeaway sentence explaining the second core concept — at least 15 words.",
        "Detailed takeaway sentence explaining the third core concept — at least 15 words.",
        "Detailed takeaway sentence explaining a best practice or common pitfall — at least 15 words.",
        "Detailed takeaway sentence summarising how this knowledge applies in real projects — at least 15 words."
      ]
    }
  ]
}

The 8 modules must cover:
1. Introduction and fundamentals of ${skillName}
2. Core concepts and syntax
3. Working with data and configuration
4. Functions, methods, and common patterns
5. Advanced features and techniques
6. Performance and best practices
7. Testing, debugging, and error handling
8. Real-world projects and integration

CRITICAL: Every keyPoint string MUST be a full, meaningful sentence of at least 15 words explaining a specific concept, insight, or practice — never a short label or heading.

Return ONLY valid JSON. No markdown. No extra text.`,
    },
  ];

  const structureRaw    = await callGroq(structureMessages, { temperature: 0.4, maxTokens: 3000 });
  const structureParsed = parseJSON(structureRaw);
  const modules         = (structureParsed.modules || []).slice(0, 8);

 
  const modulesWithContent = await Promise.all(
    modules.map(async (mod, i) => {
      const contentMessages = [
        {
          role: 'system',
          content: 'You are a senior technical educator. Write rich, detailed educational content in plain text only. No JSON, no markdown fences. Write at least 700 words.',
        },
        {
          role: 'user',
          content: `Write the full reading content for Module ${i + 1} of 8 in a ${skillName} learning path.

Module title: "${mod.title}"

Structure your content with these clearly labelled sections (end each heading with a colon):

Introduction:
Write 2-3 paragraphs on why this topic matters and what the learner will understand by the end.

Core Concepts:
Write 4-5 bullet points, each 2-3 sentences explaining a key idea. Start each with - 

How It Works:
Write 2-3 paragraphs explaining the mechanics in detail, with a plain-text conceptual example.

Common Patterns and Examples:
Write 3-4 bullet points showing real use cases or patterns. Start each with - 

Common Mistakes to Avoid:
Write 3-4 bullet points describing mistakes and consequences. Start each with - 

Best Practices:
Write 3-4 bullet points with specific, actionable advice. Start each with - 

Summary:
Write 1-2 paragraphs summarising key ideas and connecting to the next module.

Write at least 700 words. Use plain paragraphs and bullets starting with - . No code blocks.`,
        },
      ];

      let readingContent = `${mod.title}\n\nThis module covers important concepts in ${skillName}. ${mod.content || ''}`;
      try {
        readingContent = await callGroq(contentMessages, { temperature: 0.5, maxTokens: 2500 });
      } catch (_) { /* use fallback if individual module fails */ }

      return {
        id:             mod.id || `m${i + 1}`,
        title:          mod.title || `Module ${i + 1}`,
        content:        mod.content || '',
        readingContent,
        keyPoints:      Array.isArray(mod.keyPoints) ? mod.keyPoints : [],
        estimatedMins:  mod.estimatedMins || 15,
        tasks: [{
          id:          `m${i + 1}t1`,
          title:       'Read and complete this module',
          description: 'Read the content carefully and understand the key concepts before marking complete.',
          type:        'read',
          completed:   false,
        }],
        completed: false,
      };
    })
  );

  return { modules: modulesWithContent };
}

//General Chatbot
async function chat(messages, context) {
  const user      = context?.user || {};
  const skillList = (user.skills || []).map(s => s.name).join(', ') || 'not yet added';
  const systemContent = `You are SkillTwinAI, a helpful AI career assistant for software developers.
Help with tech questions, career advice, interview prep, skill improvement, and coding concepts.
Be concise, practical, and warm. Plain text only — no markdown formatting.

${user.name ? `User: ${user.name}.` : ''}
${skillList !== 'not yet added' ? `Their skills: ${skillList}.` : ''}
${user.overallScore ? `Score: ${user.overallScore}%.` : ''}`;

  const groqMessages = [
    { role: 'system', content: systemContent },
    ...messages.map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content })),
  ];
  return callGroq(groqMessages, { temperature: 0.7, maxTokens: 700 });
}

// AI career coach
async function coach(question, user) {
  const skillSummary = (user?.skills || []).map(s => `${s.name} (${s.level}%, ${s.category})`).join(', ') || 'none yet';
  const certSummary  = (user?.certifications || []).filter(c => c.completed).map(c => c.name).join(', ') || 'none completed';
  const messages = [
    {
      role: 'system',
      content: `You are a personalised AI Career Coach inside SkillTwinAI. Give specific, actionable advice.

USER PROFILE:
- Name: ${user?.name || 'User'}
- Skills: ${skillSummary}
- Overall Score: ${user?.overallScore || 0}%
- Skill Gaps: ${(user?.gaps || []).join(', ') || 'none'}
- Certifications: ${certSummary}
- Tests Taken: ${(user?.testResults || []).length}

Give specific, personalised advice. Be direct and warm. Under 300 words unless they ask for more.`,
    },
    { role: 'user', content: question },
  ];
  return callGroq(messages, { temperature: 0.75, maxTokens: 600 });
}
//Learning recommendation
async function generateRecommendations(user) {
  const skillSummary = (user.skills || []).sort((a, b) => b.level - a.level).map(s => `${s.name}:${s.level}%(${s.category})`).join(', ') || 'No skills added';
  const recentTests  = (user.testResults || []).sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5).map(t => `${t.skill}:${t.score}%`).join(', ') || 'No tests taken';
  const certsDone    = (user.certifications || []).filter(c => c.completed).map(c => c.name).join(', ') || 'none';

  const messages = [
    { role: 'system', content: 'You are a career coach AI. Return ONLY valid JSON, no markdown, no code fences. Use plain ASCII strings only.' },
    {
      role: 'user',
      content: `Analyse this developer profile and give personalised learning recommendations.

PROFILE:
- Skills: ${skillSummary}
- Gaps: ${(user.gaps || []).join(', ') || 'none'}
- Recent Tests: ${recentTests}
- Certifications Done: ${certsDone}
- Overall Score: ${user.overallScore || 0}%

Return ONLY valid JSON:
{
  "careerSummary": "2-3 sentence summary",
  "skillsToLearn": [
    { "name": "Skill", "reason": "why", "priority": "high", "estimatedWeeks": 2 }
  ],
  "roadmap": [
    { "title": "Step", "description": "action", "duration": "2 weeks", "outcome": "result" }
  ],
  "nextCerts": [
    { "name": "Cert", "reason": "why", "difficulty": "intermediate" }
  ],
  "resources": [
    { "title": "Resource", "type": "course", "platform": "Platform", "free": true, "url": "", "why": "reason" }
  ],
  "weeklyPlan": [
    { "day": "Monday", "task": "task", "duration": "30 mins" }
  ]
}`,
    },
  ];

  const raw = await callGroq(messages, { temperature: 0.7, maxTokens: 2000 });
  return parseJSON(raw);
}

//Profile analysis
async function analyzeProfile(user) {
  const skillsSorted = [...(user.skills || [])].sort((a, b) => b.level - a.level);
  const top  = skillsSorted.slice(0, 5).map(s => s.name);
  const weak = skillsSorted.filter(s => s.level < 60).map(s => s.name);

  const messages = [
    { role: 'system', content: 'You are a developer profile analyser. Return ONLY valid JSON, no markdown, no code fences. Use plain ASCII only.' },
    {
      role: 'user',
      content: `Analyse this developer profile.

Skills: ${skillsSorted.map(s => `${s.name}:${s.level}%`).join(', ')}
Gaps: ${(user.gaps || []).join(', ')}
Overall Score: ${user.overallScore || 0}%
Tests Taken: ${(user.testResults || []).length}
Certs Completed: ${(user.certifications || []).filter(c => c.completed).length}

Return ONLY valid JSON:
{
  "careerLevel": "Junior",
  "readinessScore": 45,
  "topSkills": ["skill1", "skill2"],
  "improvements": ["skill1"],
  "recommendations": ["rec1", "rec2"]
}`,
    },
  ];

  const raw  = await callGroq(messages, { temperature: 0.3, maxTokens: 500 });
  const data = parseJSON(raw);
  data.topSkills    = data.topSkills    || top;
  data.improvements = data.improvements || weak;
  return data;
}

module.exports = { generateTestQuestions, generateLearningPath, chat, coach, generateRecommendations, analyzeProfile };
