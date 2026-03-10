import { useState, useRef, useCallback } from "react";

const ACCENT = "#C8A96E";
const BG = "#0D0D0D";
const CARD = "#161616";
const BORDER = "#2a2a2a";

const GEMINI_API_KEY = "AIzaSyCIMyey_G0WqeAI53_nHLOLYXE1U-oP_qY"; // Replace with your key from aistudio.google.com

const systemPrompt = `You are an expert art historian and curator with deep knowledge of all art movements, artists, and techniques. When shown an artwork image, analyze it comprehensively and return ONLY valid JSON (no markdown, no backticks, no extra text) in this exact structure:

{
  "title": "Artwork title if known, or descriptive title",
  "artist": "Artist name",
  "artistBio": "2-3 sentence biography of the artist",
  "year": "Year or approximate period",
  "movement": "Art movement (e.g. Impressionism, Baroque, etc.)",
  "medium": "Medium used (e.g. Oil on canvas)",
  "dimensions": "Approximate or known dimensions if recognizable",
  "description": "3-4 sentence description of the artwork, what is depicted, mood, composition",
  "technique": "Key techniques and stylistic elements used",
  "symbolism": "Notable symbolism or meaning in the work",
  "colorPalette": [
    { "name": "Color name", "hex": "#hexcode", "role": "dominant/accent/shadow/highlight" }
  ],
  "similarArtworks": [
    { "title": "Artwork title", "artist": "Artist", "year": "Year", "reason": "Why it's similar" }
  ],
  "funFacts": ["Interesting fact 1", "Interesting fact 2", "Interesting fact 3"],
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"],
  "confidence": "high/medium/low"
}

Return 5-6 colors in the palette. Return 3 similar artworks. Always return valid JSON only.`;

