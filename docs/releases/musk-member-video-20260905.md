# Musk ecosystem member video — original bilingual research

Scope: catalogue, private-storage slug allowlist, member summaries, voice-version links, episode count, original media builder/script and targeted tests. Existing member API and admin upload API remain unchanged. No database schema, environment variable, trading switch, risk setting or locked forecast changes.

Baseline: b8b2082. Rollback: revert this release's files and withdraw only the two new catalogue entries. Existing video manifests and assets are not overwritten; uploads use distinct UUID releases. Keep the bucket private.

## Research provenance (internal)

- Primary cycle reference: supplied `01_六爻老师/01-丙午老师新课/SPCX未来半年会爆发吗 .txt` and matching chart PNG, cast July 27, covering July 27–January 27. The source places its candidate high in September 7–October 7, without a fixed price target. Only a short thesis is summarized; source footage is not reproduced.
- User event charts: September 5 at 20:15, 火泽睽 static, and 20:23, 泽火革→雷山小过, moving lines 1/5. Correlated samples, not two independent confirmations. No teacher is alleged to have personally issued these interpretations.
- Supplementary original personal charts: SPCX September 7–October 7 随→颐; Tesla September 讼→同人; ASTEROID September 大有→恒. No personal name, date of birth or source screenshot is rendered.
- Stone September 4 merger post was privately inspected as a lead, including the author's uncertainty. It supplies no verified corporate timetable. Its wording, comments, positions and private trading levels are excluded from the member video. Public merger discussion is independently grounded in Reuters July 22 and July 30 reporting, linked in the protected source notes.
- Existing weekly records are described, not revised. No same-window specialist Tesla lesson from the primary teacher was located. No missing Qimen chart, Chan structure, calibrated probability or live token liquidity was fabricated.
- Public primary disclosures: SpaceX IPO release, SpaceX and Tesla Q2 SEC 10-Q, SpaceX August 27 conference announcement, NYSE holiday calendar. Historical price snapshot: Stock Analysis / Tiingo for SPCX, S&P Global for TSLA, September 4 close. Earlier intraday SPCX quote was discarded. TSLA provider differences exist; the named snapshot is 354.08, not an implied universal execution quote.
- ASTEROID community disclaimer confirms independent token identity, not company affiliation or safety. Contract: `0xf280B16EF293D8e534e370794ef26bF312694126`. The $9m→$40m example is explicitly hypothetical.

## Media and verification

Run `python tools/media/build-musk-outlook.py`. Dependencies reuse the existing oil-video pipeline: edge-tts, imageio-ffmpeg, Pillow, mutagen. No new runtime dependencies. Outputs are untracked operational artifacts under `tmp/musk-outlook-20260905/{zh,en}`; stage source files explicitly and do not commit media or credentials.

Each version has original slides, narration, a timestamp-aligned primary-language VTT and a paragraph-aligned translated VTT. H264/AAC, 1280×720, fast-start MP4, below the existing 32 MiB cap. Render source never opens the original screenshots or private posts.

Tests: `node --import tsx --test tests/member-video-security-v720114.test.ts tests/member-musk-video.test.ts`; `npm run typecheck`; `npm run build`; impact audit. Validate live playback and anonymous denial separately. Run `npm run release:validate -- --site https://mooxintel.com` after deployment; build success is not media publication acceptance.

Local media QA: both complete audio/video streams decoded with FFmpeg without errors. Mandarin MP4 is 622.13 seconds / 6,818,128 bytes; English is 648.56 seconds / 6,975,305 bytes. Both are H264/AAC 1280×720. Rendered chart slides and extracted mid-video frames were visually inspected. Four VTT tracks passed monotonic timestamp checks. Targeted tests: 12/12; TypeScript: pass. React review: server-only protected notes remain behind the allowed branch, no new client dependency or data waterfall; native video controls and reciprocal language links retained. Production and live media acceptance remain separate gates.

Forward research evaluation: September 8 equity reopening; September 10 company conference is an information event, not a predicted merger announcement; September 21 SPCX fade-risk review; September 30 news/no-news classification; October 7 window review; January 27, 2027 full six-month-high evaluation. Preserve failures, do not backdate.
