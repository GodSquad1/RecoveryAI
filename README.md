# RecoveryAI

RecoveryAI is a project we built for LaunchHacks 2025 to help track and measure a patient’s recovery in speech or language skills following a stroke. It takes a textual input from a patient, and then gives a breakdown of grammar and vocabulary richness.
On top of that, RecoveryAI keeps a history of all the patient’s past entries and shows them graphs so they can see how they’re improving over time.

**How It Works**

- Role-Based Login System
  - Users sign up or log in as a Patient, Doctor, or Nurse, each with a customized dashboard and permissions. User data is stored locally in the browser.
- Daily Language Entry & Analysis
  - Patients enter daily sentences. The app calculates vocabulary richness, average sentence length, and a basic grammar score, helping track recovery over time.
- Visual Progress Tracking
  - All metrics are plotted using Chart.js, allowing patients and clinicians to see trends, plateaus, and improvements through interactive graphs.
- Session Management for Clinicians
  - Patients can request sessions. Doctors can approve and assign themselves to sessions. Nurses monitor activity and assist with scheduling.
- AI & NLP Enhancements (Coming Soon)
  - Planned features include GPT-generated summaries, cosine similarity scoring with Word2Vec, and deeper NLP insights to guide therapy.

**Why we built this**

People recovering from strokes or other injuries often have trouble with language, and we wanted to make a tool that helps them track their recovery. Instead of only checking grammar, we compare to a reference sentence so patients don’t get judged unfairly if they use simpler words.

**Tech stack**

- HTML
- Tailwind CSS
- Vanilla JS
- Local Storage (via a JSON)
- Word2vec
- Chart.js
- OpenAI API
**Features**
  
✅ Sentence analysis (vocab, grammar, overall quality)
✅ Progress tracking with graphs
✅ Cosine similarity to reference vectors
✅ Ability to book sessions with a Doctor/manage sessions

**Future ideas**

- Make it interactive for different languages
- Make the graphs more interactive
- Build a nicer UI
- Use google maps API to locate medical clinics near the patient
- Improve the nurse dashboard
