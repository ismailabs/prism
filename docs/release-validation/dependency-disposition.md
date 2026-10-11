# Dependency advisory disposition

11 October 2026, Asia/Kuala_Lumpur. This is a technical disposition, not an owner risk waiver. No paid service or major framework upgrade was used.

The accepted baseline `7bb1f35813328d95c355fa890a1e1f7f5173fc22` had seven affected development packages (five high, two moderate), arising from two root advisories. A reviewed exact `postcss-selector-parser: 7.1.6` npm override removes the selector-parser and postcss-nested findings. Only that package's version, registry URL and integrity change in the lockfile. Direct dependencies, Tailwind 3.4.19, runtime packages and all migration files are preserved. Fresh `npm audit --json` reports **five high, zero moderate**, while `npm audit --omit=dev --json` reports **zero** findings.

| Baseline affected package and chain | Risk and current disposition |
|---|---|
| braces 3.0.3 via Tailwind's micromatch/chokidar | High, recursive pattern stack exhaustion. No patched release is published. Unresolved; production acceptance requires explicit owner disposition or tested upstream fix. |
| chokidar 3.6.0 via Tailwind | High inherited braces risk in the development watcher. Unresolved; no production watcher is deployed. |
| micromatch 4.0.8 via Tailwind/fast-glob | High inherited braces risk in glob parsing. Unresolved; the content glob is controlled repository configuration. |
| fast-glob via Tailwind | High inherited micromatch/braces risk in content discovery. Unresolved; does not process customer-supplied glob patterns in PRISM. |
| tailwindcss 3.4.19 (direct dev dependency) | High through the above dependencies. npm proposes Tailwind 4.3.3; this changes the CSS/build integration and requires a separately assessed major migration. No force upgrade was performed. |
| postcss-selector-parser 6.1.4 via Tailwind/postcss-nested | Moderate, flat-selector CPU exhaustion. Remediated by the exact 7.1.6 override. |
| postcss-nested 6.2.0 via Tailwind | Moderate inherited parser risk. Remediated by the same override; postcss-nested remains 6.2.0. |

The override crosses the parser's major-version range, so compatibility was checked rather than assumed. The [upstream changelog](https://github.com/postcss/postcss-selector-parser/blob/main/CHANGELOG.md) identifies insertion-during-iteration safety as the 7.0 change and linear flat-selector parsing as the 7.1.6 fix. A clean installation resolves both consumers to 7.1.6. Before/after fixture production builds yield exactly the same 62,515-byte CSS, SHA-256 `1ef2e9e81f749d0b2a0228f3e3b17a4ce5df1e4d772bdf6adde81e106c889b0f`. Full browser, responsive, package and PWA gates validate the matching output. This establishes compatibility for PRISM's current source/configuration; future Tailwind/plugin changes must retest the override or remove it when a compatible upstream dependency is available.

The residual braces risk applies when untrusted, deeply nested patterns reach a build or watcher. PRISM uses the reviewed fixed `./index.html` and `./src/**/*.{ts,tsx}` content patterns, no customer-defined build patterns/CSS, and a static Vite deployment without this Node build chain in the shipped browser. Trusted source/configuration and a CI time limit constrain the current path; they do not patch the library or waive its advisory. Do not build unreviewed contributions with secrets, treat source/configuration review as mandatory, and terminate a hung disposable build. Recheck [the braces advisory](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) before any later release; it currently lists no patched version. The remaining five findings are **not seven independent vulnerabilities** and are not presented as deployed-runtime findings.

No risky Tailwind migration is necessary to resolve the two moderate findings. A future change removing the remaining chain should validate the entire CSS output, dark mode, arbitrary utilities, animations, responsive/AT behavior, bundle packaging and worker update before acceptance. An owner may assess a documented temporary deferral based on the actual build threat model; this mission does not approve it.

Bounded synthetic braces probes did not reproduce a stack failure: 14,001/28,001-character inputs were rejected by the library's default 10,000-character guard, while one valid 9,601-character nested pattern completed. The initial probe incorrectly assumed it would observe RangeError; its failed expectation is experimental evidence, not a PRISM defect. These samples neither establish general safety nor waive the published advisory. No production/browser build patterns were changed.

ESLint 9's support warning and npm's unapproved optional Windows binary-hydration script are maintenance/environment notices, separate from audit advisories. Native tests must actually pass; a warning is not proof the fixture binary works. No broad install-script allowance, scanner exclusion or weakened assertion is added.
