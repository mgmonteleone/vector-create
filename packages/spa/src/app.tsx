/**
 * VECTOR//CREATE studio root. Wires the five panes together:
 *   1. live PREVIEW (client core.render for instant feedback; swaps to the
 *      server SVG after a steer/create)
 *   2. PROMPT bar (routes steering -> /api/steer, creation -> /api/concepts)
 *   3. GENOME panel (auto-generated per-gene controls; live re-render)
 *   4. CONCEPT selector (built-in + agent-created)
 *   5. GALLERY / HISTORY (variations + prior states)
 *
 * Resilience: the app probes the server on boot. Offline, it degrades to
 * client-side core.render for preview and disables server-only actions with a
 * clear terminal message; whenever the agent degrades, source:'fallback' is
 * surfaced in the log.
 */
import { sanitize } from "@vector-create/core";
import { useCallback, useEffect, useMemo, useState } from "preact/hooks";
import * as api from "./api";
import { BootSequence } from "./components/BootSequence";
import { ConceptSelector } from "./components/ConceptSelector";
import { Gallery, type GalleryItem } from "./components/Gallery";
import { GenomePanel } from "./components/GenomePanel";
import { PromptBar } from "./components/PromptBar";
import { SvgFrame } from "./components/SvgFrame";
import { TerminalLog } from "./components/TerminalLog";
import { downloadPng, downloadSvg } from "./download";
import { isLocalConcept, localConcepts, renderLocal, uniquePrefix } from "./preview";
import { classifyPrompt } from "./prompt-router";
import * as storage from "./storage";
import type { ConceptSummary, Genome, SavedSession } from "./types";
import { useLog } from "./use-log";

type Theme = "green" | "amber";

