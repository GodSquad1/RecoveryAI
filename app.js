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
  let vocabChart, sentenceChart;
 
 
  // Show saved pupil state if exists
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
 
 
  function calcVocabRichness(text, maxEstimatedG =  0.14) {
    const words = text.toLowerCase().match(/\b\w+\b/g) || [];
    const unique = new Set(words);
    const G_raw = words.length ? unique.size / words.length : 0;
    const base = 10;
  
    // Apply log-scaling
    const numerator = Math.log(G_raw + 1) **2;
    const denominator = Math.log(maxEstimatedG + 1);
    return denominator !== 0 ? numerator / denominator : 0;
  }
 
 
  function calcAvgSentenceLength(text) {
    const sentences = text.split(/[.!?]+/).map(s => s.trim()).filter(Boolean);
    const wordCount = sentences.reduce((sum, s) => sum + (s.match(/\b\w+\b/g) || []).length, 0);
    return sentences.length ? wordCount / sentences.length : 0;
  }
 
 
  function grammarCheck(text) {
    const sentences = text.split(/[.!?]+/).map(s => s.trim()).filter(Boolean);
    if (!sentences.length) return 'No sentences detected';
    if (sentences.some(s => s.length < 3)) return 'Incomplete sentences';
    return 'OK';
  }
 
 
  async function analyzeWithGPT(text) {
    const prompt = `Analyze this patient text for aphasia recovery:
 Return JSON with:
 - vocab_richness (0-1)
 - avg_sentence_length
 - grammar ("OK", "Minor issues", "Severe issues")
 
 
 Ensure that you will be very strict with the vocab richness and grammar checks, as this is a medical assessment.
 
 
 Text: """${text}"""`;
 
 
    const API_URL = 'https://api.openai.com/v1/chat/completions';
    const API_KEY = ''; // Replace with actual key
 
 
    const body = {
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0,
      max_tokens: 150
    };
 
 
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer `
        },
        body: JSON.stringify(body)
      });
      const json = await res.json();
      const content = json.choices?.[0]?.message?.content;
      const metrics = JSON.parse(content);
      return {
        vocab: metrics.vocab_richness,
        avgSentLen: metrics.avg_sentence_length,
        grammar: metrics.grammar
      };
    } catch (e) {
      console.warn('GPT failed, falling back:', e);
      return null;
    }
  }
 
 
  async function generateGptAssessment(entries) {
    const prompt = `You are a speech-language pathologist evaluating a patient recovering from aphasia. Based on the following session data, write a clinical progress assessment (4 to 6 sentences) discussing:
- Vocabulary richness (variety, range)
- Sentence construction (average sentence length)
- Grammar integrity (fluency, completeness)
- Any concern about pupil dilation
- Any signs of improvement, plateau, or decline
Use clinical language appropriate for a medical progress note.

Patient session data:
${entries.map((e, i) => `
Session ${i + 1}:
- Vocab Richness: ${(e.vocab * 100).toFixed(1)}%
- Avg Sentence Length: ${e.avgSentLen.toFixed(1)}
- Grammar: ${e.grammar}
- Pupil: ${e.pupilStatus}
- Sample: "${e.text.slice(0, 100)}..."`).join('\n')}
`;
    const API_URL = 'https://api.openai.com/v1/chat/completions';
    const API_KEY = '' 
 
    const body = {
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.5,
      max_tokens: 200
    };
 
 
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer `
        },
        body: JSON.stringify(body)
      });
      const json = await res.json();
      return json.choices?.[0]?.message?.content.trim() || null;
    } catch (e) {
      console.error('Assessment GPT error:', e);
      return null;
    }
  }
 
 
  async function addEntry(text) {
  
    submitBtn.disabled = true;
    submitBtn.textContent = 'Analyzing...';
 
 
    let metrics = await analyzeWithGPT(text);

    if (!metrics) {
      // Dynamically estimate the max G from existing data, fallback to 1
      const maxEstimatedG = data.length
        ? Math.max(...data.map(d => d.vocab))
        : 1;
    
      metrics = {
        vocab: calcVocabRichness(text, maxEstimatedG),
        avgSentLen: calcAvgSentenceLength(text),
        grammar: grammarCheck(text)
      };
    }
    
 
    const entry = {
      date: new Date().toISOString().split('T')[0],
      text,
      vocab: metrics.vocab,
      avgSentLen: metrics.avgSentLen,
      grammar: metrics.grammar,
      pupilStatus: pupilSelect.value
    };
 
 
    data.push(entry);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
 
 
    // Generate summary every 5 entries
    if (data.length % 5 === 0) {
      const recent = data.slice(-5);
      const summary = await generateGptAssessment(recent);
      if (summary) gptSummaryDiv.textContent = `GPT Summary:\n${summary}`;
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
      return '⚠️ Vocabulary richness plateau or decline detected.';
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
    grammarFlagDiv.textContent = latest.grammar;
    grammarFlagDiv.style.color = latest.grammar === 'OK' ? '#388e3c' : '#d32f2f';
 
 
    const labels = data.map(d => d.date);
    const vocabData = data.map(d => +(d.vocab * 100).toFixed(2));
    const sentData = data.map(d => +(d.avgSentLen).toFixed(2));
 
 
    if (!vocabChart) {
      vocabChart = new Chart(document.getElementById('vocabChart').getContext('2d'), {
        type: 'line',
        data: {
          labels,
          datasets: [{
            label: 'Vocabulary Richness (%)',
            data: vocabData,
            borderColor: '#1976d2',
            backgroundColor: 'rgba(25, 118, 210, 0.2)',
            tension: 0.3,
            fill: true,
            pointRadius: 4,
          }]
        },
        options: { scales: { y: { min: 0, max: 100 } } }
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
            borderColor: '#388e3c',
            backgroundColor: 'rgba(56, 142, 60, 0.2)',
            tension: 0.3,
            fill: true,
            pointRadius: 4,
          }]
        },
        options: { scales: { y: { min: 0 } } }
      });
    } else {
      sentenceChart.data.labels = labels;
      sentenceChart.data.datasets[0].data = sentData;
      sentenceChart.update();
    }
 
 
    const alertMsg = detectPlateauDecline();
    alertsDiv.textContent = alertMsg || 'No alerts. Progress looks good.';
    alertsDiv.style.color = alertMsg ? '#d32f2f' : '#388e3c';
 
 
    assessmentLog.textContent = data.map(d =>
      `${d.date}: ${d.grammar}, ${(d.vocab * 100).toFixed(1)}%, ${d.avgSentLen.toFixed(1)} words`
    ).join('\n');
  }
 
 
  submitBtn.addEventListener('click', () => {
    const text = patientText.value.trim();
    if (text.length < 5) return alert('Please enter a longer response.');
    addEntry(text);
  });
 
 
  updateUI();
 })();
 
