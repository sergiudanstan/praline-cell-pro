# Praline packing cell

Browser digital twin of a packing cell for an artisan chocolatier. A delta robot picks pralines from the belt leaving the cooling tunnel and drops each one into one of two nests. Two Epson T3-401S SCARA robots, one on each side of the belt, take a praline from their nest, check it over a camera, and place it in their gift box following the box recipe. Pralines that fail inspection go to the reject bin. A full box leaves on its exit belt.

**Live:** https://sergiudanstan.github.io/praline-cell/

- Three praline types (dark dome, milk praliné square, ruby heart) and a 2 × 4 box recipe: 3 dark, 3 milk, 2 ruby
- Delta inverse kinematics (3 arms, parallelogram lower links) and T3 SCARA kinematics with joint limits, for two mirrored T3s
- Scheduled program: the delta serves whichever nest frees first, with one mutex per nest
- Clearance checked over the whole cycle for delta ↔ T3-A, delta ↔ T3-B and T3-A ↔ T3-B
- Program mode (4-lane timeline, step list with SPEL+ style commands, timing, joints, report, CSV) and manual jog mode

Single `index.html`, three.js loaded from a CDN. Open it directly or serve the folder.

## Checks

```
node tests/run.mjs             # schedule, recipe, mutexes, IK, joint limits, clearance
node tests/run.mjs --perturb   # removes the nest interlock: the mutex and clearance checks must fail
```
