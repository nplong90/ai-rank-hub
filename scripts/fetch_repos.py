#!/usr/bin/env python3
"""
scripts/fetch_repos.py
Crawl top trending AI repos using GitHub API (or seed from GoodAIList / GitHub Search),
calculate star metrics, tag deployment categories, and output static JSON.
"""

import json
import os
import sys
import urllib.request
import datetime

OUTPUT_DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data")
os.makedirs(OUTPUT_DATA_DIR, exist_ok=True)

def fetch_seed_from_goodailist():
    url = "https://goodailist.com/api/repos?page=1&limit=250&sortBy=star_1d&sortOrder=desc"
    req = urllib.request.Request(
        url,
        headers={"User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36"}
    )
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            data = json.loads(resp.read().decode())
            return data.get("repos", [])
    except Exception as e:
        print(f"Warn: fetch goodailist failed: {e}", file=sys.stderr)
        return []

def enrich_and_tag_repos(raw_repos):
    processed = []
    total_stars = 0
    categories = {}

    for r in raw_repos:
        repo_name = r.get("repo", "")
        stars = r.get("stars", 0)
        forks = r.get("forks", 0)
        star_1d = r.get("star_1d", 0)
        star_7d = r.get("star_7d", 0)
        cat = r.get("category") or "AI Tools"
        subcat = r.get("subcat") or "General"
        desc = r.get("description") or ""

        # Auto-detect deploy target for ref mapping
        deployable = False
        deploy_type = "docker"
        lower_desc = (desc + " " + repo_name).lower()
        if any(k in lower_desc for k in ["llm", "vllm", "ollama", "inference", "voice", "diffusion", "comfyui"]):
            deployable = True
            deploy_type = "gpu"
        elif any(k in lower_desc for k in ["bot", "agent", "scraper", "api", "webui", "rag"]):
            deployable = True
            deploy_type = "serverless"

        star_1d_pct = r.get("star_1d_pct")
        star_7d_pct = r.get("star_7d_pct")
        star_1d_pct = round(star_1d_pct, 2) if star_1d_pct is not None else 0.0
        star_7d_pct = round(star_7d_pct, 2) if star_7d_pct is not None else 0.0

        item = {
            "id": repo_name.replace("/", "__"),
            "repo": repo_name,
            "url": f"https://github.com/{repo_name}",
            "description": desc,
            "stars": stars,
            "forks": forks,
            "star_1d": star_1d or 0,
            "star_1d_pct": star_1d_pct,
            "star_7d": star_7d or 0,
            "star_7d_pct": star_7d_pct,
            "category": cat,
            "subcat": subcat,
            "language": r.get("language") or "Python",
            "contributors": r.get("contributors") or 0,
            "top_devs": r.get("top_devs") or "",
            "deployable": deployable,
            "deploy_type": deploy_type,
            "updated_at": r.get("updated_at") or datetime.date.today().isoformat()
        }
        processed.append(item)
        total_stars += stars
        categories[cat] = categories.get(cat, 0) + 1

    summary = {
        "total_repos": len(processed),
        "total_stars": total_stars,
        "categories_count": len(categories),
        "categories": categories,
        "updated_at": datetime.datetime.now(datetime.timezone.utc).isoformat()
    }
    return processed, summary

def main():
    print("Fetching trending repositories...")
    repos = fetch_seed_from_goodailist()
    if not repos:
        print("No repos fetched, exiting.")
        sys.exit(1)

    processed, summary = enrich_and_tag_repos(repos)

    repos_path = os.path.join(OUTPUT_DATA_DIR, "repos.json")
    summary_path = os.path.join(OUTPUT_DATA_DIR, "summary.json")

    with open(repos_path, "w", encoding="utf-8") as f:
        json.dump(processed, f, indent=2)

    with open(summary_path, "w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2)

    print(f"Done! Saved {len(processed)} repos to {repos_path}")
    print(f"Summary saved to {summary_path}")

if __name__ == "__main__":
    main()
