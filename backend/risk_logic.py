def determine_risk(confidence):
    if confidence > 80:
        return "auto_sent"
    elif confidence >= 50:
        return "pending_review"
    else:
        return "pending_review"

def should_send_advisory(confidence):
    return confidence >= 50
