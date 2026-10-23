# Rules for every defence note

I must explain this FYP myself at an internal university defence.

- Read the actual code first. Every claim cites file + function. If you can't confirm something, write "Unverified". No guessing.
- Language: simple Roman Urdu mixed with English technical terms, short sentences, one analogy per hard idea.
- Note structure:
  1. 30-second summary
  2. Files and what each does
  3. Data flow, step by step with file/function names
  4. Key logic with real values (thresholds, formulas)
  5. Why this technology
  6. Alternatives and why not
  7. Honest limitations
  8. Likely viva questions with short answers
- Reasons you infer for "why we chose it" must be marked "(inferred)". Real reasons from me:
  - Expo/React Native = one codebase for web + mobile
  - Open-Meteo = no API key, works for all Pakistan
  - Neon + Cloudinary = free tier, no server to manage
  - Leaflet via WebView/iframe = works in Expo Go and web
  - synthetic data = no historical data exists
  - severity = rule-based as in the proposal
  - Prophet per area = time-series forecast per segment
- Append to note files, never overwrite. Keep 00_README.md updated with each note's title and one-line summary.
