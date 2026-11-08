# Converts Epson's official T3 STEP into a GLB for the local-only CAD mode (output stays in _cad/, which is git-ignored).
# Usage: uv run --python 3.13 --with cascadio==0.1.1 python tools/cad/step2glb.py _cad/src/T3_401S.STEP _cad/t3_raw.glb
import sys
import cascadio

src, dst = sys.argv[1], sys.argv[2]
n = cascadio.step_to_glb(src, dst, tol_linear=0.1, tol_angular=0.35, tol_relative=False,
                         merge_primitives=True, use_parallel=True, include_materials=True)
print("step_to_glb:", src, "->", dst, "result", n)
