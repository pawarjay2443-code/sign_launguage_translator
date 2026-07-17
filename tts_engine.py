import pyttsx3
import threading

class TTSEngine:
    """
    Handles Text-to-Speech asynchronously so it doesn't freeze the OpenCV video feed.
    """
    def __init__(self):
        # Initialize pyttsx3 engine
        self.engine = pyttsx3.init()
        
        # Set a slightly slower, clearer speech rate (default is usually 200)
        self.engine.setProperty('rate', 150)
        
        self.is_speaking = False

    def _speak_thread(self, text):
        self.is_speaking = True
        self.engine.say(text)
        self.engine.runAndWait()
        self.is_speaking = False

    def speak(self, text):
        """
        Speaks the given text out loud. 
        Uses threading to avoid blocking the main video loop.
        """
        if text.strip() == "":
            return
            
        if self.is_speaking:
            print("[TTS] Already speaking, ignoring...")
            return

        print(f"[TTS] Speaking: {text}")
        thread = threading.Thread(target=self._speak_thread, args=(text,))
        # Set as daemon so it dies immediately if main program exits
        thread.daemon = True 
        thread.start()
