# Project Pivot Report: Word-Level Recognition & Conversation Mode

*This document explains the technical and practical rationale behind transitioning the SignAI project from simple static fingerspelling to dynamic whole-word recognition and real-time conversation framing. You can adapt this text directly for your final project report or slides.*

---

## 1. The Core Limitation of Fingerspelling

Traditional sign language translation systems often rely on **fingerspelling** (spelling out words letter-by-letter, e.g., representing "H-E-L-L-O"). While fingerspelling is simple to implement using static posture classifiers (e.g., classifying single image frames), it does not reflect how sign languages are actually used:

1. **Authentic Usage:** In Indian Sign Language (ISL), fingerspelling is used primarily for proper nouns (like names of people or places) or rare words that do not have dedicated signs. Over 90% of real conversational communication uses **whole-word signs**.
2. **Cognitive Burden:** Forcing a deaf or hard-of-hearing individual to spell out every single word letter-by-letter is slow, tedious, and unnatural. It creates a massive communication bottleneck.
3. **Linguistic Accuracy:** Letter-based spelling misses the rich, dynamic grammar and structural shortcuts inherent to ISL.

**The Pivot:** By shifting to **whole-word sign recognition**, SignAI now translates authentic gesture patterns directly into complete words (e.g., recognizing the continuous motion gesture for "Thank You" or "Emergency" in a single prediction), offering a more authentic, respectful, and functional translation tool.

---

## 2. Technical Challenge: Sequence vs. Static Pose Classification

From a machine learning perspective, recognizing static fingerspell letters vs. whole-word signs represents a categorical jump in complexity:

| Dimension | Fingerspelling Mode (Static) | Word-Recognition Mode (Dynamic) |
| :--- | :--- | :--- |
| **Model Input** | A single frame of 126 coordinate values. | A temporal sequence of 30 frames (126 coordinates × 30 = 3,780 values). |
| **Data Context** | Spatial coordinates only (where joints are at this instant). | Spatiotemporal trajectories (how joints move, accelerate, and rotate over time). |
| **Model Type** | Basic geometry heuristics or static neural nets. | Sequential models like **LSTM (Long Short-Term Memory)** networks or flattened **Random Forest/SVM** temporal arrays. |

### Neural Architecture
In word-recognition mode, a sliding buffer captures the hand landmark coordinate states over a rolling 30-frame window (approx. 1 second of live video). 

A recurrent neural network with an **LSTM layer** processes these sequences:
1. The model tracks the *history* of joint coordinates.
2. It captures changes in hand positioning, finger contraction velocities, and coordinate relative offsets.
3. A softmax output layer yields the probability across the target vocabulary.

---

## 3. Real-World Framing: Conversation Mode

Fingerspelling demos are typically presented as a solo, single-camera setup where the user practices signs alone. While useful for education, it ignores the primary use case of translation: **bilateral communication**.

By introducing **Conversation Mode**, we reframe SignAI as a video-call utility:
1. **Remote Call Integration:** Designed to run in a split screen or second monitor alongside standard platforms like Zoom, Google Meet, or Microsoft Teams.
2. **Bilateral Flow:**
   - **The Signer** signs into the camera, which translates dynamic gestures to speech and text in real-time, automatically inserting them into a shared transcript.
   - **The Interlocutor** responds via text or speech (using speech-to-text recognition) on the other side of the panel.
3. **Continuous Record:** A timestamped chat transcript tracks the conversation from both sides, enabling natural dialogue exchange without manual builder interactions.

---

## 4. Analytical Rigor: Acknowledging Data Constraints

A major point of academic rigor is acknowledging the constraints of the training pipeline:
- **Dataset Scale:** Given a vocabulary of 20 word-signs with 20–50 samples recorded per sign by a single user, sequence models (especially deep ones like LSTMs) will exhibit local generalization limits.
- **Single-Signer Bias:** The models are highly responsive to the signing style, lighting conditions, and camera characteristics of the training environment.
- **Evaluative Mitigation:** To ensure robust performance in live evaluations, we implement a **Random Forest baseline** alongside the LSTM. The Random Forest model flattens the sequence and uses ensemble trees to classify. It trains in seconds and provides highly stable accuracy in low-data regimes, while the LSTM serves as the theoretical framework for larger, multi-signer production scales.
