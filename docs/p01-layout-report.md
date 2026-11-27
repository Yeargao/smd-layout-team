# P01 — Smart initial layout, iteration 1

Scope: `src/layout.js`, P01 fixtures, tests and this report only. Existing interface `layoutLevel(ids, edges, sizes) -> {positions,w,h}` unchanged; top-left local coordinates, original IDs, positive dimensions. No changes to P02/P03 modules or package configuration.

## Algorithm
- DFS forward/reverse and greedy feedback-edge exclusion for ranking; original edge directions never change.
- Long edges temporarily expanded into dummy vertices for adjacent-layer ordering; they are not returned or inserted into the model.
- Alternating Barycenter/Median sweeps, adjacent transpose, top/center/staggered coordinate placement. Up to 109 candidates including the baseline (37 with reduced sweep count); duplicate geometry scores cached.
- Candidate selection: node hits and collinear overlap pairs cannot exceed baseline. Among eligible candidates, minimize proper straight-line crossings, node hits, overlap pairs, edge length, then bounding area. Baseline is always eligible. The decision is conservative and not globally optimal.
- Metrics are per-level, straight center-to-center segments. Shared endpoints, endpoint-only contacts and collinear overlaps are not proper crossings; collinear overlaps are reported separately, except duplicate/reverse edges with identical unordered endpoint pairs. Self-loops are excluded. Rectangle intersections are conservative for circular nodes. Actual routed polyline crossings and cross-region edges must be measured separately with P02.

## Reproduce
`npm test`

`node tests/layout-benchmark.mjs`

Node v22.16.0, isolated copy of starter overlay. 24/24 test groups passed (21 P01 + 3 existing); 20 additional seeded random graphs checked inside one test. Original baseline and reimplemented baseline exactly matched on all 35 fixtures checked. 15 benchmark cases: 6884 -> 6337 proper crossings (7.946% reduction); no fixture increased node hits or overlap pairs. The dense 40-node/369-edge graph barely improved (4062 -> 4060), so more work is needed. Timings vary by machine; dense case about 356 ms in one run; no large-graph latency guarantee. Pairwise geometry checks are quadratic in edge count and node hits add O(VE) work per distinct candidate. No browser or full P02 routed-geometry test performed. No actual team Git or groupctl TEST/PUB performed in the isolated environment.

## Review and coordination
P02: agree on measuring actual routed polyline crossings, shared endpoints, parallel/reverse transitions, and cross-region routes. Current P01 scores are proxies, not final rendered counts. P03: verify that new layout still fits the viewport and reload never triggers initialLayout. No public API changes requested.

## References
- https://ogdf.github.io/doc/ogdf/classogdf_1_1_sugiyama_layout.html — “The crossMin module performs two-layer crossing minimization”.
- https://tikz.dev/gd-layered — “median and greedy switch heuristics”.
- https://cs.brown.edu/people/rtamassi/gdhandbook/chapters/ogdf.pdf — “different starting permutations”.
