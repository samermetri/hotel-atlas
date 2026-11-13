#!/bin/zsh
atlas_folder="$(cd -- "$(dirname -- "$0")" && pwd)"
python3 "$atlas_folder/serve.py"
if [ $? -ne 0 ]; then
  read -r "atlas_answer?Press Return to close this window."
fi
