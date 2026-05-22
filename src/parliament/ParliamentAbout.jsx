import P from "../theme/palette";

/**
 * /parliament/about — the rationale behind the Hansard Highlights feature.
 * A signed personal essay; distinct in register from the site's neutral data
 * pages, and marked as such by the byline.
 */

const COL = { maxWidth: 680, margin: "0 auto" };

const EYEBROW = {
  fontFamily: "'DM Mono', monospace", fontSize: "11px", fontWeight: 500,
  textTransform: "uppercase", letterSpacing: "0.18em", color: P.teal,
};
const H1 = {
  fontFamily: "'Playfair Display', serif", fontSize: "clamp(26px, 4.4vw, 38px)",
  fontWeight: 700, color: P.text, lineHeight: 1.18, margin: "14px 0 10px",
};
const STANDFIRST = {
  fontFamily: "'DM Mono', monospace", fontSize: "13px", fontWeight: 300,
  color: P.textMuted, lineHeight: 1.6, margin: "0 0 8px",
};
const BYLINE = {
  fontFamily: "'DM Mono', monospace", fontSize: "11px", textTransform: "uppercase",
  letterSpacing: "0.08em", color: P.textLight, margin: 0,
};
const H2 = {
  fontFamily: "'Playfair Display', serif", fontSize: "21px", fontWeight: 600,
  color: P.text, margin: "34px 0 12px",
};
const PARA = {
  fontFamily: "'Playfair Display', serif", fontSize: "15.5px", lineHeight: 1.78,
  color: P.text, margin: "0 0 16px",
};
const MP_QUOTE = {
  margin: "16px 0", padding: "4px 0 4px 20px", borderLeft: `3px solid ${P.teal}`,
  fontFamily: "'Playfair Display', serif", fontSize: "16px", lineHeight: 1.6, color: P.text,
};
const MP_ATTR = {
  fontFamily: "'DM Mono', monospace", fontSize: "12px", color: P.textLight,
  margin: "6px 0 0",
};
const BACK_LINK = {
  fontFamily: "'DM Mono', monospace", fontSize: "12px", fontWeight: 500,
  color: P.teal, background: "none", border: "none", cursor: "pointer", padding: 0,
};

const EPIGRAPHS = [
  {
    quote: "It is only by the collision of adverse opinions that the remainder of the truth has any chance of being supplied… there is always hope when people are forced to listen to both sides; it is when they attend to only one that errors harden into prejudice.",
    source: "John Stuart Mill, On Liberty, 1859",
  },
  {
    quote: "Government and legislation are matters of reason and judgment, and not of inclination… what sort of reason is that, in which the determination precedes the discussion?",
    source: "Edmund Burke, 1774",
  },
  {
    quote: "We wish to see our Parliament a strong, easy, flexible instrument of free Debate. For this purpose a small Chamber and a sense of intimacy are indispensable.",
    source: "Winston Churchill, 1943",
  },
];

const DEFENCE_QUOTES = [
  {
    quote: "During a recent NATO training exercise, a British brigade was effectively wiped out by four Ukrainian drone operators. That is not an indictment of our soldiers, but a reflection of modern warfare.",
    speaker: "Mike Martin MP (LD)",
  },
  {
    quote: "The US is carrying out a NATO audit, and it is looking hard at us. Our European partners are questioning whether we can deliver on the commitments we have made to NATO as part of the defence planning process, and whether we continue to deserve our leadership role in NATO.",
    speaker: "Tanmanjeet Singh Dhesi MP (Lab), Chair of the Defence Committee",
  },
  {
    quote: "In the same cross-party forum last month, a NATO Defence Minister—I will not say which country he was from—said, “With all due respect, the UK are not leading; they are not even in the room, and they are not funding as they were.”",
    speaker: "Stuart Anderson MP (Con)",
  },
  {
    quote: "When I asked the Chief of the Defence Staff recently why we do not tell the public more, he said, “We don’t want to alarm people.” Does my hon. Friend agree that the public are grown-ups, and that they should probably be a little more alarmed than they already are?",
    speaker: "Michelle Scrogham MP (Lab)",
  },
];

