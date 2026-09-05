"""
advisory_data.py
================
Hardcoded advisory content — no weather API, no external lookups.
 
Disease names here MUST exactly match the keys in class_labels.json
produced by train_model.py. Call `validate_against_labels()` once at
backend startup (see usage note at the bottom) so a mismatch is caught
immediately at boot, not discovered later as a silent wrong-advice bug.
 
Trained classes (from PlantVillage, tomato + potato crops):
  Bacterial_Spot, Early_Blight, Late_Blight, Leaf_Mold, Healthy
 
SAFETY NOTE: The dosages below are general reference figures, not a
substitute for the product label or a local agricultural extension
officer's recommendation. Actual safe dosage depends on the specific
formulation, crop stage, and local regulations. DISCLAIMER is surfaced
in every advisory response so this isn't buried in a code comment only
developers see.
"""
 
import logging
 
logger = logging.getLogger(__name__)
 
DISCLAIMER = (
    "General guidance only — always confirm against the product label "
    "and your local agricultural extension officer before applying any "
    "treatment."
)
 
ADVISORY_DB = {
    "Bacterial_Spot": {
        "what_it_is": "A bacterial infection causing small, dark, water-soaked spots on leaves and fruit, spreading rapidly in warm, wet weather.",
        "what_to_do": [
            "Remove and destroy infected leaves and fruit immediately",
            "Avoid overhead watering — water at the base of the plant instead",
            "Rotate crops next season; do not replant tomato/pepper in the same soil",
        ],
        "safe_dosage": "Copper oxychloride 50% WP — 3g per litre of water, spray every 7-10 days",
    },
    "Early_Blight": {
        "what_it_is": "A fungal disease causing dark concentric-ring spots on older leaves first, gradually moving upward and reducing yield if untreated.",
        "what_to_do": [
            "Remove lower infected leaves to slow upward spread",
            "Mulch around the base to prevent soil-borne spores splashing onto leaves",
            "Apply fungicide at first sign of spotting, especially after rain",
        ],
        "safe_dosage": "Mancozeb 75% WP — 2.5g per litre of water, spray every 10 days",
    },
    "Late_Blight": {
        "what_it_is": "A fast-spreading fungal-like disease (the same pathogen behind the Irish potato famine) that causes large, dark, water-soaked lesions and can destroy a field within days in cool, wet conditions.",
        "what_to_do": [
            "Act immediately — this spreads faster than other leaf diseases",
            "Remove and destroy all infected plants, do not compost them",
            "Improve field drainage and spacing to reduce humidity around plants",
        ],
        "safe_dosage": "Metalaxyl + Mancozeb combination — 2.5g per litre of water, spray every 7 days during outbreak risk",
    },
    "Leaf_Mold": {
        "what_it_is": "A fungal disease common in humid, poorly-ventilated conditions (especially greenhouses/polyhouses), causing pale yellow spots on top of leaves and olive-green mold underneath.",
        "what_to_do": [
            "Improve ventilation and reduce humidity around plants",
            "Space plants further apart to increase airflow",
            "Remove and destroy affected leaves promptly",
        ],
        "safe_dosage": "Chlorothalonil 75% WP — 2g per litre of water, spray every 10 days",
    },
    "Healthy": {
        "what_it_is": "No visible disease symptoms detected — the crop appears healthy.",
        "what_to_do": [
            "Continue regular monitoring, especially after rain or humidity spikes",
            "Maintain current watering and fertilization schedule",
            "Re-check in 5-7 days or sooner if any new spots or wilting appear",
        ],
        "safe_dosage": "No treatment needed at this time",
    },
}
 
_FALLBACK_ADVISORY = {
    "what_it_is": "Diagnosis unclear — this case has been sent for expert review.",
    "what_to_do": ["Await officer confirmation before taking action"],
    "safe_dosage": "Not applicable until confirmed",
}
 
 
def get_advisory(disease_name: str) -> dict:
    """
    Looks up advisory content for a predicted disease.
 
    Falls back to a safe default if the model returns an unrecognized
    label. Unlike before, this now logs a warning on every fallback hit —
    a mismatch between class_labels.json and this file should be a loud,
    searchable event in your logs, not a silent wrong answer to a farmer.
    """
    entry = ADVISORY_DB.get(disease_name)
 
    if entry is None:
        logger.warning(
            "advisory_data: no advisory entry for disease label %r — "
            "check for drift between class_labels.json and ADVISORY_DB",
            disease_name,
        )
        entry = _FALLBACK_ADVISORY
 
    return {**entry, "disclaimer": DISCLAIMER}
 
 
def validate_against_labels(class_labels: dict) -> None:
    """
    Call this once at backend startup with the loaded class_labels.json
    (e.g. `{0: "Bacterial_Spot", 1: "Early_Blight", ...}`).
 
    Raises ValueError immediately if any label the model can actually
    predict has no matching advisory entry. This turns a "silent wrong
    advice in production" failure into a "server won't start" failure —
    much cheaper to catch.
 
    Example (in main.py, after loading the model):
        from predict import _labels  # or however you expose it
        from advisory_data import validate_against_labels
        validate_against_labels(_labels)
    """
    model_labels = set(class_labels.values())
    advisory_labels = set(ADVISORY_DB.keys())
 
    missing = model_labels - advisory_labels
    if missing:
        raise ValueError(
            f"advisory_data.py is missing entries for model labels: {missing}. "
            f"Add them to ADVISORY_DB before deploying, or the API will "
            f"silently return generic 'diagnosis unclear' advice for these."
        )
 
    unused = advisory_labels - model_labels
    if unused:
        # Not fatal — just means ADVISORY_DB has extra entries the current
        # model never predicts (e.g. leftover from an older label set).
        logger.info(
            "advisory_data: entries unused by current model labels: %s",
            unused,
        )
 
 
if __name__ == "__main__":
    # Quick self-check: run `python advisory_data.py` to confirm every
    # entry has the required keys before you ship it.
    required_keys = {"what_it_is", "what_to_do", "safe_dosage"}
    for disease, entry in ADVISORY_DB.items():
        missing_keys = required_keys - entry.keys()
        assert not missing_keys, f"{disease} is missing keys: {missing_keys}"
        assert isinstance(entry["what_to_do"], list) and entry["what_to_do"], (
            f"{disease} what_to_do must be a non-empty list"
        )
    print(f"OK — {len(ADVISORY_DB)} advisory entries, all well-formed.")
