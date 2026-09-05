"""
predict.py
==========
THIS IS THE DELIVERABLE FILE — Person 1 hands this to the Backend Lead.

It exposes exactly one function that the backend needs:

    predict(image_path_or_bytes) -> {"disease": str, "confidence": float}

The Backend Lead imports this directly:

    from predict import predict
    result = predict("uploads/farmer_photo.jpg")
    # result = {"disease": "Leaf Blight", "confidence": 91.4}

No other file needs to know HOW the prediction happens — this keeps the
ML piece cleanly swappable (e.g. later replacing MobileNetV2 with a bigger
model) without anyone else's code changing.

REQUIRES: model.h5 and class_labels.json in the same folder
(produced by train_model.py, OR exported from Teachable Machine — see
teachable_machine_predict.py for that alternate path).
"""

import json
import os
import numpy as np
from tensorflow.keras.models import load_model
from tensorflow.keras.preprocessing import image as keras_image
from PIL import Image
import io

IMG_SIZE = (224, 224)
MODEL_PATH = os.path.join(os.path.dirname(__file__), "model.h5")
LABELS_PATH = os.path.join(os.path.dirname(__file__), "class_labels.json")

# ---------------------------------------------------------------------------
# Load model + labels ONCE at import time, not on every prediction.
# Loading a Keras model from disk takes ~1-2 seconds — doing this per-request
# would make the API painfully slow. This module-level load means the model
# stays in memory for the lifetime of the backend process.
# ---------------------------------------------------------------------------
_model = None
_labels = None


def _load_resources():
    global _model, _labels
    if _model is None:
        if not os.path.exists(MODEL_PATH):
            raise FileNotFoundError(
                f"model.h5 not found at {MODEL_PATH}. Run train_model.py first, "
                f"or place your exported model here."
            )
        _model = load_model(MODEL_PATH)

    if _labels is None:
        if not os.path.exists(LABELS_PATH):
            raise FileNotFoundError(
                f"class_labels.json not found at {LABELS_PATH}. This is "
                f"produced automatically by train_model.py."
            )
        with open(LABELS_PATH, "r") as f:
            raw = json.load(f)
            # JSON keys are always strings, convert back to int index -> label
            _labels = {int(k): v for k, v in raw.items()}


def _preprocess(img: Image.Image) -> np.ndarray:
    """Resize + normalize an image exactly the way the model was trained on."""
    img = img.convert("RGB").resize(IMG_SIZE)
    arr = keras_image.img_to_array(img) / 255.0
    arr = np.expand_dims(arr, axis=0)  # model expects a batch dimension
    return arr


def predict(image_input) -> dict:
    """
    Runs disease classification on a single image.

    Parameters
    ----------
    image_input : str | bytes | PIL.Image.Image
        - str: a file path to the image on disk
        - bytes: raw image bytes (e.g. from an uploaded file in FastAPI)
        - PIL.Image.Image: an already-opened image object

    Returns
    -------
    dict: {"disease": str, "confidence": float}
        confidence is a percentage from 0-100, rounded to 1 decimal place.

    Example
    -------
    >>> predict("test_images/blight_sample.jpg")
    {'disease': 'Leaf Blight', 'confidence': 91.4}
    """
    _load_resources()

    if isinstance(image_input, str):
        img = Image.open(image_input)
    elif isinstance(image_input, bytes):
        img = Image.open(io.BytesIO(image_input))
    elif isinstance(image_input, Image.Image):
        img = image_input
    else:
        raise TypeError(
            "image_input must be a file path (str), raw bytes, or a PIL.Image"
        )

    arr = _preprocess(img)
    predictions = _model.predict(arr, verbose=0)[0]  # array of probabilities per class

    best_idx = int(np.argmax(predictions))
    confidence = float(predictions[best_idx]) * 100

    return {
        "disease": _labels[best_idx],
        "confidence": round(confidence, 1),
    }


# ---------------------------------------------------------------------------
# Quick manual test: run `python predict.py path/to/image.jpg` from terminal
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    import sys

    if len(sys.argv) != 2:
        print("Usage: python predict.py path/to/image.jpg")
        sys.exit(1)

    result = predict(sys.argv[1])
    print(json.dumps(result, indent=2))