export default function ParliamentAbout({ navigate }) {
  return (
    <div style={{ padding: "32px 0 8px", animation: "fadeSlideIn 0.4s ease both" }}>
      <div style={COL}>
        <button type="button" onClick={() => navigate("parliament")} style={BACK_LINK}>
          ← Hansard Highlights
        </button>

        <header style={{ marginTop: 18 }}>
          <div style={EYEBROW}>About</div>
          <h1 style={H1}>Covering the substance of Parliament</h1>
          <p style={STANDFIRST}>
            Why the /Parliament tab was built, and the case for opening up
            Parliament's video record.
          </p>
          <p style={BYLINE}>Jack Aspinall · May 2026</p>
        </header>

        {/* Epigraphs */}
        <div style={{
          margin: "22px 0 6px", background: P.bgCard,
          border: `1px solid ${P.border}`, borderRadius: 3,
        }}>
          {EPIGRAPHS.map((e, i) => (
            <div
              key={i}
              style={{
                padding: "16px 22px",
                borderTop: i === 0 ? "none" : `1px solid ${P.border}`,
              }}
            >
              <p style={{
                fontFamily: "'Playfair Display', serif", fontSize: "14.5px",
                fontStyle: "italic", lineHeight: 1.62, color: P.textMuted, margin: 0,
              }}>
                {e.quote}
              </p>
              <p style={{
                fontFamily: "'DM Mono', monospace", fontSize: "11px",
                color: P.textLight, margin: "7px 0 0",
              }}>
                — {e.source}
              </p>
            </div>
          ))}
        </div>

        {/* Body */}
        <p style={{ ...PARA, marginTop: 24 }}>
          I wish to set out the objective behind building the /Parliament tab, and
          the potential for far greater impact that small changes to the video
          licensing terms and costs would enable.
        </p>
        <p style={PARA}>
          Parliament is a great institution. Historic stories of Wilberforce, Pitt,
          Disraeli and Gladstone show its power, where rhetoric and reason push
          precise and productive changes to drive the country forward. Yet today,
          Parliament seems hollow. Ministers are preferentially revealing content on
          TikTok, or on morning news rounds, instead of in the House – despite the
          Speaker's fury.
        </p>
        <p style={PARA}>
          This is primarily driven by media. Coverage of Parliament is dominated by
          Prime Minister's Questions (PMQs). Contributions focus on engineering a
          soundbite moment, with the aim of social media virality. 'Debates' consist
          of a series of pre-scripted statements read by MPs, with votes pre-decided
          by Whips' offices – thus preventing the "collision of adverse opinions"
          that distils the truth, which Mill highlighted.
        </p>
        <p style={PARA}>
          Where there is real substantive debate, it is rarely covered, rarely
          distributed, rarely engaged with.
        </p>
        <p style={PARA}>
          The behaviour of MPs is rational in response to the reward. If substantive
          debate were to be covered, distributed and engaged with – the reward
          structure shifts. Substantive contributions in Parliament become
          meaningful parts of the public dialogue, and behaviour follows. A golden
          era of debate can be unlocked, and better decisions made.
        </p>

        <h2 style={H2}>Recent debate</h2>
        <p style={PARA}>
          The embers of great debate remain. In the past couple of days, I have
          greatly enjoyed reading and listening to speeches. Some stand-out moments
          from Wednesday's debate on the Defence section of the King's Speech:
        </p>
        {DEFENCE_QUOTES.map((q, i) => (
          <blockquote key={i} style={MP_QUOTE}>
            {q.quote}
            <p style={MP_ATTR}>— {q.speaker}</p>
          </blockquote>
        ))}
        <p style={{ ...PARA, marginTop: 18 }}>
          These four contributions, from across the House, paint a striking picture
          of UK defence readiness. This is of paramount national importance, yet
          coverage was instead dominated by Streeting's first speech since his
          resignation, and a clash over oil sanctions which was, at its heart, a
          miscommunication.
        </p>
        <p style={PARA}>
          Some may object that substantive debate within Parliament is simply dull,
          and that this explains the lack of coverage. These quotes show otherwise.
          There have been similarly interesting discussions on steel
          nationalisation, AI regulation and rural banking provision over the past
          two days – all of them worth reading and engaging with.
        </p>

        <h2 style={H2}>Why doesn't this happen already?</h2>
        <p style={PARA}>
          There is clearly an appetite for substantive political debate. Podcasts
          and long-form politics discussions are popular. Yet despite this,
          parliamentary debate, which is essentially exactly this, is not widely
          covered or distributed.
        </p>
        <p style={PARA}>
          I believe the main reason is the parliamentlive.tv licensing terms. The
          licence costs £20 to £150 plus VAT per 30-minute clip, and is highly
          restrictive on any content adjacent to the clip: no editing, no subtitles,
          titles or captions, no split screen, no lingering wide shots of an empty
          Chamber, nothing.
        </p>
        <p style={PARA}>
          What this means is that organisations can only really financially justify
          purchasing the soundbite-rich 30-minute PMQs session. The number of
          organisations that will even do this is small. Covering substantive debate
          is essentially not worth the hassle.
        </p>
        <p style={PARA}>
          If Parliament, and the Speaker's office, are serious about returning
          Parliament to a central institution contributing to public dialogue and
          the foundation of our political process, then these licensing terms and
          costs seem a sensible place to start. Cutting and distributing an MP4 file
          is already automated; the cost should therefore be close to zero.
        </p>

        <h2 style={H2}>Building the product</h2>
        <p style={PARA}>
          To try to demonstrate the potential, I have built something as close to a
          highlight reel as is possible while remaining compliant, by embedding the
          Parliament player in a page with full context. This gives a genuinely
          enjoyable experience of exploring the contributions in Parliament each
          day, and getting a feel for the texture of the day. I have tried to make
          it so that whether you have three minutes or three hours, it is equally
          useful.
        </p>
        <p style={PARA}>
          The text, from Hansard, is published under an open licence; click the
          'Watch' button on any contribution and the embedded video player jumps to
          the right section. You can also explore the debate around each highlight,
          to hear the different sides.
        </p>
        <p style={PARA}>
          In selecting the highlights, which is LLM-based, I have strongly biased
          towards long-term substance over ephemeral policy or politics. There is
          room to tune this in other directions, although the licensing terms ban
          satire, so don't try that.
        </p>
        <p style={PARA}>
          The full debate is there too, with every contribution carrying a button to
          watch it live; you will no doubt find different things engaging than I
          did.
        </p>

        <h2 style={H2}>What next?</h2>
        <p style={PARA}>
          I would encourage other outlets to replicate this model. It is quite
          simple at its core, and the more coverage there is of Parliament, the
          stronger the incentive for substantive debate. Please get in touch with
          ideas or changes.
        </p>
        <p style={PARA}>
          There is scope for doing really interesting things across time that the
          /Parliament tab does not yet do. It seems fairly simple, with LLMs, to
          trace contributions on defence back over 100 years of debate: to group
          recurring themes, pull out patterns, log failure modes, and see
          opportunities. I have not done this yet, but it is interesting.
        </p>
        <p style={PARA}>
          This is, at its core, an experiment. Is there an appetite for, and
          interest in, the substance of parliamentary debate? If there is, I think
          there is a compelling case for changing the parliamentlive.tv licensing
          terms so that parliamentary debate can form a greater part of our national
          conversation, by extending the open-government principles already applied
          to Hansard and to government data to the video record of Parliament
          itself. This anomaly, governed by rules retained from the inception of
          videography, undermines the importance, credibility and impact of
          Parliament, which is, at its core, a great institution.
        </p>

        <div style={{ margin: "32px 0 8px", paddingTop: 20, borderTop: `1px solid ${P.border}` }}>
          <button type="button" onClick={() => navigate("parliament")} style={BACK_LINK}>
            ← Back to today's sitting
          </button>
        </div>
      </div>
    </div>
  );
}
