"""
train_model.py
================
Trains a crop-disease image classifier using transfer learning on MobileNetV2.

WHY MOBILENETV2 + TRANSFER LEARNING (and not training from scratch):
- We only have ~30-50 images per class. Training a CNN from scratch on that
  little data will not generalize — it will just memorize the training set.
- MobileNetV2 is pretrained on ImageNet (1.4M images). We reuse its learned
  ability to recognize edges, textures, and shapes, and only train a small
  classification head on top. This works well even with small datasets and
  trains in minutes on a CPU.

HOW TO USE:
1. Download the PlantVillage dataset from Kaggle:
   https://www.kaggle.com/datasets/emmarex/plantdisease
   (or any similarly-structured leaf disease dataset)

2. Arrange your images into this folder structure inside `dataset/`:

   dataset/
   ├── Leaf_Blight/
   │   ├── img1.jpg
   │   ├── img2.jpg
   │   └── ... (30-50 images)
   ├── Powdery_Mildew/
   │   ├── img1.jpg
   │   └── ...
   ├── Bacterial_Wilt/
   │   └── ...
   ├── Rust/
   │   └── ...
   ├── Aphid_Infestation/
   │   └── ...
   └── Healthy/
       └── ...

   IMPORTANT: folder names become your disease labels exactly as typed,
   so keep them consistent with what's used in your advisory dictionary
   in risk-logic/advisory_data.py

3. Run:  python train_model.py

4. This produces two files you need for the rest of the team:
   - model.h5           → the trained model
   - class_labels.json  → maps model output index -> disease name

Both files go in this same ml-model/ folder and are picked up automatically
by predict.py
"""

import os
import json
import tensorflow as tf
from tensorflow.keras import layers, models
from tensorflow.keras.applications import MobileNetV2
from tensorflow.keras.preprocessing.image import ImageDataGenerator

# ---------------------------------------------------------------------------
# CONFIG — adjust if needed, but these defaults work well for small datasets
# ---------------------------------------------------------------------------
DATASET_DIR = "dataset"
IMG_SIZE = (224, 224)          # MobileNetV2's expected input size
BATCH_SIZE = 8                  # small batch size suits small datasets
EPOCHS = 15
MODEL_OUTPUT_PATH = "model.h5"
LABELS_OUTPUT_PATH = "class_labels.json"


def build_data_generators():
    """
    Loads images from DATASET_DIR, automatically splits into train/validation,
    and applies data augmentation (rotation, flip, zoom) so the small dataset
    behaves like a larger one — this is what prevents overfitting on 30-50
    images per class.
    """
    datagen = ImageDataGenerator(
        rescale=1.0 / 255,
        rotation_range=25,
        width_shift_range=0.15,
        height_shift_range=0.15,
        shear_range=0.1,
        zoom_range=0.2,
        horizontal_flip=True,
        validation_split=0.2,  # 80% train, 20% validation
    )

    train_gen = datagen.flow_from_directory(
        DATASET_DIR,
        target_size=IMG_SIZE,
        batch_size=BATCH_SIZE,
        class_mode="categorical",
        subset="training",
        shuffle=True,
    )

    val_gen = datagen.flow_from_directory(
        DATASET_DIR,
        target_size=IMG_SIZE,
        batch_size=BATCH_SIZE,
        class_mode="categorical",
        subset="validation",
        shuffle=False,
    )

    return train_gen, val_gen


def build_model(num_classes):
    """
    Builds MobileNetV2 with its pretrained ImageNet weights, freezes those
    weights (so we don't destroy what it already learned), and adds a small
    trainable classification head on top for our specific disease classes.
    """
    base_model = MobileNetV2(
        input_shape=(*IMG_SIZE, 3),
        include_top=False,       # drop MobileNetV2's original ImageNet classifier
        weights="imagenet",
    )
    base_model.trainable = False  # freeze the pretrained feature extractor

    model = models.Sequential([
        base_model,
        layers.GlobalAveragePooling2D(),
        layers.Dense(128, activation="relu"),
        layers.Dropout(0.3),  # reduces overfitting on our small dataset
        layers.Dense(num_classes, activation="softmax"),
    ])

    model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=0.001),
        loss="categorical_crossentropy",
        metrics=["accuracy"],
    )
    return model


def main():
    if not os.path.isdir(DATASET_DIR):
        raise FileNotFoundError(
            f"'{DATASET_DIR}/' not found. Create it and add one subfolder per "
            f"disease class, each containing 30-50 leaf images. See the "
            f"instructions at the top of this file."
        )

    print("Loading and augmenting dataset...")
    train_gen, val_gen = build_data_generators()

    class_indices = train_gen.class_indices  # e.g. {"Leaf_Blight": 0, "Rust": 1, ...}
    labels_by_index = {v: k for k, v in class_indices.items()}
    num_classes = len(class_indices)

    print(f"Found {num_classes} classes: {list(class_indices.keys())}")
    if num_classes < 2:
        raise ValueError("Need at least 2 disease classes (folders) to train a classifier.")

    print("Building model (MobileNetV2 + custom head)...")
    model = build_model(num_classes)
    model.summary()

    print(f"Training for {EPOCHS} epochs...")
    history = model.fit(
        train_gen,
        validation_data=val_gen,
        epochs=EPOCHS,
    )

    final_val_acc = history.history["val_accuracy"][-1]
    print(f"\nFinal validation accuracy: {final_val_acc:.2%}")
    if final_val_acc < 0.6:
        print(
            "⚠️  Validation accuracy is low. This is expected with very small "
            "datasets. For a prototype demo this is still usable — just make "
            "sure your demo test images are clear, well-lit photos similar in "
            "style to your training images. More images per class = better "
            "accuracy if you have time."
        )

    model.save(MODEL_OUTPUT_PATH)
    with open(LABELS_OUTPUT_PATH, "w") as f:
        json.dump(labels_by_index, f, indent=2)

    print(f"\n✅ Saved model to '{MODEL_OUTPUT_PATH}'")
    print(f"✅ Saved class labels to '{LABELS_OUTPUT_PATH}'")
    print("\nHand these two files + predict.py to the Backend Lead.")


if __name__ == "__main__":
    main()
