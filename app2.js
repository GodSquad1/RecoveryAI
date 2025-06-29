(() => {
  const STORAGE_KEY = 'aphasia_recovery_data';

  const patientText = document.getElementById('patientText');
  const submitBtn = document.getElementById('submitBtn');
  const clearBtn = document.getElementById('clearBtn');
  const vocabRichnessDiv = document.getElementById('vocabRichness');
  const avgSentenceLengthDiv = document.getElementById('avgSentenceLength');
  const grammarFlagDiv = document.getElementById('grammarFlag');
  const metricsSection = document.getElementById('metrics-section');
  const chartsSection = document.getElementById('charts-section');
  const flagsSection = document.getElementById('flags-section');
  const alertsDiv = document.getElementById('alerts');
  const pupilSelect = document.getElementById('pupilSelect');
  const pupilAlert = document.getElementById('pupilAlert');
  const assessmentSection = document.getElementById('assessment-section');
  const assessmentLog = document.getElementById('assessmentLog');
  const gptSummaryDiv = document.getElementById('gptSummary');

  let data = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  let vocabChart, sentenceChart, grammarChart;
  ;

  if (data.length && data[data.length - 1].pupilStatus) {
    pupilSelect.value = data[data.length - 1].pupilStatus;
    pupilAlert.style.display = pupilSelect.value === 'dilated' ? 'block' : 'none';
  }

  pupilSelect.addEventListener('change', () => {
    pupilAlert.style.display = pupilSelect.value === 'dilated' ? 'block' : 'none';
    if (data.length > 0) {
      data[data.length - 1].pupilStatus = pupilSelect.value;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }
  });

  clearBtn.addEventListener('click', () => {
    if (confirm('Clear all data?')) {
      data = [];
      localStorage.removeItem(STORAGE_KEY);
      updateUI();
      alertsDiv.textContent = 'All data cleared.';
      alertsDiv.style.color = '#1976d2';
      pupilSelect.value = 'normal';
      pupilAlert.style.display = 'none';
    }
  });

  function calcVocabRichness(text, maxEstimatedG = 0.14) {
    const words = text.toLowerCase().match(/\b\w+\b/g) || [];
    const unique = new Set(words);
    const G_raw = words.length ? unique.size / words.length : 0;
  
    console.log('words:', words.length, 'unique:', unique.size, 'G_raw:', G_raw);
  
    const log10 = (x) => Math.log10(x);
    const numerator = Math.pow(log10(G_raw + 1), 2);
    const denominator = Math.pow(log10(maxEstimatedG + 1), 2);
  
    const scaled = denominator !== 0 ? numerator / denominator : 0;
    console.log('scaled:', scaled);
  
    return Math.min(Math.max(scaled, 0), 1);
  }
  
  

  function calcAvgSentenceLength(text) {
    const sentences = text.split(/[.!?]+/).map(s => s.trim()).filter(Boolean);
    const wordCount = sentences.reduce((sum, s) => sum + (s.match(/\b\w+\b/g) || []).length, 0);
    return sentences.length ? wordCount / sentences.length : 0;
  }

  function calcGrammarRichness(text) {
    const sentences = text.split(/[.!?]+/).map(s => s.trim()).filter(Boolean);
    const total = sentences.length;
    if (!total) return 0;

    let complete = 0;
    for (const s of sentences) {
      const words = s.match(/\b\w+\b/g) || [];
      if (words.length >= 3 && /^[A-Z]/.test(s) && /[.?!]$/.test(s + '.')) {
        complete++;
      }
    }

    const rawScore = complete / Math.sqrt(total);
    const normalized = Math.min(1, rawScore / 1.5);
    return +(normalized * 100).toFixed(1); // Percent
  }

  async function analyzeWithGPT(text) {
    const prompt = `Analyze this stroke recovery patient's language response. Return JSON with:
- vocab_richness (0-1)
- avg_sentence_length
- grammar (numeric score out of 100)

Text:
"""${text}"""`;

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer API-KEY`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0,
      })
    });

    const json = await res.json();
    const content = json.choices[0].message.content;
    try {
      return JSON.parse(content);
    } catch (e) {
      console.warn('Invalid GPT response:', content);
      throw new Error('Invalid JSON from GPT');
    }
  }

  async function generateGptAssessment(entries) {
    const prompt = `You are a stroke recovery specialist. Assess the patient's language progress over 5 sessions (Don't talk about each session, just summarize overall progress very briefly):

${entries.map((e, i) => `
Session ${i + 1}:
- Vocab: ${(e.vocab * 100).toFixed(1)}%
- Avg Sentence Length: ${e.avgSentLen.toFixed(1)}
- Grammar: ${e.grammar}%
- Pupil: ${e.pupilStatus}
- Sample: "${e.text.slice(0, 80)}..."`).join('\n')}

Write a short summary of the patient's progress like a real doctor would.`;

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer API-KEY`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.5,
        max_tokens: 250
      })
    });

    const json = await res.json();
    return json.choices[0].message.content.trim();
  }

  async function addEntry(text) {
    submitBtn.disabled = true;
    submitBtn.textContent = 'Analyzing...';

    let metrics;
    try {
      metrics = await analyzeWithGPT(text);
    } catch {
      metrics = null;
    }

    const maxEstimatedG = data.length
      ? Math.max(0.1, ...data.map(d => d.vocab))
      : 0.14;

    if (
      !metrics ||
      typeof metrics.vocab_richness !== 'number' ||
      metrics.vocab_richness < 0 || metrics.vocab_richness > 1
    ) {
      metrics = {
        vocab_richness: calcVocabRichness(text, maxEstimatedG),
        avg_sentence_length: calcAvgSentenceLength(text),
        grammar: calcGrammarRichness(text)
      };
    }

    metrics.vocab_richness = Math.min(Math.max(metrics.vocab_richness, 0), 1);

    const entry = {
      date: new Date().toISOString().split('T')[0],
      text,
      vocab: metrics.vocab_richness,
      avgSentLen: metrics.avg_sentence_length,
      grammar: metrics.grammar,
      pupilStatus: pupilSelect.value
    };

    data.push(entry);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));

    if (data.length % 5 === 0) {
      const summary = await generateGptAssessment(data.slice(-5));
      gptSummaryDiv.textContent = summary;
    }

    updateUI();
    submitBtn.disabled = false;
    submitBtn.textContent = 'Submit Response';
    patientText.value = '';
  }

  function detectPlateauDecline() {
    if (data.length < 4) return null;
    const last4 = data.slice(-4);
    if (last4.every((d, i, arr) => i === 0 || d.vocab <= arr[i - 1].vocab)) {
      return '⚠️ Vocabulary plateau or decline detected.';
    }
    return null;
  }

  function updateUI() {
    if (!data.length) {
      metricsSection.style.display = 'none';
      chartsSection.style.display = 'none';
      flagsSection.style.display = 'none';
      assessmentSection.style.display = 'none';
      gptSummaryDiv.textContent = '';
      return;
    }

    metricsSection.style.display = 'block';
    chartsSection.style.display = 'block';
    flagsSection.style.display = 'block';
    assessmentSection.style.display = 'block';

    const latest = data[data.length - 1];
    vocabRichnessDiv.textContent = (latest.vocab * 100).toFixed(1) + '%';
    avgSentenceLengthDiv.textContent = latest.avgSentLen.toFixed(1);
    grammarFlagDiv.textContent = latest.grammar + '%';

    vocabRichnessDiv.style.color = latest.vocab > 0.5 ? '#4ade80' : '#f87171';
    grammarFlagDiv.style.color = latest.grammar > 75 ? '#4ade80' : '#f87171';

    const labels = data.map(d => d.date);
    const vocabData = data.map(d => +(d.vocab * 100).toFixed(2));
    const sentData = data.map(d => +(d.avgSentLen).toFixed(2));
    const grammarData = data.map(d => +d.grammar); // Already in %
    

    if (!vocabChart) {
      vocabChart = new Chart(document.getElementById('vocabChart').getContext('2d'), {
        type: 'line',
        data: {
          labels,
          datasets: [{
            label: 'Vocab Richness (%)',
            data: vocabData,
            borderColor: '#2dd4bf',
            fill: true,
            tension: 0.4
          }]
        }
      });
    } else {
      vocabChart.data.labels = labels;
      vocabChart.data.datasets[0].data = vocabData;
      vocabChart.update();
    }

    if (!sentenceChart) {
      sentenceChart = new Chart(document.getElementById('sentenceChart').getContext('2d'), {
        type: 'line',
        data: {
          labels,
          datasets: [{
            label: 'Avg Sentence Length',
            data: sentData,
            borderColor: '#4ade80',
            fill: true,
            tension: 0.4
          }]
        }
      });
    } else {
      sentenceChart.data.labels = labels;
      sentenceChart.data.datasets[0].data = sentData;
      sentenceChart.update();
    }

    if (!grammarChart) {
      grammarChart = new Chart(document.getElementById('grammarChart').getContext('2d'), {
        type: 'line',
        data: {
          labels,
          datasets: [{
            label: 'Grammar Score (%)',
            data: grammarData,
            borderColor: '#818cf8',
            fill: true,
            tension: 0.4
          }]
        }
      });
    } else {
      grammarChart.data.labels = labels;
      grammarChart.data.datasets[0].data = grammarData;
      grammarChart.update();
    }
    

    const alertMsg = detectPlateauDecline();
    alertsDiv.textContent = alertMsg || '✅ Progress looks stable';
    alertsDiv.style.color = alertMsg ? '#f87171' : '#4ade80';

    assessmentLog.textContent = data.map(d =>
      `${d.date} • Vocab: ${(d.vocab * 100).toFixed(1)}%, SentLen: ${d.avgSentLen.toFixed(1)}, Grammar: ${d.grammar}%`
    ).join('\n');
  }

  submitBtn.addEventListener('click', () => {
    const text = patientText.value.trim();
    if (text.length < 5) return alert('Please enter a longer response.');
    addEntry(text);
  });

  updateUI();
})();
