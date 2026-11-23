import { useCallback, useId, useMemo, useRef, useState } from "react";
import { templates, fillTemplate, formatDateLv, classifyLine } from "./templates.js";
import { buildPdfFilename, downloadDocumentPdf } from "./pdf.js";
import "./App.css";

const EMPTY_FORM = {
  vards: "",
  uzvards: "",
  iestade: "",
  datums: "",
  saturs: "",
};

function todayISO() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

const FIELDS = [
  { name: "vards", label: "Vārds", autoComplete: "given-name" },
  { name: "uzvards", label: "Uzvārds", autoComplete: "family-name" },
];

export default function App() {
  const baseId = useId();
  const previewRef = useRef(null);
  const [templateId, setTemplateId] = useState(templates[0].id);
  const [form, setForm] = useState(() => ({ ...EMPTY_FORM, datums: todayISO() }));
  const [exportState, setExportState] = useState("idle");
  const [exportError, setExportError] = useState("");

  const template = templates.find((item) => item.id === templateId) ?? templates[0];

  const values = useMemo(
    () => ({
      vards: form.vards.trim(),
      uzvards: form.uzvards.trim(),
      iestade: form.iestade.trim(),
      datums: formatDateLv(form.datums),
      saturs: form.saturs.trim(),
    }),
    [form],
  );

  const documentText = useMemo(
    () => fillTemplate(template.body, values),
    [template.body, values],
  );

  const lines = useMemo(() => documentText.split("\n"), [documentText]);

  const updateField = useCallback((name, value) => {
    setForm((current) => ({ ...current, [name]: value }));
  }, []);

  const handleDownload = useCallback(async () => {
    if (!previewRef.current || exportState === "working") return;

    setExportError("");
    setExportState("working");

    try {
      const filename = buildPdfFilename(template.label, values);
      await downloadDocumentPdf(previewRef.current, filename);
      setExportState("done");
    } catch (error) {
      console.error(error);
      setExportError("Neizdevās sagatavot PDF. Mēģiniet vēlreiz.");
      setExportState("error");
    }
  }, [exportState, template.label, values]);

  return (
    <div className="page">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">
            Dģ
          </span>
          <div>
            <p className="eyebrow">Vietēja dokumentu sagatavošana</p>
            <h1>Dokumentu ģenerators</h1>
          </div>
        </div>
        <button
          type="button"
          className="download-button"
          onClick={handleDownload}
          disabled={exportState === "working"}
        >
          {exportState === "working" ? "Sagatavo PDF…" : "Lejupielādēt PDF"}
        </button>
      </header>

      <div className="template-list" role="radiogroup" aria-label="Dokumenta veidne">
        {templates.map((item) => {
          const selected = item.id === template.id;
          return (
            <button
              key={item.id}
              type="button"
              role="radio"
              aria-checked={selected}
              className={selected ? "template-card is-selected" : "template-card"}
              onClick={() => setTemplateId(item.id)}
            >
              {item.label}
            </button>
          );
        })}
      </div>
      <p className="template-description">{template.description}</p>

      <main className="layout">
        <section className="panel" aria-labelledby={`${baseId}-form-title`}>
          <h2 id={`${baseId}-form-title`}>Dokumenta dati</h2>
          <p className="lead">Aizpildiet laukus. Priekšskatījums atjauninās uzreiz.</p>

          <div className="form-grid">
            <div className="name-row">
              {FIELDS.map((field) => (
                <label key={field.name} className="field" htmlFor={`${baseId}-${field.name}`}>
                  <span>{field.label}</span>
                  <input
                    id={`${baseId}-${field.name}`}
                    name={field.name}
                    autoComplete={field.autoComplete}
                    value={form[field.name]}
                    onChange={(event) => updateField(field.name, event.target.value)}
                  />
                </label>
              ))}
            </div>

            <label className="field" htmlFor={`${baseId}-iestade`}>
              <span>Iestāde</span>
              <input
                id={`${baseId}-iestade`}
                name="iestade"
                autoComplete="organization"
                value={form.iestade}
                onChange={(event) => updateField("iestade", event.target.value)}
              />
            </label>

            <label className="field" htmlFor={`${baseId}-datums`}>
              <span>Datums</span>
              <input
                id={`${baseId}-datums`}
                name="datums"
                type="date"
                value={form.datums}
                onChange={(event) => updateField("datums", event.target.value)}
              />
            </label>

            <label className="field" htmlFor={`${baseId}-saturs`}>
              <span>Dokumenta saturs</span>
              <textarea
                id={`${baseId}-saturs`}
                name="saturs"
                rows={9}
                placeholder="Ierakstiet dokumenta tekstu…"
                value={form.saturs}
                onChange={(event) => updateField("saturs", event.target.value)}
              />
            </label>
          </div>

          {exportError ? (
            <p className="form-error" role="alert">
              {exportError}
            </p>
          ) : null}

          <p className="privacy">
            Visi dati paliek šajā pārlūkā. Lietotne nesūta informāciju uz serveri un neizmanto datubāzi.
          </p>
        </section>

        <section className="preview-column" aria-labelledby={`${baseId}-preview-title`}>
          <div className="preview-heading">
            <h2 id={`${baseId}-preview-title`}>Priekšskatījums</h2>
            <p>{template.label}</p>
          </div>
          <div className="preview-scroll">
            <article className="paper" ref={previewRef} aria-label="Sagatavotais dokuments">
              {lines.map((line, index) => {
                const kind = classifyLine(line);
                if (kind === "spacer") {
                  return <div key={index} className="doc-spacer" />;
                }
                if (kind === "title") {
                  return (
                    <h3 key={index} className="doc-title">
                      {line}
                    </h3>
                  );
                }
                return (
                  <p key={index} className="doc-line">
                    {line}
                  </p>
                );
              })}
            </article>
          </div>
        </section>
      </main>
    </div>
  );
}
