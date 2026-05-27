"""
i2.py -- run via GitHub Actions
"""

import ast
import json
import os
import sys
import time
from concurrent.futures import ProcessPoolExecutor, as_completed
from datetime import datetime, timezone
from pathlib import Path
import gzip
import re

# Config 

FILES_DIR = Path("files")          # directory to index
OUTPUT    = Path("index.json")     # output consumed by index.html
MAX_WORKERS = min(8, (os.cpu_count() or 4))  # parallel workers

def strip_c_comments(text: str) -> str:
    # Remove // comments
    text = re.sub(r'//.*', '', text)
    # Remove /* */ comments
    text = re.sub(r'/\*.*?\*/', '', text, flags=re.DOTALL)
    return text


def parse_c_file(raw: str, filepath: str) -> dict:
    """Extract metadata from C source"""
    path = Path(filepath)
    meta = {
        "path":      filepath,
        "name":      path.name,
        "folder":    path.parent.name if path.parent.name != "files" else "",
        "rel":       str(path),
        "lines":     raw.count("\n") + 1,
        "size":      len(raw.encode("utf-8")),
        "imports":   [],
        "from_imports": [],
        "functions": [],
        "classes":   [],
        "docstring": "",
        "summary":   "",
    }

    # Summary: first comment line (// or /*)
    for line in raw.splitlines():
        stripped = line.strip()
        if stripped.startswith("//"):
            meta["summary"] = stripped[2:].strip()
            break
        if stripped.startswith("/*"):
            # Take text after /* up to */ if on same line
            inner = stripped[2:]
            end = inner.find("*/")
            if end != -1:
                inner = inner[:end]
            meta["summary"] = inner.strip()
            break

    # Strip comments for regex scan
    clean = strip_c_comments(raw)

    # #include lines → imports
    meta["imports"] = re.findall(r'#include\s*[<"]([^>"]+)[>"]', clean)

    # Function definitions: return_type name(params) {
    func_pattern = re.compile(
        r'^\s*(?:[\w\s\*]+?)\s+(\w+)\s*\(([^)]*)\)\s*\{',
        re.MULTILINE
    )
    for m in func_pattern.finditer(clean):
        name = m.group(1)
        params = m.group(2).strip()
        meta["functions"].append({
            "name": name,
            "args": [params] if params else [],
            "doc": ""
        })

    return meta

#  AST Parser
def parse_file(filepath: str) -> dict | None:
    """
    Parse .py file. Returns metadata dict.
    """
    path = Path(filepath)
    try:
        raw = path.read_text(encoding="utf-8", errors="replace")
    except OSError:
        return None

    if path.suffix == '.py':
        meta = {
            "path":      filepath,
            "name":      path.name,
            "folder":    path.parent.name if path.parent.name != "files" else "",
            "rel":       str(path),          # relative path for GitHub raw URL
            "lines":     raw.count("\n") + 1,
            "size":      len(raw.encode("utf-8")),
            "imports":   [],
            "from_imports": [],
            "functions": [],
            "classes":   [],
            "docstring":  "",
            "summary":   "",
        }

        # (summary) first non-empty comment or hashbang line
        for line in raw.splitlines():
            stripped = line.strip()
            if stripped.startswith("#") and not stripped.startswith("#!"):
                meta["summary"] = stripped.lstrip("#").strip()
                break

        try:
            tree = ast.parse(raw, filename=filepath)
        except SyntaxError:
            meta["summary"] = meta["summary"] or "[syntax error]"
            return meta

        for node in ast.walk(tree):
            # Top-level imports
            if isinstance(node, ast.Import):
                for alias in node.names:
                    name = alias.name.split(".")[0]
                    if name not in meta["imports"]:
                        meta["imports"].append(name)

            elif isinstance(node, ast.ImportFrom):
                if node.module:
                    name = node.module.split(".")[0]
                    if name not in meta["from_imports"]:
                        meta["from_imports"].append(name)

            # Functions
            elif isinstance(node, ast.FunctionDef) and isinstance(node.col_offset, int) and node.col_offset == 0:
                fn = {"name": node.name, "args": [], "doc": ""}
                fn["args"] = [a.arg for a in node.args.args]
                fn["doc"]  = ast.get_docstring(node) or ""
                meta["functions"].append(fn)

            # Classes
            elif isinstance(node, ast.ClassDef) and node.col_offset == 0:
                cls = {"name": node.name, "methods": [], "doc": ""}
                cls["doc"] = ast.get_docstring(node) or ""
                cls["methods"] = [
                    n.name for n in ast.walk(node)
                    if isinstance(n, ast.FunctionDef) and not n.name.startswith("_")
                ]
                meta["classes"].append(cls)

        # Module docstring
        meta["docstring"] = ast.get_docstring(tree) or ""
        if not meta["summary"] and meta["docstring"]:
            # First sentence of docstring
            meta["summary"] = meta["docstring"].split(".")[0].strip()

        return meta

    elif path.suffix in ('.c', '.h'):
        return parse_c_file(raw, filepath)

    return None


