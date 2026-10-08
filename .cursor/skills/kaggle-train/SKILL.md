---
name: kaggle-train
description: >-
  Uses the local Kaggle API token to download datasets, run kernels, and train
  models on Kaggle. Use when the user asks to interact with Kaggle, train models
  on Kaggle, download or upload Kaggle datasets, push kernels, or use the kaggle CLI.
---

# Kaggle model training

Read this skill before any Kaggle command. Authenticate only through the local token file.

## Credentials

The token is stored only at `~/.kaggle/access_token` (mode `600`). The Kaggle client reads that file automatically. Do not look up, paste, or hard-code a token from chat, skills, or the repo.

- Never print, log, echo, or include the token in a command that shows its value.
- Never write the token into the repo, notebooks, `.env`, skills, commits, or chat.
- Never commit `~/.kaggle/`, `kaggle.json`, or `access_token`.
- If `~/.kaggle/access_token` is missing, stop and ask the user to save a new token there. Do not invent one.

Before the first Kaggle call in a session:

```bash
test -f ~/.kaggle/access_token && stat -f '%Lp' ~/.kaggle/access_token
```

Mode must be `600`. If it is looser, run `chmod 600 ~/.kaggle/access_token` and continue.

Leave the token in that file. Do not `export` it on its own line. When a process requires `KAGGLE_API_TOKEN`, set it in the same command without printing it:

```bash
KAGGLE_API_TOKEN="$(cat ~/.kaggle/access_token)" kaggle competitions list
```

## Workflow

1. Confirm the token file exists and is mode `600`.
2. Use the `kaggle` CLI. If it is missing, install it into the backend environment (`backend/.venv`) with `pip install kaggle`. Do not add `kaggle` to `requirements.txt` unless the user asks.
3. Check auth with `kaggle competitions list` before a longer job. If auth fails, stop and say so. Do not retry with a guessed token.
4. Put downloads in a gitignored directory such as `backend/data/kaggle/`. Add that path to `.gitignore` if it is not already ignored.
5. For RahScan lifetime or maintenance models, train with the project scripts from `backend/`: `python -m app.ml.train_lifetime_model` and `python -m app.ml.train_maintenance_model`. Use a Kaggle dataset or kernel when the user asks to train on Kaggle or the data lives there.
6. Upload weights (`*.pt`, `*.pkl`) or local datasets only when the user explicitly asks.
7. Report the dataset or kernel slug, output paths, and metrics. Omit the token.

## Commands

```bash
kaggle competitions list
kaggle competitions files -c <competition>
kaggle competitions download -c <competition> -p backend/data/kaggle/<competition>
kaggle datasets list -s <query>
kaggle datasets download -d <owner/slug> -p backend/data/kaggle/<slug>
kaggle kernels push -p <kernel-dir>
kaggle kernels status <owner/slug>
kaggle kernels output <owner/slug> -p backend/data/kaggle/<slug>
```

Kernel config belongs in `kernel-metadata.json` next to the notebook or script. That file must not contain credentials.
