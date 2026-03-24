"use client";

import { useEffect, useState } from "react";
import { FormSubmitButton } from "@/components/form-submit-button";

type OwnerOption = {
  id: string;
  label: string;
};

type CarSuggestion = {
  brand: string;
  model: string;
  series: string;
  modelYear: string;
  category: string;
  className: string;
  nickname: string;
  confidence: string;
  summary: string;
};

type IdentifyResponse = {
  ok: boolean;
  message?: string;
  suggestion?: CarSuggestion;
};

export function CarCreationForm({
  action,
  ownerOptions = [],
  fixedOwnerRacerId,
  submitLabel,
  pendingLabel,
}: Readonly<{
  action: (formData: FormData) => void | Promise<void>;
  ownerOptions?: OwnerOption[];
  fixedOwnerRacerId?: string;
  submitLabel: string;
  pendingLabel: string;
}>) {
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [nickname, setNickname] = useState("");
  const [series, setSeries] = useState("");
  const [modelYear, setModelYear] = useState("");
  const [category, setCategory] = useState("");
  const [className, setClassName] = useState("");
  const [notes, setNotes] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [identifyPending, setIdentifyPending] = useState(false);
  const [identifyMessage, setIdentifyMessage] = useState<string | null>(null);
  const [identifyTone, setIdentifyTone] = useState<"success" | "error" | null>(null);
  const [suggestionSummary, setSuggestionSummary] = useState<string | null>(null);

  useEffect(() => {
    if (!photoFile) {
      setPreviewUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(photoFile);
    setPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [photoFile]);

  async function handleIdentifyFromPhoto() {
    if (!photoFile) {
      setIdentifyTone("error");
      setIdentifyMessage("Add a car photo first");
      return;
    }

    setIdentifyPending(true);
    setIdentifyTone(null);
    setIdentifyMessage(null);

    try {
      const formData = new FormData();
      formData.set("photo", photoFile);

      const response = await fetch("/api/car-identify", {
        method: "POST",
        body: formData,
      });
      const payload = (await response.json()) as IdentifyResponse;

      if (!response.ok || !payload.ok || !payload.suggestion) {
        throw new Error(payload.message ?? "Unable to identify the car from this photo");
      }

      const suggestion = payload.suggestion;
      setBrand(suggestion.brand || brand);
      setModel(suggestion.model || model);
      setSeries(suggestion.series || series);
      setModelYear(suggestion.modelYear || modelYear);
      setCategory(suggestion.category || category);
      setClassName(suggestion.className || className);
      setNickname((current) => current || suggestion.nickname || "");
      setSuggestionSummary(suggestion.summary || null);
      setIdentifyTone("success");
      setIdentifyMessage(
        `Model identified${suggestion.confidence ? ` (${suggestion.confidence} confidence)` : ""}`,
      );
    } catch (error) {
      setIdentifyTone("error");
      setIdentifyMessage(error instanceof Error ? error.message : "Unable to identify the car");
    } finally {
      setIdentifyPending(false);
    }
  }

  return (
    <form action={action} className="event-create-form">
      {fixedOwnerRacerId ? (
        <input name="ownerRacerId" type="hidden" value={fixedOwnerRacerId} />
      ) : (
        <label className="form-field">
          <span>Owner</span>
          <select defaultValue="" name="ownerRacerId" required>
            <option disabled value="">
              Select owner
            </option>
            {ownerOptions.map((owner) => (
              <option key={owner.id} value={owner.id}>
                {owner.label}
              </option>
            ))}
          </select>
        </label>
      )}

      <div className="form-note form-field-span-full car-photo-panel">
        <div className="car-photo-header">
          <div>
            <p className="list-title">Photo identify</p>
            <p className="list-meta">
              Use your camera or library to suggest the die-cast brand and model, then confirm before saving.
            </p>
          </div>
          <button
            className="button secondary compact-button"
            disabled={identifyPending}
            onClick={handleIdentifyFromPhoto}
            type="button"
          >
            {identifyPending ? "Identifying..." : "Identify From Photo"}
          </button>
        </div>

        <div className="car-photo-grid">
          <label className="form-field">
            <span>Car photo</span>
            <input
              accept="image/*"
              capture="environment"
              onChange={(event) => {
                setPhotoFile(event.target.files?.[0] ?? null);
                setIdentifyMessage(null);
                setIdentifyTone(null);
                setSuggestionSummary(null);
              }}
              type="file"
            />
          </label>

          {previewUrl ? (
            <div className="car-photo-preview">
              <img alt="Selected car preview" src={previewUrl} />
            </div>
          ) : (
            <div className="car-photo-preview placeholder">
              <span>Camera preview appears here</span>
            </div>
          )}
        </div>

        {identifyMessage ? (
          <div className={identifyTone === "success" ? "flash-banner success" : "flash-banner error"}>
            {identifyMessage}
          </div>
        ) : null}
        {suggestionSummary ? <p className="list-meta">{suggestionSummary}</p> : null}
      </div>

      <label className="form-field">
        <span>Nickname</span>
        <input name="nickname" onChange={(event) => setNickname(event.target.value)} required type="text" value={nickname} />
      </label>
      <label className="form-field">
        <span>Brand</span>
        <input name="brand" onChange={(event) => setBrand(event.target.value)} required type="text" value={brand} />
      </label>
      <label className="form-field">
        <span>Model</span>
        <input name="model" onChange={(event) => setModel(event.target.value)} required type="text" value={model} />
      </label>
      <label className="form-field">
        <span>Series</span>
        <input name="series" onChange={(event) => setSeries(event.target.value)} type="text" value={series} />
      </label>
      <label className="form-field">
        <span>Model year</span>
        <input
          inputMode="numeric"
          name="modelYear"
          onChange={(event) => setModelYear(event.target.value)}
          type="text"
          value={modelYear}
        />
      </label>
      <label className="form-field">
        <span>Category</span>
        <input name="category" onChange={(event) => setCategory(event.target.value)} type="text" value={category} />
      </label>
      <label className="form-field">
        <span>Class</span>
        <input name="className" onChange={(event) => setClassName(event.target.value)} type="text" value={className} />
      </label>
      <label className="form-field">
        <span>Status</span>
        <select defaultValue="race_ready" name="status">
          <option value="inspection">Inspection</option>
          <option value="checked_in">Checked In</option>
          <option value="race_ready">Race Ready</option>
        </select>
      </label>
      <label className="form-field form-field-span-full">
        <span>Notes</span>
        <textarea name="notes" onChange={(event) => setNotes(event.target.value)} rows={3} value={notes} />
      </label>
      <FormSubmitButton
        className="button primary compact-button"
        idleLabel={submitLabel}
        pendingLabel={pendingLabel}
      />
    </form>
  );
}
