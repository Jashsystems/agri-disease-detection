"""
advisory_data.py
================
Hardcoded advisory content — no weather API, no external lookups.
Disease names here MUST exactly match the keys in class_labels.json
produced by train_model.py, or the backend's lookup will fail silently.

Trained classes (from PlantVillage, tomato + potato crops):
  Bacterial_Spot, Early_Blight, Late_Blight, Leaf_Mold, Healthy
"""

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


def get_advisory(disease_name: str) -> dict:
    """
    Looks up advisory content for a predicted disease.
    Falls back to a safe default if the model returns an unrecognized label
    (shouldn't happen if class_labels.json matches this dictionary's keys,
    but this prevents a hard crash if they ever drift out of sync).
    """
    return ADVISORY_DB.get(
        disease_name,
        {
            "what_it_is": "Diagnosis unclear — this case has been sent for expert review.",
            "what_to_do": ["Await officer confirmation before taking action"],
            "safe_dosage": "Not applicable until confirmed",
        },
    )
