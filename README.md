# Praline Cell Pro

A browser digital twin of an artisan praline packing cell. A delta robot picks pralines from the belt as they leave the cooling tunnel and places each one in one of two nests. Two SCARA robots, one on each side, take a praline from their nest, inspect it over a camera, and place it in a gift box according to the recipe. Pralines that fail inspection go to a reject bin. A full box leaves on its exit belt.

**Live:** https://sergiudanstan.github.io/praline-cell-pro/

The public page is one `index.html`. three.js r186 loads from a CDN. Open the file directly, or serve the folder.

## What is in this build

- Robots sized from published envelope data: a three-arm delta and two SCARA arms, with joint limits and inverse kinematics
- An aluminium slot-8 guard frame: polycarbonate doors, a delta bridge, a stack light and an HMI
- PBR materials, a room environment and ambient occlusion
- Belt-timing what-if: the cycle, interlocks and clearances are recomputed when the index time changes (0.70 s → 42.51 s, 1.80 s → 49.56 s, 2.80 s → 67.56 s)

## Checks

```sh
node tools/build.mjs           # concatenate src/ into index.html
node tests/run.mjs             # schedule, recipe, mutexes, IK, joint limits, clearance
node tests/run.mjs --perturb   # drops the nest interlock: mutex and clearance checks must fail
node tools/shots.mjs           # stills, console errors, frames per second
node tools/record.mjs          # cycle films (see below)
```

## Local CAD mode

On `localhost` the SCARA arms can be replaced by a local CAD model. That model is not Epson's CAD file and it is not in this repository. Epson and T3-401S are trademarks of their owners. The public page always shows the procedural robots.

See [tools/cad/README.md](tools/cad/README.md) for the local download and conversion. The public film is `praline_cell_pro.mp4` (`?cad=0`). A second film, `praline_cell_pro_cad_local.mp4`, is produced only when `_cad/t3.glb` is present on the machine that runs `tools/record.mjs`, and it is not published.

## Layout

`src/page.html` is the shell. `src/js/*.js` are concatenated in lexical order into one module by `tools/build.mjs`. `index.html` is generated. Do not edit it by hand.