export default function ArtScanner() {
  const [image, setImage] = useState(null);
  const [imageBase64, setImageBase64] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef();

  const processFile = (file) => {
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      setImage(e.target.result);
      setImageBase64(e.target.result.split(",")[1]);
      setAnalysis(null);
      setError(null);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    processFile(e.dataTransfer.files[0]);
  }, []);

  const analyzeArt = async () => {
    if (!imageBase64) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{
              parts: [
                { text: systemPrompt + "\n\nAnalyze this artwork and return the JSON." },
                { inline_data: { mime_type: "image/jpeg", data: imageBase64 } }
              ]
            }],
            generationConfig: { temperature: 0.4, maxOutputTokens: 2000 }
          })
        }
      );
      const data = await response.json();
      if (data.error) throw new Error(data.error.message);
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      if (!text) throw new Error("No response from Gemini");
      const clean = text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);
      setAnalysis(parsed);
    } catch (err) {
      setError("Could not analyze artwork. Please try another image. " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setImage(null);
    setImageBase64(null);
    setAnalysis(null);
    setError(null);
  };

  return (
    <div style={{ background: BG, minHeight: "100vh", fontFamily: "'Georgia', serif", color: "#e8e0d5" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Crimson+Text:ital@0;1&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 6px; background: #111; }
        ::-webkit-scrollbar-thumb { background: #333; border-radius: 3px; }
        .upload-zone { border: 1.5px dashed ${BORDER}; border-radius: 2px; transition: all 0.3s; cursor: pointer; }
        .upload-zone:hover, .upload-zone.drag { border-color: ${ACCENT}; background: rgba(200,169,110,0.04); }
        .analyze-btn { background: ${ACCENT}; color: #0D0D0D; border: none; cursor: pointer; font-family: 'Playfair Display', serif; font-size: 1rem; font-weight: 700; letter-spacing: 0.12em; padding: 14px 40px; transition: all 0.2s; }
        .analyze-btn:hover { background: #dbb97e; transform: translateY(-1px); }
        .analyze-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
        .tag { background: rgba(200,169,110,0.12); border: 1px solid rgba(200,169,110,0.3); color: ${ACCENT}; padding: 4px 12px; font-size: 0.72rem; letter-spacing: 0.1em; text-transform: uppercase; font-family: 'Crimson Text', serif; }
        .section-title { font-family: 'Playfair Display', serif; font-size: 0.7rem; letter-spacing: 0.25em; text-transform: uppercase; color: ${ACCENT}; margin-bottom: 16px; }
        .card { background: ${CARD}; border: 1px solid ${BORDER}; padding: 28px; margin-bottom: 16px; }
        .color-swatch { width: 44px; height: 44px; border-radius: 50%; cursor: pointer; transition: transform 0.2s; border: 2px solid transparent; }
        .color-swatch:hover { transform: scale(1.15); border-color: rgba(255,255,255,0.2); }
        .similar-card { background: #111; border: 1px solid ${BORDER}; padding: 16px; transition: border-color 0.2s; }
        .similar-card:hover { border-color: ${ACCENT}; }
        .fact-item { border-left: 2px solid ${ACCENT}; padding-left: 14px; margin-bottom: 12px; font-family: 'Crimson Text', serif; font-size: 1rem; line-height: 1.6; color: #b8b0a5; }
        .pulse { animation: pulse 1.5s ease-in-out infinite; }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        .fade-in { animation: fadeIn 0.6s ease forwards; }
        @keyframes fadeIn { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
      `}</style>

      {/* Header */}
      <div style={{ borderBottom: `1px solid ${BORDER}`, padding: "24px 40px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.5rem", fontWeight: 700, letterSpacing: "0.05em", color: "#f0e8dc" }}>
            ARTVISION
          </div>
          <div style={{ fontSize: "0.7rem", letterSpacing: "0.3em", color: "#666", marginTop: 2, textTransform: "uppercase" }}>
            AI Art Intelligence
          </div>
        </div>
        {analysis && (
          <button onClick={reset} style={{ background: "transparent", border: `1px solid ${BORDER}`, color: "#888", padding: "8px 20px", cursor: "pointer", fontFamily: "Georgia, serif", fontSize: "0.8rem", letterSpacing: "0.1em", transition: "all 0.2s" }}
            onMouseEnter={e => e.target.style.borderColor = ACCENT}
            onMouseLeave={e => e.target.style.borderColor = BORDER}>
            ← New Scan
          </button>
        )}
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "40px 24px" }}>

        {/* Upload Section */}
        {!analysis && (
          <div style={{ maxWidth: 600, margin: "0 auto", textAlign: "center" }}>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(2rem,5vw,3.2rem)", fontWeight: 400, lineHeight: 1.2, marginBottom: 12, color: "#f0e8dc" }}>
              Discover the Story<br /><em style={{ color: ACCENT }}>Behind the Art</em>
            </div>
            <p style={{ color: "#888", fontFamily: "'Crimson Text', serif", fontSize: "1.1rem", lineHeight: 1.7, marginBottom: 40 }}>
              Upload any painting, sculpture, or artwork. Our AI will identify the artist, decode the symbolism, extract the colour palette, and surface similar masterpieces.
            </p>

            {!image ? (
              <div
                className={`upload-zone ${dragOver ? "drag" : ""}`}
                onClick={() => fileRef.current.click()}
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                style={{ padding: "60px 40px" }}
              >
                <div style={{ fontSize: "2.5rem", marginBottom: 16, opacity: 0.5 }}>🖼</div>
                <div style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.1rem", color: "#ccc", marginBottom: 8 }}>
                  Drop your artwork here
                </div>
                <div style={{ fontSize: "0.8rem", color: "#555", letterSpacing: "0.1em" }}>
                  or click to browse — JPG, PNG, WEBP
                </div>
                <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={e => processFile(e.target.files[0])} />
              </div>
            ) : (
              <div className="fade-in">
                <div style={{ position: "relative", marginBottom: 24 }}>
                  <img src={image} alt="Artwork" style={{ width: "100%", maxHeight: 440, objectFit: "contain", border: `1px solid ${BORDER}` }} />
                  <button onClick={() => { setImage(null); setImageBase64(null); }} style={{ position: "absolute", top: 10, right: 10, background: "rgba(0,0,0,0.7)", border: `1px solid ${BORDER}`, color: "#ccc", width: 32, height: 32, cursor: "pointer", fontSize: "1rem" }}>×</button>
                </div>
                {error && <div style={{ color: "#e07070", fontFamily: "'Crimson Text', serif", marginBottom: 16, fontSize: "0.95rem" }}>{error}</div>}
                <button className="analyze-btn" onClick={analyzeArt} disabled={loading}>
                  {loading ? <span className="pulse">Analysing Artwork…</span> : "Analyse Artwork"}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Results */}
        {analysis && (
          <div className="fade-in">
            <div style={{ display: "grid", gridTemplateColumns: "340px 1fr", gap: 24, alignItems: "start" }}>

              {/* Left Column */}
              <div>
                <img src={image} alt="Artwork" style={{ width: "100%", border: `1px solid ${BORDER}`, marginBottom: 16 }} />
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
                  {analysis.tags?.map((t, i) => <span key={i} className="tag">{t}</span>)}
                </div>
                <div className="card">
                  <div className="section-title">Colour Palette</div>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
                    {analysis.colorPalette?.map((c, i) => (
                      <div key={i} title={`${c.name} — ${c.hex}`}>
                        <div className="color-swatch" style={{ background: c.hex }} />
                      </div>
                    ))}
                  </div>
                  {analysis.colorPalette?.map((c, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                      <div style={{ width: 14, height: 14, borderRadius: 2, background: c.hex, flexShrink: 0 }} />
                      <div style={{ flex: 1 }}>
                        <span style={{ fontSize: "0.85rem", color: "#ccc" }}>{c.name}</span>
                        <span style={{ fontSize: "0.72rem", color: "#555", marginLeft: 8 }}>{c.hex}</span>
                      </div>
                      <span style={{ fontSize: "0.65rem", color: "#555", textTransform: "uppercase", letterSpacing: "0.1em" }}>{c.role}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Column */}
              <div>
                <div style={{ marginBottom: 28 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                    <span className="tag">{analysis.movement}</span>
                    {analysis.confidence && <span style={{ fontSize: "0.7rem", color: "#555", letterSpacing: "0.1em", textTransform: "uppercase" }}>{analysis.confidence} confidence</span>}
                  </div>
                  <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(1.6rem,3vw,2.4rem)", fontWeight: 700, color: "#f0e8dc", margin: "8px 0 4px", lineHeight: 1.2 }}>
                    {analysis.title}
                  </h1>
                  <div style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.1rem", color: ACCENT, fontStyle: "italic" }}>
                    {analysis.artist}{analysis.year ? `, ${analysis.year}` : ""}
                  </div>
                  <div style={{ fontSize: "0.85rem", color: "#666", marginTop: 4 }}>
                    {[analysis.medium, analysis.dimensions].filter(Boolean).join(" · ")}
                  </div>
                </div>

                <div className="card">
                  <div className="section-title">About This Work</div>
                  <p style={{ fontFamily: "'Crimson Text', serif", fontSize: "1.05rem", lineHeight: 1.8, color: "#b8b0a5", margin: 0 }}>{analysis.description}</p>
                </div>

                <div className="card">
                  <div className="section-title">About the Artist</div>
                  <p style={{ fontFamily: "'Crimson Text', serif", fontSize: "1.05rem", lineHeight: 1.8, color: "#b8b0a5", margin: 0 }}>{analysis.artistBio}</p>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                  <div className="card" style={{ margin: 0 }}>
                    <div className="section-title">Technique</div>
                    <p style={{ fontFamily: "'Crimson Text', serif", fontSize: "0.95rem", lineHeight: 1.7, color: "#b8b0a5", margin: 0 }}>{analysis.technique}</p>
                  </div>
                  <div className="card" style={{ margin: 0 }}>
                    <div className="section-title">Symbolism</div>
                    <p style={{ fontFamily: "'Crimson Text', serif", fontSize: "0.95rem", lineHeight: 1.7, color: "#b8b0a5", margin: 0 }}>{analysis.symbolism}</p>
                  </div>
                </div>

                {analysis.funFacts?.length > 0 && (
                  <div className="card">
                    <div className="section-title">Fascinating Facts</div>
                    {analysis.funFacts.map((f, i) => (
                      <div key={i} className="fact-item">{f}</div>
                    ))}
                  </div>
                )}

                {analysis.similarArtworks?.length > 0 && (
                  <div className="card">
                    <div className="section-title">Similar Artworks</div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
                      {analysis.similarArtworks.map((s, i) => (
                        <div key={i} className="similar-card">
                          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: "0.9rem", color: "#e0d8cc", marginBottom: 4, fontStyle: "italic" }}>{s.title}</div>
                          <div style={{ fontSize: "0.78rem", color: ACCENT, marginBottom: 6 }}>{s.artist}, {s.year}</div>
                          <div style={{ fontSize: "0.75rem", color: "#666", lineHeight: 1.5 }}>{s.reason}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ borderTop: `1px solid ${BORDER}`, padding: "20px 40px", textAlign: "center", marginTop: 40 }}>
        <span style={{ fontSize: "0.72rem", color: "#444", letterSpacing: "0.2em", textTransform: "uppercase" }}>
          Powered by Google Gemini · Artvision
        </span>
      </div>
    </div>
  );
}