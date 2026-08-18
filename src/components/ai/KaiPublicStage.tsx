"use client";

import Image from "next/image";

export default function KaiPublicStage() {
  const openKai = () => window.dispatchEvent(new CustomEvent("ss:concierge"));

  return (
    <section id="kai" className="trailer-kai" aria-labelledby="trailer-kai-title">
      <h2 id="trailer-kai-title" className="sr-only">Kai, Sophisticated Sips AI event concierge</h2>
      <div className="trailer-kai__window" aria-hidden="true">
        <Image
          src="/brand/kai-ai-assistant.png"
          alt=""
          width={864}
          height={1821}
          sizes="(max-width: 820px) 24vw, 230px"
          priority
        />
      </div>
      <button className="trailer-kai__status" type="button" onClick={openKai}>
        <span /> Kai · Ready to help
      </button>
    </section>
  );
}
