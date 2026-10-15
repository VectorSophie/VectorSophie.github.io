"use client";

import { useEffect, useRef } from "react";
import "./jack-exe.css";
import { CONTACT } from "./data";
import { mountJackExe } from "./engine";

/** Decorative title-bar buttons. */
function Tb({ n = 3 }: { n?: 1 | 2 | 3 }) {
  const glyphs = ["_", "□", "✕"].slice(3 - n);
  return (
    <span className="tb" aria-hidden="true">
      {glyphs.map((g) => <i key={g}>{g}</i>)}
    </span>
  );
}

function Titlebar({ id, title, n }: { id: string; title: string; n?: 1 | 2 | 3 }) {
  return (
    <div className="titlebar">
      <span className="ico" />
      <span className="ttl" id={id}>{title}</span>
      <Tb n={n} />
    </div>
  );
}

export default function JackExe() {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!root.current) return;
    return mountJackExe(root.current);
  }, []);

  return (
    <div className="jx" ref={root} id="top">
      <div className="cols">
        <div className="col left">
          <section className="win" id="w-op" aria-labelledby="t-op">
            <Titlebar id="t-op" title="operator.bmp" />
            <div className="artwrap sunken" data-el="artwrap">
              <canvas data-el="art" id="art" width={128} height={147} role="img"
                aria-label="Pixel portrait: a dark-haired figure with a crown of thorns and pale wings" />
            </div>
            <div className="statusbar">
              <span className="shallow grow">128×147 · 18 colours</span>
              <span className="shallow">bayer 4×4</span>
            </div>
          </section>

          <section className="win" id="w-conv" aria-labelledby="t-conv">
            <Titlebar id="t-conv" title="conversion" n={2} />
            <div className="sunken" style={{ margin: 4 }}>
              <canvas data-el="conv" id="conv" aria-label="Letters of the current token mapped onto the alphabet, then onto the experts" />
            </div>
            <div className="field">
              <label htmlFor="jx-word">Route your own word</label>
              <input id="jx-word" data-el="word" className="sunken" type="text" autoComplete="off"
                spellCheck={false} maxLength={40} placeholder="type anything…" />
            </div>
            <div className="statusbar"><span className="shallow grow" data-el="conv-status">token —</span></div>
          </section>
        </div>

        <div className="col mid">
          <section className="win" id="w-readme" aria-labelledby="t-readme">
            <Titlebar id="t-readme" title="readme.txt" />
            <div className="readme">
              <div style={{ minWidth: 0 }}>
                <h1>Jack</h1>
                <p className="sub">VectorSophie · developer / writer</p>
                <p className="tagline">End-to-end, open &amp; open. Until every end-to-end flow is open to public.</p>
                <p className="about">I like useful software, silly ideas that somehow work, and small projects that teach lessons.</p>
              </div>
              <nav className="links" aria-label="Links">
                <a className="btn primary" href={CONTACT.github}>GitHub</a>
                <a className="btn" href="/blogs">Writing</a>
                <a className="btn" href="#contact">Contact</a>
              </nav>
            </div>
          </section>

          <section className="win" id="w-router" aria-labelledby="t-router">
            <div className="titlebar" data-el="router-title">
              <span className="ico" />
              <span className="ttl" id="t-router">router.exe — 8 experts × 6 layers, top-2</span>
              <Tb />
            </div>
            <div className="menubar">
              <button className="mb" type="button" data-el="b-play">Play sentence ▸</button>
              <button className="mb" type="button" data-el="b-reset">Reset load</button>
            </div>
            <div className="sunken routerwell">
              <canvas data-el="router" id="router" tabIndex={0}
                aria-label="Router: hover or tap a word of the tagline to route it to eight project experts across six layers. Left and right arrow keys step through the words." />
            </div>
            <div className="statusbar">
              <span className="shallow" data-el="s-mode">idle</span>
              <span className="shallow grow" data-el="s-tok">—</span>
              <span className="shallow" data-el="s-lock">—</span>
            </div>
            <p className="sr" aria-live="polite" data-el="live" />
          </section>

          <section className="win" id="w-log" aria-labelledby="t-log">
            <Titlebar id="t-log" title="route.log" n={2} />
            <ol className="sunken" id="log" data-el="log" />
          </section>
        </div>

        <div className="col right">
          <section className="win" id="w-out" aria-labelledby="t-out">
            <div className="titlebar" data-el="out-title">
              <span className="ico" />
              <span className="ttl" id="t-out">expert.out</span>
              <Tb />
            </div>
            <div className="card" data-el="card">
              <div className="row">
                <span data-el="c-num" style={{ color: "var(--blue)" }}>expert 01 / 08</span>
                <span className="stars" data-el="c-stars" />
              </div>
              <h2 data-el="c-name">—</h2>
              <div className="chips">
                <span className="chip role" data-el="c-role" />
                <span className="chip status" data-el="c-status" />
                <span className="chip shallow" data-el="c-lang" />
              </div>
              <p className="line" data-el="c-line" />
              <p className="bodytxt" data-el="c-body" />
              <div className="stack sunken" data-el="c-stack" />
              <span className="sect">Stats</span>
              <div className="stats sunken" data-el="c-stats" />
              <span className="sect">Traits</span>
              <div className="chips" data-el="c-traits" />
              <div className="meter">
                <div className="lbl"><span data-el="c-mode">—</span><span data-el="c-share">0%</span></div>
                <div className="segs sunken" data-el="c-segs" />
              </div>
              <div className="actions">
                <a className="btn primary" data-el="c-url" href="#">Open repository</a>
                <button className="btn" type="button" data-el="c-pin">Pin</button>
              </div>
            </div>
          </section>

          <section className="win" id="w-idx" aria-labelledby="t-idx">
            <Titlebar id="t-idx" title="experts.idx" n={1} />
            <div className="listbox sunken" data-el="list" />
            <div className="statusbar"><span className="shallow grow">click to pin · click again to release</span></div>
          </section>
        </div>
      </div>

      <footer className="site-foot" id="contact" aria-labelledby="foot-h">
        <div className="foot-in">
          <div>
            <p className="foot-logo" id="foot-h"><span className="ico" />jack.exe</p>
            <p className="foot-desc">
              Developer and writer. I build AI agent tooling, terminal apps and low-level Linux software,
              and I care about flows that stay open end to end.
            </p>
            <div className="foot-icons">
              <a className="ibtn" href={CONTACT.github} aria-label="GitHub profile">
                <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2 2h12v9H9l-3 3v-3H2z" fill="none" stroke="currentColor" strokeWidth="1.5" /></svg>
              </a>
              <button className="ibtn" type="button" data-el="copy-mail" aria-label="Copy email address">
                <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M1.5 3.5h13v9h-13zM1.5 3.5l6.5 5 6.5-5" fill="none" stroke="currentColor" strokeWidth="1.5" /></svg>
              </button>
            </div>
          </div>
          <div className="foot-col">
            <h2>Work with me</h2>
            <ul>
              <li>Web development</li>
              <li>AI agent &amp; LLM tooling</li>
              <li>CLI / TUI applications</li>
              <li>Linux installers &amp; systems</li>
              <li>Security testing for AI agents</li>
            </ul>
          </div>
          <div className="foot-col">
            <h2>Contact</h2>
            <ul>
              <li><span className="fi">@</span><span data-el="mail-text">{CONTACT.email}</span><span className="copied" data-el="copied" hidden>copied</span></li>
              <li><span className="fi">gh</span><a href={CONTACT.github}>github.com/VectorSophie</a></li>
              <li><span className="fi">◷</span>{CONTACT.availability}</li>
            </ul>
          </div>
        </div>
        <div className="foot-bottom">
          <span>© {new Date().getFullYear()} Jack (VectorSophie). All rights reserved.</span>
          <span className="foot-links">
            <a href="/blogs">Writing</a>
            <a href="/lab">Lab</a>
            <a href={`${CONTACT.github}/VectorSophie.github.io`}>Source</a>
          </span>
        </div>
      </footer>

      <nav className="taskbar" aria-label="Windows">
        <a className="start" href="#top"><span className="ico" />jack.exe</a>
        <div className="tasks">
          <a className="task shallow" href="#w-op">operator.bmp</a>
          <a className="task shallow" href="#w-conv">conversion</a>
          <a className="task shallow" href="#w-router">router.exe</a>
          <a className="task shallow" href="#w-out">expert.out</a>
        </div>
        <div className="tray shallow">
          <span className="lamp" data-el="lamp" />
          <span data-el="t-mode">idle</span>
          <span data-el="clock">KST --:--</span>
        </div>
      </nav>

      <canvas className="fx" data-el="fx" aria-hidden="true" />
    </div>
  );
}
