import { useState } from "react";
import "./index.css";

const API_URL = "http://127.0.0.1:8000";

const CROP = "Tomato";

const STAGES = [
  "Seedling",
  "Vegetative",
  "Flowering",
  "Fruiting",
  "Mature",
];

const VILLAGES = [
  {
    name: "Pune",
    lat: 18.5204,
    lng: 73.8567,
  },
  {
    name: "Nashik",
    lat: 20.0059,
    lng: 73.791,
  },
  {
    name: "Nagpur",
    lat: 21.1458,
    lng: 79.0882,
  },
];

async function uploadReport({
  crop,
  stage,
  village,
  imageFile,
}) {
  const formData = new FormData();

  formData.append("crop", crop);
  formData.append("stage", stage);
  formData.append("village", village.name);
  formData.append("lat", village.lat);
  formData.append("lng", village.lng);
  formData.append("image_file", imageFile);

  const response = await fetch(`${API_URL}/upload-report`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error || "Upload failed");
  }

  return response.json();
}

function App() {
  const [page, setPage] = useState("home");
  const [report, setReport] = useState(null);

  return (
    <div className="app">
      <Header />

      {page === "home" && (
        <HomePage
          onStart={() => setPage("upload")}
        />
      )}

      {page === "upload" && (
        <UploadPage
          onBack={() => setPage("home")}
          onSuccess={(data) => {
            setReport(data);
            setPage("result");
          }}
        />
      )}

      {page === "result" && (
        <ResultPage
          report={report}
          onNewReport={() => {
            setReport(null);
            setPage("upload");
          }}
          onHome={() => {
            setReport(null);
            setPage("home");
          }}
        />
      )}
    </div>
  );
}


// ==================================================
// HEADER
// ==================================================

function Header() {
  return (
    <header className="header">
      <div>
        <h1>AgriGuard</h1>
        <p>Crop Disease Detection & Advisory</p>
      </div>

      <div className="header-status">
        <span className="status-dot"></span>
        System Online
      </div>
    </header>
  );
}


// ==================================================
// HOME
// ==================================================

function HomePage({ onStart }) {
  return (
    <main className="page home-page">
      <div className="hero">
        <div className="hero-badge">
          🌱 Smart Agriculture
        </div>

        <h2>
          Detect crop diseases
          <br />
          <span>before they spread.</span>
        </h2>

        <p>
          Upload a photo of a tomato leaf and our AI system
          will analyze it, assess the confidence, and provide
          an actionable advisory.
        </p>

        <button
          className="primary-button large"
          onClick={onStart}
        >
          Upload Crop Image →
        </button>
      </div>

      <div className="feature-grid">
        <Feature
          icon="📷"
          title="AI Detection"
          text="Analyze crop images using our trained disease detection model."
        />

        <Feature
          icon="⚠️"
          title="Risk Assessment"
          text="Low-confidence cases are automatically sent for expert review."
        />

        <Feature
          icon="📋"
          title="Actionable Advisory"
          text="Receive practical recommendations based on the detected disease."
        />
      </div>
    </main>
  );
}

function Feature({ icon, title, text }) {
  return (
    <div className="feature-card">
      <div className="feature-icon">
        {icon}
      </div>

      <h3>{title}</h3>

      <p>{text}</p>
    </div>
  );
}


// ==================================================
// UPLOAD PAGE
// ==================================================

