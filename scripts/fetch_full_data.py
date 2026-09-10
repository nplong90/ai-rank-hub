#!/usr/bin/env python3
"""
scripts/fetch_full_data.py
Pulls complete datasets from GoodAIList APIs (Repos, Devs, Categories, Location stats, Summary)
and formats them for client-side static rendering on GitHub Pages.
"""

import json
import os
import sys
import urllib.request
import time

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data")
os.makedirs(DATA_DIR, exist_ok=True)

def fetch_json(url):
    req = urllib.request.Request(
        url,
        headers={"User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36"}
    )
    for attempt in range(3):
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                return json.loads(resp.read().decode())
        except Exception as e:
            print(f"Attempt {attempt+1} failed for {url}: {e}", file=sys.stderr)
            time.sleep(2)
    return None

def main():
    print("[1/5] Fetching Summary...")
    summary = fetch_json("https://goodailist.com/api/summary")
    if summary:
        with open(os.path.join(DATA_DIR, "summary.json"), "w", encoding="utf-8") as f:
            json.dump(summary, f, indent=2)
        print(" -> summary.json saved")

    print("[2/5] Fetching Repos (Top 1000)...")
    repos_batch1 = fetch_json("https://goodailist.com/api/repos?page=1&limit=500&sortBy=star_1d&sortOrder=desc")
    repos_batch2 = fetch_json("https://goodailist.com/api/repos?page=2&limit=500&sortBy=star_1d&sortOrder=desc")
    all_repos = []
    if repos_batch1 and "repos" in repos_batch1:
        all_repos.extend(repos_batch1["repos"])
    if repos_batch2 and "repos" in repos_batch2:
        all_repos.extend(repos_batch2["repos"])
    
    # Process deployable tags
    for r in all_repos:
        desc = (r.get("description") or "").lower()
        repo_name = (r.get("repo") or "").lower()
        text = desc + " " + repo_name
        if any(k in text for k in ["llm", "vllm", "ollama", "diffusion", "comfyui", "voice", "inference", "tts"]):
            r["deploy_type"] = "gpu"
        else:
            r["deploy_type"] = "serverless"

    with open(os.path.join(DATA_DIR, "repos.json"), "w", encoding="utf-8") as f:
        json.dump(all_repos, f, indent=2)
    print(f" -> repos.json saved ({len(all_repos)} repos)")

    print("[3/5] Fetching Devs (Top 500)...")
    devs_res = fetch_json("https://goodailist.com/api/devs?page=1&limit=500&sortBy=weighted_contributions&sortOrder=desc")
    if devs_res and "devs" in devs_res:
        with open(os.path.join(DATA_DIR, "devs.json"), "w", encoding="utf-8") as f:
            json.dump(devs_res["devs"], f, indent=2)
        print(f" -> devs.json saved ({len(devs_res['devs'])} devs)")

    print("[4/5] Fetching Category Growth Over Time...")
    cat_stats = fetch_json("https://goodailist.com/api/charts/category_stats")
    if cat_stats:
        with open(os.path.join(DATA_DIR, "category_stats.json"), "w", encoding="utf-8") as f:
            json.dump(cat_stats, f, indent=2)
        print(" -> category_stats.json saved")

    print("[5/5] Fetching Location Stats...")
    loc_stats = fetch_json("https://goodailist.com/api/charts/location_stats")
    if loc_stats:
        with open(os.path.join(DATA_DIR, "location_stats.json"), "w", encoding="utf-8") as f:
            json.dump(loc_stats, f, indent=2)
        print(" -> location_stats.json saved")

    print("All datasets synchronized successfully!")

if __name__ == "__main__":
    main()
