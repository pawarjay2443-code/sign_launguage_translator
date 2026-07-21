# ============================================================
# PROJECT  : AI-Based Sign Language Translator
# FILE     : emergency_data.py
# PURPOSE  : Dictionary of emergency keywords mapped to alerts
#            and standard first-aid response guidelines.
# ============================================================

# Safety/Professional disclaimer shown in the interface
DISCLAIMER_TEXT = (
    "Not a substitute for professional medical help. "
    "Always call emergency services immediately if someone is in danger."
)

EMERGENCY_KEYWORDS = {
    "chest pain": {
        "alert": "Emergency: Chest pain alert! Possible cardiac event.",
        "first_aid": [
            "Call emergency services immediately.",
            "Have the person sit down and rest in a comfortable position (e.g. leaning back against a wall).",
            "Ask if they carry heart medication (like nitroglycerin) and assist them in taking it.",
            "Loosen tight clothing around their neck and chest.",
            "Be prepared to perform CPR if the person becomes unconscious and stops breathing."
        ]
    },
    "cant breathe": {
        "alert": "Emergency: Breathing difficulty alert! Possible airway obstruction or severe asthma.",
        "first_aid": [
            "Call emergency services immediately.",
            "Help the person sit upright to make breathing easier.",
            "Ask if they have an inhaler or epinephrine auto-injector and assist in using it.",
            "Keep the person calm; anxiety can worsen breathing difficulties.",
            "Do not give them anything to eat or drink."
        ]
    },
    "bleeding": {
        "alert": "Emergency: Severe bleeding alert! Action required to prevent shock.",
        "first_aid": [
            "Call emergency services if the bleeding is severe or won't stop.",
            "Put on gloves if available, then apply firm, direct pressure to the wound with a clean cloth or bandage.",
            "If possible, elevate the injured limb above the level of the heart.",
            "Keep the pressure applied continuously. Do not remove the cloth to check if it has stopped.",
            "If bleeding persists through the cloth, apply another layer on top and continue pressing."
        ]
    },
    "unconscious": {
        "alert": "Emergency: Unconsciousness alert! Assessing responsiveness.",
        "first_aid": [
            "Call emergency services immediately.",
            "Check for responsiveness by gently shaking their shoulders and asking loudly, 'Are you okay?'",
            "Check if they are breathing normally. If not breathing, start CPR immediately.",
            "If they are breathing normally, place them gently on their side in the recovery position to keep the airway clear.",
            "Do not give them anything by mouth."
        ]
    },
    "choking": {
        "alert": "Emergency: Choking alert! Blocked airway response.",
        "first_aid": [
            "Call emergency services immediately.",
            "If the person can cough forcefully, encourage them to keep coughing.",
            "If they cannot speak or breathe, stand behind them and deliver 5 back blows between the shoulder blades with the heel of your hand.",
            "If they are still choking, perform 5 abdominal thrusts (Heimlich maneuver).",
            "Repeat the cycle of 5 back blows and 5 abdominal thrusts until the blockage is cleared."
        ]
    },
    "seizure": {
        "alert": "Emergency: Seizure alert! Protection and safety actions.",
        "first_aid": [
            "Call emergency services if the seizure lasts more than 5 minutes or is their first.",
            "Clear the surrounding area of any hard or sharp objects to prevent injury.",
            "Gently place something soft, like a folded jacket, under their head.",
            "Do not restrain the person or put anything in their mouth.",
            "Time the seizure and roll them onto their side in the recovery position once it stops."
        ]
    }
}
