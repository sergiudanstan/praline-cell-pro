# Local Epson T3-401S CAD

Epson's CAD is not redistributed. Download it yourself from Epson and follow
Epson's applicable CAD terms. The public site uses the procedural robot.
`_cad/` is git-ignored; do not commit or publish its STEP, ZIP or GLB files.

From the project root, download and convert locally:

```sh
mkdir -p _cad/src
curl -fL -o _cad/src/epson_t3_401s_step.zip https://ftp.epson.com/far/cad_files/epson_t3_401s_step.zip
unzip -o _cad/src/epson_t3_401s_step.zip -d _cad/src
uv run --isolated --no-project --python /opt/homebrew/bin/python3.12 --with cascadio==0.1.1 --with numpy python -I tools/cad/step2glb.py _cad/src/T3_401S.STEP _cad/t3_raw.glb
cp _cad/t3_raw.glb _cad/t3.glb
node tools/build.mjs
python3 -m http.server 8777 --bind 127.0.0.1
```

The Python path above is the working macOS installation; substitute an available
Python 3.12 executable on another machine. The isolated environment avoids the
broken NumPy installation found in the system Python 3.13 environment.

Open `http://127.0.0.1:8777/index.html`. CAD loading requires `localhost` or
`127.0.0.1`, a successful HEAD request to `_cad/t3.glb`, and no `?cad=0`.
Use `http://127.0.0.1:8777/index.html?cad=0` to keep the procedural model.
Successful loading adds a **CAD (local)** badge. Missing or incompatible CAD
leaves the procedural fallback visible.

Keep the converter's uncompressed GLB: no meshopt decoder is required. Preserve
nodes `NAUO1` through `NAUO5` and their associated meshes `T3-401S_base`,
`T3-401S_arm1`, `T3-401S_arm2`, `T3-401S_shaft`, and `T3-401S_cable`.
The loader discards their authored node transforms, rotates CAD Y-up coordinates
by +90 degrees about X, and mounts each part on its corresponding animated link.
The pedestal and gripper remain procedural.

`pc.cadCheck()` returns the current maximum shaft-centre XY alignment error in
millimetres, or `null` when CAD is inactive. An error above 2 mm (including
non-finite results) logs a warning and restores the procedural robots.
The hook is also available as `window.pcHooks.cadCheck()`.

Confirm exclusion before sharing the project:

```sh
git check-ignore _cad/src/T3_401S.STEP _cad/t3.glb
```
