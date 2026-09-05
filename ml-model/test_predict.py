"""
test_predict.py
================
Run this AFTER training to confirm predict() actually works before handing
it off to the Backend Lead. This is the "Test it on 5-10 new images" step.

HOW TO USE:
1. Create a folder called `test_images/` (separate from your training `dataset/`
   folder — use images the model has NEVER seen during training).
2. Name each file starting with its true disease label, e.g.:
      test_images/Leaf_Blight_01.jpg
      test_images/Leaf_Blight_02.jpg
      test_images/Rust_01.jpg
      test_images/Healthy_01.jpg
   (The script reads everything before the last underscore as the expected label.)
3. Run: python test_predict.py

It will print a prediction for every test image, whether it was correct,
and an overall accuracy score — this is your proof the model works before
you hand it to the team.
"""

import os
import glob
from predict import predict

TEST_DIR = "test_images"


def guess_true_label(filename: str) -> str:
    """Extracts the expected disease name from a filename like 'Rust_01.jpg'."""
    base = os.path.splitext(os.path.basename(filename))[0]
    parts = base.rsplit("_", 1)
    return parts[0] if len(parts) == 2 else base


def main():
    if not os.path.isdir(TEST_DIR):
        raise FileNotFoundError(
            f"'{TEST_DIR}/' not found. Create it and add 5-10 leaf images "
            f"(not used in training) named like 'DiseaseName_01.jpg'. "
            f"See the instructions at the top of this file."
        )

    image_paths = sorted(
        glob.glob(os.path.join(TEST_DIR, "*.jpg"))
        + glob.glob(os.path.join(TEST_DIR, "*.jpeg"))
        + glob.glob(os.path.join(TEST_DIR, "*.png"))
    )

    if not image_paths:
        raise FileNotFoundError(f"No images found in '{TEST_DIR}/'.")

    print(f"Running predictions on {len(image_paths)} test images...\n")
    print(f"{'File':<30} {'Expected':<20} {'Predicted':<20} {'Confidence':<12} {'Result'}")
    print("-" * 100)

    correct = 0
    for path in image_paths:
        expected = guess_true_label(path)
        result = predict(path)
        predicted = result["disease"]
        confidence = result["confidence"]

        is_correct = predicted.lower() == expected.lower()
        correct += is_correct

        mark = "✅" if is_correct else "❌"
        print(
            f"{os.path.basename(path):<30} {expected:<20} {predicted:<20} "
            f"{confidence:<12} {mark}"
        )

    accuracy = correct / len(image_paths) * 100
    print("-" * 100)
    print(f"\nAccuracy on test images: {correct}/{len(image_paths)} ({accuracy:.1f}%)")

    if accuracy < 60:
        print(
            "\n⚠️  Accuracy is low. For the demo, hand-pick your live test images "
            "to be clear, well-lit, and visually similar to your training set — "
            "or add more training images per class if there's time."
        )
    else:
        print("\n✅ Good enough for a prototype demo. Hand off predict.py, model.h5, "
              "and class_labels.json to the Backend Lead.")


if __name__ == "__main__":
    main()
