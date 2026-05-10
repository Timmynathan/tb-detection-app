import { useEffect, useRef, useState } from 'react';
import './App.css';
import chestXrayImage from './assets/chest-xray.png';

const typingTexts = [

  'AI-Powered Tuberculosis Detection',

  'Deep Learning Chest X-ray Analysis',

  'Real-Time AI Diagnostic Assistance',

  'DenseNet121 Medical Imaging System',

];

export default function App() {
  const fileInputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [confidence, setConfidence] = useState(null);
  const [heatmapUrl, setHeatmapUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');


  const [displayText, setDisplayText] = useState('');
  const [textIndex, setTextIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const currentText = typingTexts[textIndex];

    const timeout = setTimeout(() => {
      if (!isDeleting) {
        setDisplayText(currentText.substring(0, charIndex + 1));
        setCharIndex((prev) => prev + 1);

        if (charIndex === currentText.length) {
          setTimeout(() => {
            setIsDeleting(true);
          }, 1200);
        }
      } else {
        setDisplayText(currentText.substring(0, charIndex - 1));
        setCharIndex((prev) => prev - 1);

        if (charIndex === 0) {
          setIsDeleting(false);
          setTextIndex((prev) => (prev + 1) % typingTexts.length);
        }
      }
    }, isDeleting ? 40 : 75);

    return () => clearTimeout(timeout);
  }, [charIndex, isDeleting, textIndex]);

  const handleBrowseClick = () => {
    fileInputRef.current.click();
  };

  const handleFileChange = (event) => {
    const file = event.target.files[0];

    if (!file) {
      return;
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setPrediction(null);
    setConfidence(null);
    setHeatmapUrl(null);
    setError('');
  };

  const handleAnalyzeImage = async () => {
    if (!selectedFile) {
      setError('Please upload a chest X-ray image first.');
      return;
    }

    const formData = new FormData();
    formData.append('image', selectedFile);

    setLoading(true);
    setError('');
    setPrediction(null);
    setConfidence(null);
    setHeatmapUrl(null);

    try {
      const response = await fetch('http://127.0.0.1:5000/predict', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Prediction failed. Please try again.');
      }

      setPrediction(data.prediction);
      setConfidence(data.confidence);
      setHeatmapUrl(data.heatmap_url);
    } catch (err) {
      setError(err.message || 'Unable to connect to the prediction server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app">
      <div className="background-grid" />

      <nav className="navbar">
        <div className="brand">
          <div className="logo">⌁</div>
          <div>
            <h1>TB Detect AI</h1>
            <span>Chest X-ray Screening Assistant</span>
          </div>
        </div>

        <div className="nav-links">
          <a href="#home">Home</a>
          <a href="#about">About</a>
          <a href="#contact">Contact</a>
        </div>
      </nav>

      <section className="hero" id="home">
        <div className="hero-content">
          <div className="lung-icon">🩺</div>

          <h2 className="typing-heading">
            {displayText}
            <span className="typing-cursor">|</span>
          </h2>

          <p>
            Upload a chest X-ray image to analyze possible tuberculosis findings
            using advanced deep learning technology.
          </p>

          <div className="badges">
            <span>Real-time Analysis</span>
            <span>94% Accuracy</span>
          </div>
        </div>

        <div className="xray-card">
          <div className="card-label">
            <span className="pulse-dot" />
            X-Ray Analysis
          </div>

          <div className="xray-placeholder">
            <div className="scan-line" />
            <img
              src={chestXrayImage}
              alt="Chest X-ray scan preview"
              className="hero-xray-image"
            />
            <p>Chest X-Ray Scan</p>
          </div>

          <div className="status-row">
            <span>STATUS:</span>
            <strong>READY</strong>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="glass-card upload-card">
          <h3>Upload Chest X-Ray</h3>

          <div className="upload-box">
            {previewUrl ? (
              <div className="image-preview-wrap">
                <img src={previewUrl} alt="Selected chest X-ray preview" className="image-preview" />
                <p className="selected-file-name">{selectedFile.name}</p>
              </div>
            ) : (
              <>
                <div className="upload-icon">
                  <span className="minimal-arrow" />
                </div>
                <h4>Drag and drop your X-ray image here</h4>
                <p>or</p>
              </>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.dcm"
              onChange={handleFileChange}
              className="file-input"
            />

            <button type="button" onClick={handleBrowseClick}>Browse Files</button>
            <small>Supported formats: JPG, PNG, DICOM</small>
          </div>

          {error && <p className="error-message">{error}</p>}

          <button
            type="button"
            className="analyze-btn"
            onClick={handleAnalyzeImage}
            disabled={loading}
          >
            {loading ? 'Analyzing Image...' : 'Analyze Image'}
          </button>
        </div>
      </section>

      <section className="section">
        <div className="glass-card result-card">
          <div>
            <h3>Prediction Result</h3>
            <h2 className={`result-text ${prediction === 'TB Detected' ? 'tb-result' : ''}`}>
              {prediction || 'Awaiting Analysis'}
            </h2>
            <p>
              {confidence !== null
                ? `Confidence: ${confidence}%`
                : 'Upload an X-ray image and click Analyze Image.'}
            </p>
          </div>

          <div className="confidence-area">
            <div className="confidence-label">
              <span>Confidence Level</span>
              <span>{confidence !== null ? `${confidence}%` : '0%'}</span>
            </div>
            <div className="progress-bar">
              <div
                className={`progress-fill ${prediction === 'TB Detected' ? 'tb-progress' : ''}`}
                style={{ width: confidence !== null ? `${confidence}%` : '0%' }}
              />
            </div>
          </div>
        </div>
      </section>

      {heatmapUrl && (
        <section className="section">
          <div className="glass-card gradcam-card">
            <h3>Grad-CAM Visualization</h3>
            <p className="gradcam-description">
              Highlighted regions indicate the areas of the chest X-ray that influenced the model’s prediction.
            </p>

            <div className="gradcam-single-panel expanded-heatmap-panel">
              <h4>Model Attention Heatmap</h4>
              <img
                src={heatmapUrl}
                alt="Grad-CAM heatmap"
                className="gradcam-large-image expanded-heatmap-image"
              />
            </div>
          </div>
        </section>
      )}

      <section className="section" id="about">
        <div className="glass-card">
          <h3>Model Performance</h3>
          <p className="auc-text">
            AUC: <strong>0.99</strong>
          </p>

          <div className="metrics-grid">
            <div className="metric-card">
              <p>Accuracy</p>
              <h4>94%</h4>
            </div>
            <div className="metric-card">
              <p>Precision</p>
              <h4>95%</h4>
            </div>
            <div className="metric-card">
              <p>Recall</p>
              <h4>94%</h4>
            </div>
            <div className="metric-card">
              <p>F1-Score</p>
              <h4>94%</h4>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="disclaimer-card">
          <div className="warning-icon">⚠️</div>
          <div>
            <h3>Medical Disclaimer</h3>
            <p>
              This AI-based tuberculosis detection system is intended for
              educational and research purposes only and should not replace
              professional medical diagnosis. Always consult qualified healthcare
              professionals for accurate diagnosis and treatment decisions.
            </p>
          </div>
        </div>
      </section>

      <footer className="footer" id="contact">
        <div className="footer-grid">
          <div>
            <h4>About This Project</h4>
            <p>
              AI-Based TB Detection System using deep learning for automated
              tuberculosis screening from chest X-rays.
            </p>
          </div>

          <div>
            <h4>Institution</h4>
            <p>Pan-Atlantic University<br />Final Year Project</p>
          </div>

          <div>
            <h4>Contact</h4>
            <p>Project documentation and source code available on request.</p>
          </div>
        </div>

        <p className="copyright">
          © 2026 AI-Based TB Detection System. All rights reserved.
        </p>
      </footer>
    </div>
  );
}