import argparse
import os
import shlex
import subprocess
import sys
import time
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parent
ENV_FILE = REPO_ROOT / ".env"
COMPOSE_FILE = REPO_ROOT / "docker-compose.yml"


def load_env(path: Path) -> dict:
    env = os.environ.copy()
    if not path.exists():
        return env

    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        env[key.strip()] = value.strip().strip().strip("\"").strip("'")
    return env


def run(cmd, *, cwd=None, env=None, check=True):
    print(f"\n$ {cmd}")
    return subprocess.run(cmd, cwd=str(cwd or REPO_ROOT), shell=True, env=env, check=check)


def compose_base_cmd():
    # docker compose (v2) is standard, fallback to docker-compose
    if shutil.which("docker-compose"):
        return "docker-compose -f docker-compose.yml"
    return "docker compose -f docker-compose.yml"


def start_services():
    compose = compose_base_cmd()
    run(f"{compose} up -d", cwd=REPO_ROOT)
    print("PostgreSQL service started.")


def stop_services():
    compose = compose_base_cmd()
    run(f"{compose} down", cwd=REPO_ROOT)
    print("Services stopped.")


def run_crawl(env):
    run("npm install", cwd=REPO_ROOT, env=env)
    run("npm run clean:mirror", cwd=REPO_ROOT, env=env)
    run("npm run crawl", cwd=REPO_ROOT, env=env)
    run("npm run export:static", cwd=REPO_ROOT, env=env)


def run_deploy(env):
    run("npx vercel --yes", cwd=REPO_ROOT, env=env)
    run("npx vercel --prod", cwd=REPO_ROOT, env=env)


def main():
    parser = argparse.ArgumentParser(description="Lab runner for cloning demo site and hosting files.")
    parser.add_argument(
        "action",
        nargs="?",
        default="all",
        choices=["all", "start", "crawl", "stop", "deploy", "full"],
        help="Workflow action."
    )
    parser.add_argument("--skip-install", action="store_true", help="Skip npm install.")
    parser.add_argument("--skip-db-init", action="store_true", help="Skip postgres schema init.")
    parser.add_argument("--skip-crawl", action="store_true", help="Skip crawling step.")
    parser.add_argument("--skip-export", action="store_true", help="Skip export step.")
    parser.add_argument("--with-deploy", action="store_true", help="Run deploy after processing.")
    parser.add_argument("--source", type=str, help="Override SOURCE_URL for this run.")
    parser.add_argument("--pages", type=int, help="Override MAX_PAGES for this run.")
    parser.add_argument("--assets", type=int, help="Override MAX_ASSETS for this run.")
    parser.add_argument("--wait", type=int, default=4, help="Seconds to wait after starting services.")
    args = parser.parse_args()

    env = load_env(ENV_FILE)
    if args.source:
        env["SOURCE_URL"] = args.source
    if args.pages is not None:
        env["MAX_PAGES"] = str(args.pages)
    if args.assets is not None:
        env["MAX_ASSETS"] = str(args.assets)

    if args.action in {"all", "start", "full"}:
        start_services()
        if args.wait:
            time.sleep(args.wait)

    if args.action in {"all", "full"} and not args.skip_db_init:
        run("npm run db:init", cwd=REPO_ROOT, env=env)

    if args.action in {"all", "crawl", "full"}:
        if args.skip_crawl and args.skip_export:
            print("Nothing to do in crawl flow (both --skip-crawl and --skip-export).")
        else:
            if not args.skip_crawl:
                if args.skip_install:
                    run("npm run clean:mirror", cwd=REPO_ROOT, env=env)
                    run("npm run crawl", cwd=REPO_ROOT, env=env)
                else:
                    run("npm install", cwd=REPO_ROOT, env=env)
                    run("npm run clean:mirror", cwd=REPO_ROOT, env=env)
                    run("npm run crawl", cwd=REPO_ROOT, env=env)
            if not args.skip_export:
                if args.skip_install:
                    run("npm run export:static", cwd=REPO_ROOT, env=env)
                else:
                    run("npm run export:static", cwd=REPO_ROOT, env=env)

    if args.action in {"all", "full"} and args.with_deploy:
        run_deploy(env)

    if args.action == "deploy":
        run_deploy(env)
    elif args.action == "stop":
        stop_services()


if __name__ == "__main__":
    import shutil

    if not REPO_ROOT.exists():
        raise SystemExit("Repo root not found.")
    main()

