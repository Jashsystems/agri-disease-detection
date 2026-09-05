"""
teachable_machine_predict.py
=============================
ALTERNATE PATH — use this INSTEAD of train_model.py + predict.py if you'd
rather train with zero code using Google's Teachable Machine.

Use this if: your laptop struggles to install TensorFlow, or you're short
on time and want a GUI-based training flow instead of running scripts.

HOW TO USE:
1. Go to https://teachablemachine.withgoogle.com/train/image
2. Create one "class" per disease (e.g. "Leaf Blight", "Rust", "Healthy")
3. Upload 30-50 sample images per class (webcam capture also works, but
   uploading your PlantVillage dataset images gives better real results)
4. Click "Train Model" (takes 1-2 minutes in-browser)
5. Click "Export Model" → tab "Tensorflow" → "Keras" → Download
   This downloads a .zip containing:
     - keras_model.h5
     - labels.txt

6. Extract that zip into this ml-model/ folder (same folder as this file)
7. Run: python teachable_machine_predict.py path/to/test_image.jpg

This file exposes the EXACT SAME predict(image) -> {"disease", "confidence"}
function shape as predict.py, so the Backend Lead can import from whichever
file your team actually used — nothing else changes.
"""

import os
import numpy as np
from tensorflow.keras.models import load_model
from PIL import Image, ImageOps
import io

MODEL_PATH = os.path.join(os.path.dirname(__file__), "keras_model.h5")
LABELS_PATH = os.path.join(os.path.dirname(__file__), "labels.txt")

_model = None
_labels = None


def _load_resources():
    global _model, _labels
    if _model is None:
        if not os.path.exists(MODEL_PATH):
            raise FileNotFoundError(
                f"keras_model.h5 not found. Export it from Teachable Machine "
                f"and place it in {os.path.dirname(__file__)}"
            )
        # Teachable Machine's exported models sometimes need compile=False
        # to load cleanly outside their own export environment.
        _model = load_model(MODEL_PATH, compile=False)

    if _labels is None:
        if not os.path.exists(LABELS_PATH):
            raise FileNotFoundError(f"labels.txt not found at {LABELS_PATH}")
        with open(LABELS_PATH, "r") as f:
            # Teachable Machine's labels.txt format is like: "0 Leaf Blight"
            _labels = [line.strip().split(" ", 1)[1] for line in f if line.strip()]


def _preprocess(img: Image.Image) -> np.ndarray:
    """
    Teachable Machine models expect a specific 224x224 center-cropped,
    normalized input. This mirrors their exact preprocessing so predictions
    match what you saw in the Teachable Machine web preview.
    """
    size = (224, 224)
    img = ImageOps.fit(img.convert("RGB"), size, Image.Resampling.LANCZOS)
    arr = np.asarray(img).astype(np.float32)
    normalized = (arr / 127.5) - 1  # Teachable Machine's specific normalization
    return np.expand_dims(normalized, axis=0)


def predict(image_input) -> dict:
    """Same contract as predict.py: predict(image) -> {"disease", "confidence"}."""
    _load_resources()

    if isinstance(image_input, str):
        img = Image.open(image_input)
    elif isinstance(image_input, bytes):
        img = Image.open(io.BytesIO(image_input))
    elif isinstance(image_input, Image.Image):
        img = image_input
    else:
        raise TypeError("image_input must be a file path, bytes, or PIL.Image")

    arr = _preprocess(img)
    predictions = _model.predict(arr, verbose=0)[0]

    best_idx = int(np.argmax(predictions))
    confidence = float(predictions[best_idx]) * 100

    return {
        "disease": _labels[best_idx],
        "confidence": round(confidence, 1),
    }


if __name__ == "__main__":
    import sys
    import json

    if len(sys.argv) != 2:
        print("Usage: python teachable_machine_predict.py path/to/image.jpg")
        sys.exit(1)

    result = predict(sys.argv[1])
    print(json.dumps(result, indent=2))