#  Directory Walker 

SKIP_DIRS = {"__pycache__", ".git", ".venv", "venv", "node_modules", ".mypy_cache"}

def collect_source_files(root: Path) -> list[str]:
    """file collection for .py, .c, .h"""
    results = []
    stack = [str(root)]
    while stack:
        current = stack.pop()
        try:
            with os.scandir(current) as it:
                for entry in it:
                    if entry.name.startswith(".") or entry.name in SKIP_DIRS:
                        continue
                    if entry.is_dir(follow_symlinks=False):
                        stack.append(entry.path)
                    elif entry.is_file() and entry.name.endswith(('.py', '.c', '.h')):
                        results.append(entry.path)
        except PermissionError:
            continue
    return results

#  Folder Metadata 

def build_folder_meta(files: list[dict]) -> list[dict]:
    folders: dict[str, dict] = {}
    for f in files:
        folder = f["folder"] or "_root"
        if folder not in folders:
            folders[folder] = {
                "name":       folder if folder != "_root" else "",
                "file_count": 0,
                "total_lines": 0,
                "files":      [],
            }
        folders[folder]["file_count"]  += 1
        folders[folder]["total_lines"] += f["lines"]
        folders[folder]["files"].append(f["name"])

    return sorted(folders.values(), key=lambda x: x["name"])


#  Main 

def main():
    t0 = time.perf_counter()

    if not FILES_DIR.exists():
        print(f"[error] '{FILES_DIR}' directory not found. Create it and add Python files.")
        sys.exit(1)

    print(f"[index] Scanning {FILES_DIR} ...")
    source_files = collect_source_files(FILES_DIR)
    print(f"[index] Found {len(source_files)} Python files — parsing with {MAX_WORKERS} workers ...")

    parsed: list[dict] = []
    failed = 0

    with ProcessPoolExecutor(max_workers=MAX_WORKERS) as pool:
        futures = {pool.submit(parse_file, fp): fp for fp in source_files}
        for future in as_completed(futures):
            result = future.result()
            if result:
                parsed.append(result)
            else:
                failed += 1

    for entry in parsed:
        entry["rel"] = str(Path(entry["path"]).relative_to(FILES_DIR))

    # Sort by folder then filename
    parsed.sort(key=lambda f: (f["folder"], f["name"]))

    index = {
        "generated":   datetime.now(timezone.utc).isoformat(),
        "total_files": len(parsed),
        "total_failed": failed,
        "folders":     build_folder_meta(parsed),
        "files":       parsed,
    }

    json_bytes = json.dumps(index, separators=(",", ":"), ensure_ascii=False).encode('utf-8')
    gz_path = OUTPUT.with_suffix('.json.gz')
    with gzip.open(gz_path, 'wb', compresslevel=9) as f:
        f.write(json_bytes)

    elapsed = time.perf_counter() - t0
    raw_kb = len(json_bytes) / 1024
    gz_kb = gz_path.stat().st_size / 1024
    print(f"[index] Done in {elapsed:.2f}s — {len(parsed)} files indexed")
    print(f"        raw {raw_kb:.1f} KB  →  gzip {gz_kb:.1f} KB  ({gz_path})")


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Index source files")
    parser.add_argument("--source", default="files", help="Directory to scan")
    parser.add_argument("--output", default="index.json", help="Output gzipped JSON file")
    args = parser.parse_args()

    FILES_DIR = Path(args.source)
    OUTPUT    = Path(args.output)
    main()