# ============================================================
# PROJECT  : AI-Based Sign Language Translator
# FILE     : emergency_detector.py
# PURPOSE  : Check finalized sentences for emergency symptoms and
#            return first aid instructions.
# ============================================================

from emergency_data import EMERGENCY_KEYWORDS

def check_for_emergency(sentence: str):
    """
    Check if a sentence contains any of the pre-configured emergency keywords.
    
    Parameters:
    - sentence : str — the input sentence to evaluate
    
    Returns:
    - dict or None: Returns a dictionary containing {keyword, alert, first_aid}
      if an emergency keyword is found, else None.
    """
    if not sentence:
        return None
        
    # Clean the input sentence for robust substring matching
    clean_sentence = sentence.lower().strip()
    
    for keyword, data in EMERGENCY_KEYWORDS.items():
        # Check if the keyword exists as a substring in the sentence
        if keyword in clean_sentence:
            return {
                "keyword": keyword,
                "alert": data["alert"],
                "first_aid": data["first_aid"]
            }
            
    return None
