import os

Import("env")

# .env is located inside the firmware directory
env_path = os.path.join(env.get("PROJECT_DIR"), ".env")

if os.path.exists(env_path):
    print(f"--- Loading environment variables from {env_path} ---")
    with open(env_path) as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            if "=" in line:
                key, val = line.split("=", 1)
                key = key.strip()
                val = val.strip().strip('"').strip("'")

                # Check if it's a number, otherwise stringify it for the C++ preprocessor
                if val.isdigit():
                    env.Append(CPPDEFINES=[(key, int(val))])
                else:
                    env.Append(CPPDEFINES=[(key, env.StringifyMacro(val))])
else:
    print(f"--- WARNING: .env not found in {env_path}! ---")