function UploadPage({ onBack, onSuccess }) {
  const [stage, setStage] = useState("");
  const [village, setVillage] = useState(VILLAGES[0]);

  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function handleFile(file) {
    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setError("Please select an image file.");
      return;
    }

    setError("");
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  function handleDrop(event) {
    event.preventDefault();

    setDragging(false);

    const file = event.dataTransfer.files[0];

    handleFile(file);
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!imageFile) {
      setError("Please upload a crop image.");
      return;
    }

    if (!stage) {
      setError("Please select the growth stage.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const result = await uploadReport({
        crop: CROP,
        stage,
        village,
        imageFile,
      });

      // Keep the browser-local preview for the result page.
      result.localImage = imagePreview;

      onSuccess(result);
    } catch (err) {
      console.error(err);

      setError(
        "Could not connect to the disease detection server. Make sure FastAPI is running."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="page">
      <button
        className="back-button"
        onClick={onBack}
      >
        ← Back
      </button>

      <div className="section-heading">
        <div className="hero-badge">
          Disease Report
        </div>

        <h2>Upload your crop image</h2>

        <p>
          Provide a clear photo of the affected tomato
          leaf for AI analysis.
        </p>
      </div>

      <form
        className="upload-layout"
        onSubmit={handleSubmit}
      >

        {/* IMAGE UPLOAD */}

        <div
          className={`drop-zone ${
            dragging ? "dragging" : ""
          } ${imagePreview ? "has-image" : ""}`}
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => {
            setDragging(false);
          }}
          onDrop={handleDrop}
        >

          {imagePreview ? (
            <>
              <img
                src={imagePreview}
                alt="Uploaded tomato leaf"
                className="image-preview"
              />

              <button
                type="button"
                className="secondary-button"
                onClick={() => {
                  setImageFile(null);
                  setImagePreview(null);
                }}
              >
                Choose another image
              </button>
            </>
          ) : (
            <>
              <div className="upload-icon">
                📷
              </div>

              <h3>
                Drop your crop image here
              </h3>

              <p>or</p>

              <label className="secondary-button">
                Browse image

                <input
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(event) =>
                    handleFile(event.target.files[0])
                  }
                />
              </label>

              <small>
                JPG, PNG or WEBP
              </small>
            </>
          )}
        </div>


        {/* FORM */}

        <div className="form-card">

          <h3>
            Crop information
          </h3>

          <label>
            Crop

            <div className="fixed-field">
              🍅 Tomato
            </div>
          </label>

          <label>
            Growth stage

            <select
              value={stage}
              onChange={(event) =>
                setStage(event.target.value)
              }
            >
              <option value="">
                Select stage
              </option>

              {STAGES.map((item) => (
                <option
                  key={item}
                  value={item}
                >
                  {item}
                </option>
              ))}
            </select>
          </label>

          <label>
            Village / Location

            <select
              value={village.name}
              onChange={(event) => {
                const selected = VILLAGES.find(
                  (item) =>
                    item.name === event.target.value
                );

                setVillage(selected);
              }}
            >
              {VILLAGES.map((item) => (
                <option
                  key={item.name}
                  value={item.name}
                >
                  {item.name}
                </option>
              ))}
            </select>
          </label>

          {error && (
            <div className="error-box">
              {error}
            </div>
          )}

          <button
            className="primary-button"
            type="submit"
            disabled={loading}
          >
            {loading
              ? "Analyzing crop..."
              : "Analyze Crop →"}
          </button>
        </div>
      </form>
    </main>
  );
}


// ==================================================
// RESULT PAGE
// ==================================================

function ResultPage({
  report,
  onNewReport,
  onHome,
}) {
  if (!report) {
    return null;
  }

  const highConfidence =
    Number(report.confidence) > 80;

  const confidence =
    Number(report.confidence) || 0;

  return (
    <main className="page">

      <div className="section-heading">
        <div className="hero-badge">
          Analysis Complete
        </div>

        <h2>
          Crop analysis result
        </h2>

        <p>
          Report ID:{" "}
          <strong>
            {report.report_id}
          </strong>
        </p>
      </div>

      <div className="result-grid">

        {/* IMAGE */}

        <div className="result-image-card">

          {report.localImage && (
            <img
              src={report.localImage}
              alt="Uploaded tomato leaf"
              className="result-image"
            />
          )}

          <div className="image-meta">
            <span>
              🍅 {report.crop}
            </span>

            <span>
              {report.stage}
            </span>

            <span>
              {report.location?.village}
            </span>
          </div>
        </div>


        {/* RESULT */}

        <div className="result-card">

          <div className="result-status">
            <span
              className={`status-pill ${
                highConfidence
                  ? "high"
                  : "review"
              }`}
            >
              {highConfidence
                ? "✓ AI Diagnosis"
                : "⏳ Expert Review"}
            </span>
          </div>

          <h3>
            {formatDiseaseName(
              report.disease
            )}
          </h3>

          <div className="confidence">

            <div className="confidence-header">
              <span>
                AI Confidence
              </span>

              <strong>
                {confidence.toFixed(1)}%
              </strong>
            </div>

            <div className="confidence-bar">
              <div
                className="confidence-fill"
                style={{
                  width: `${Math.min(
                    confidence,
                    100
                  )}%`,
                }}
              />
            </div>
          </div>


          {/* ADVISORY */}

          {highConfidence &&
          report.advisory ? (
            <div className="advisory">

              <h4>
                Recommended action
              </h4>

              <p>
                {report.advisory.what_it_is}
              </p>

              <ul>
                {report.advisory.what_to_do?.map(
                  (item, index) => (
                    <li key={index}>
                      {item}
                    </li>
                  )
                )}
              </ul>

              <div className="dosage">
                <strong>
                  Safety:
                </strong>{" "}
                {report.advisory.safe_dosage}
              </div>
            </div>
          ) : (
            <div className="review-box">

              <h4>
                Case sent for expert review
              </h4>

              <p>
                The AI confidence is below the
                automatic-treatment threshold.
                An agricultural officer will
                review this case before an
                advisory is issued.
              </p>
            </div>
          )}


          <div className="result-actions">

            <button
              className="secondary-button"
              onClick={onNewReport}
            >
              New Report
            </button>

            <button
              className="primary-button"
              onClick={onHome}
            >
              Back to Home
            </button>

          </div>

        </div>
      </div>
    </main>
  );
}


// ==================================================
// HELPERS
// ==================================================

function formatDiseaseName(name) {
  if (!name) {
    return "Unknown";
  }

  return name
    .replaceAll("_", " ")
    .replace(/\s+/g, " ")
    .trim();
}

export default App;