export function App() {
  const [booted, setBooted] = useState(false);
  const [online, setOnline] = useState(false);
  const [theme, setTheme] = useState<Theme>("green");

  const [concepts, setConcepts] = useState<ConceptSummary[]>(localConcepts());
  const [conceptId, setConceptId] = useState<string>(concepts[0]?.id ?? "wormhole");
  const [genome, setGenome] = useState<Genome>(concepts[0]?.baseGenome ?? {});
  const [svg, setSvg] = useState<string>("");

  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [galleryGenomes, setGalleryGenomes] = useState<Genome[]>([]);
  const [promptHistory, setPromptHistory] = useState<string[]>([]);
  const [saved, setSaved] = useState<SavedSession[]>([]);
  const [saveName, setSaveName] = useState("");
  const [busy, setBusy] = useState(false);

  const { lines, log } = useLog();

  const activeConcept = useMemo(
    () => concepts.find((c) => c.id === conceptId),
    [concepts, conceptId]
  );

  // Client-side preview render. Every render mints a fresh unique prefix so
  // stacked/gallery SVGs never share SMIL animation ids.
  const previewLocal = useCallback(
    (id: string, g: Genome) => {
      if (!isLocalConcept(id)) {
        return false;
      }
      try {
        setSvg(renderLocal(id, g, uniquePrefix("pv")));
        return true;
      } catch (err) {
        log("err", `render failed: ${(err as Error).message}`);
        return false;
      }
    },
    [log]
  );

  // --- boot: probe server, load concept list, first preview ---
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const reachable = await api.ping();
      if (cancelled) {
        return;
      }
      setOnline(reachable);
      if (reachable) {
        log("ok", "agent service online :: /api reachable");
        try {
          const remote = await api.listConcepts();
          if (!cancelled && remote.length > 0) {
            setConcepts(remote);
          }
        } catch {
          log("warn", "concept list fetch failed — using local registry");
        }
      } else {
        log("warn", "agent service UNREACHABLE — offline preview only");
        log("info", "server-only actions (steer/create/variations/png) disabled");
      }
      setSaved(storage.listSessions());
    })();
    return () => {
      cancelled = true;
    };
  }, [log]);

  // Initial preview on first mount. Concept switches and genome edits render
  // eagerly in their own handlers (selectConcept / onGenomeChange).
  useEffect(() => {
    previewLocal(conceptId, genome);
  }, []);

  const selectConcept = (id: string) => {
    const c = concepts.find((x) => x.id === id);
    if (!c) {
      return;
    }
    setConceptId(id);
    const base = c.baseGenome ?? {};
    setGenome(base);
    log("info", `concept :: ${c.title}`);
    previewLocal(id, base);
  };

  const onGenomeChange = (next: Genome) => {
    setGenome(next);
    // Local instant preview on every slider move.
    previewLocal(conceptId, next);
  };

  // --- prompt routing ---
  const onPrompt = async (text: string) => {
    setPromptHistory((h) => [...h, text]);
    log("info", `$ ${text}`);
    const intent = classifyPrompt(text);

    if (!online) {
      log("err", `server offline — cannot ${intent === "create" ? "create concept" : "steer"}`);
      return;
    }

    setBusy(true);
    try {
      if (intent === "create") {
        const res = await api.createConcept(text);
        log(res.source === "llm" ? "agent" : "warn", `[${res.source}] created "${res.title}"`);
        setSvg(res.svg);
        // Register the new concept in the selector (remote-only until core ships it).
        setConcepts((prev) =>
          prev.some((c) => c.id === res.conceptId)
            ? prev
            : [...prev, { id: res.conceptId, title: res.title, genomeSpec: {}, baseGenome: {} }]
        );
        setConceptId(res.conceptId);
      } else {
        const res = await api.steer(conceptId, genome, text);
        log(res.source === "llm" ? "agent" : "warn", `[${res.source}] ${res.rationale}`);
        setGenome(res.genome);
        setSvg(res.svg);
      }
    } catch (err) {
      log("err", `request failed: ${(err as Error).message} — falling back to local preview`);
      previewLocal(conceptId, genome);
    } finally {
      setBusy(false);
    }
  };

  // --- variations ---
  const onVariations = async () => {
    if (!online) {
      log("err", "server offline — variations unavailable");
      return;
    }
    setBusy(true);
    try {
      const res = await api.variations(conceptId, 8, { anchor: genome });
      const items: GalleryItem[] = res.svgs.map((s, i) => ({
        key: `var-${Date.now()}-${i}`,
        svg: s,
        title: `variation ${i + 1}`,
      }));
      setGallery(items);
      setGalleryGenomes(res.genomes);
      log("ok", `sampled ${items.length} variations`);
    } catch (err) {
      log("err", `variations failed: ${(err as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  const onPickVariation = (index: number) => {
    const g = galleryGenomes[index];
    if (!g) {
      return;
    }
    const clean = isLocalConcept(conceptId) ? sanitize(conceptId, g) : g;
    setGenome(clean);
    previewLocal(conceptId, clean);
    log("info", `loaded variation ${index + 1}`);
  };

  // --- downloads / save ---
  const onDownloadSvg = () => {
    if (!svg) {
      return;
    }
    downloadSvg(svg, `${conceptId}-${Date.now()}`);
    log("ok", "svg exported");
  };

  const onDownloadPng = async () => {
    if (!svg) {
      return;
    }
    if (!online) {
      log("err", "server offline — PNG export unavailable");
      return;
    }
    setBusy(true);
    try {
      await downloadPng(svg, `${conceptId}-${Date.now()}`);
      log("ok", "png exported");
    } catch (err) {
      log("err", `png export failed: ${(err as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  const onSave = () => {
    const name = saveName.trim() || `${conceptId}-${new Date().toISOString().slice(0, 16)}`;
    storage.saveSession(name, conceptId, genome, promptHistory);
    setSaved(storage.listSessions());
    setSaveName("");
    log("ok", `saved session "${name}"`);
  };

  const onLoad = (name: string) => {
    const session = storage.loadSession(name);
    if (!session) {
      return;
    }
    setConceptId(session.conceptId);
    setGenome(session.genome);
    setPromptHistory(session.promptHistory);
    previewLocal(session.conceptId, session.genome);
    log("ok", `loaded session "${name}"`);
  };

  const onDelete = (name: string) => {
    storage.deleteSession(name);
    setSaved(storage.listSessions());
    log("info", `deleted session "${name}"`);
  };

  const toggleTheme = () => setTheme((t) => (t === "green" ? "amber" : "green"));

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme === "amber" ? "amber" : "green");
  }, [theme]);

  if (!booted) {
    return (
      <>
        <BootSequence onDone={() => setBooted(true)} />
        <div class="crt" />
      </>
    );
  }

  return (
    <>
      <div class="crt" />
      <div class="shell">
        <header class="topbar">
          <span class="brand">{"VECTOR//CREATE"}</span>
          <div class="btn-row">
            <span class={`status ${online ? "online" : "offline"}`}>
              {online ? "◉ AGENT ONLINE" : "◌ OFFLINE — LOCAL PREVIEW"}
            </span>
            <button type="button" onClick={toggleTheme} aria-label="toggle theme">
              {theme === "green" ? "amber" : "green"}
            </button>
          </div>
        </header>

        <div class="workspace">
          {/* left column: concept + genome */}
          <div class="col">
            <section class="panel">
              <div class="panel-title">concepts</div>
              <div class="panel-body">
                <ConceptSelector
                  concepts={concepts}
                  activeId={conceptId}
                  onSelect={selectConcept}
                />
              </div>
            </section>
            <section class="panel grow">
              <div class="panel-title">genome</div>
              <div class="panel-body">
                {activeConcept && Object.keys(activeConcept.genomeSpec).length > 0 ? (
                  <GenomePanel
                    spec={activeConcept.genomeSpec}
                    genome={genome}
                    onChange={onGenomeChange}
                  />
                ) : (
                  <p class="hint">no editable genes for this concept.</p>
                )}
              </div>
            </section>
          </div>

          {/* center column: preview */}
          <div class="col">
            <section class="panel grow">
              <div class="panel-title">preview</div>
              <div class="panel-body preview">
                {svg ? (
                  <SvgFrame svg={svg} />
                ) : (
                  <span class="loading">
                    rendering<span class="cursor">█</span>
                  </span>
                )}
              </div>
            </section>
            <section class="panel">
              <div class="panel-title">export</div>
              <div class="panel-body">
                <div class="btn-row">
                  <button type="button" onClick={onDownloadSvg} disabled={!svg}>
                    ⤓ svg
                  </button>
                  <button type="button" onClick={onDownloadPng} disabled={!svg || !online || busy}>
                    ⤓ png
                  </button>
                  <button type="button" onClick={onVariations} disabled={!online || busy}>
                    ⚄ vary
                  </button>
                  <input
                    class="name-input"
                    type="text"
                    placeholder="session name"
                    value={saveName}
                    aria-label="session name"
                    onInput={(e) => setSaveName((e.currentTarget as HTMLInputElement).value)}
                  />
                  <button type="button" onClick={onSave}>
                    ⛁ save
                  </button>
                </div>
                {saved.length > 0 && (
                  <ul class="saved-list">
                    {saved.map((s) => (
                      <li key={s.name}>
                        <button type="button" class="load" onClick={() => onLoad(s.name)}>
                          ▸ {s.name}
                        </button>
                        <button
                          type="button"
                          class="del"
                          onClick={() => onDelete(s.name)}
                          aria-label={`delete ${s.name}`}
                        >
                          ✕
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>
          </div>

          {/* right column: log + gallery */}
          <div class="col">
            <section class="panel grow">
              <div class="panel-title">console</div>
              <div class="panel-body">
                <TerminalLog lines={lines} />
              </div>
            </section>
            <section class="panel">
              <div class="panel-title">gallery</div>
              <div class="panel-body">
                <Gallery items={gallery} onPick={onPickVariation} />
              </div>
            </section>
          </div>
        </div>

        <PromptBar disabled={busy} onSubmit={onPrompt} />
      </div>
    </>
  );
}
