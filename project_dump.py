import os

# Updated to include Next.js/React source files
extensions = ['.py', '.json', '.md', '.txt', '.csv', '.ts', '.tsx', '.js', '.jsx', '.css', '.sql']
ignore_dirs = {'.git', '__pycache__', 'venv', 'env', '.idea', '.vscode', '.next', 'node_modules', 'dist', 'build'}

output_file = 'project_full_context.txt'

print(f"Scanning for files with extensions: {extensions}")
with open(output_file, 'w', encoding='utf-8') as outfile:
    for root, dirs, files in os.walk("."):
        # Filter directories to ignore
        dirs[:] = [d for d in dirs if d not in ignore_dirs]

        for file in files:
            if any(file.endswith(ext) for ext in extensions):
                path = os.path.join(root, file)
                # Skip package-lock.json (too huge/unnecessary)
                if 'package-lock.json' in file:
                    continue

                outfile.write(f"\n\n{'='*20}\nFILE: {path}\n{'='*20}\n\n")
                try:
                    with open(path, 'r', encoding='utf-8') as infile:
                        outfile.write(infile.read())
                except Exception as e:
                    outfile.write(f"[Error reading file: {e}]")

print(f"Done! Upload '{output_file}' to the chat.")
