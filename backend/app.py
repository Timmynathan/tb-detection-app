from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import tensorflow as tf
import numpy as np
from PIL import Image
import os
import cv2
from werkzeug.utils import secure_filename

app = Flask(__name__)
CORS(app)

# Load trained model
model = tf.keras.models.load_model("tb_model.keras")

UPLOAD_FOLDER = "uploads"
GRADCAM_FOLDER = "gradcam"

# Ensure folders exist as directories
for folder in [UPLOAD_FOLDER, GRADCAM_FOLDER]:
    if os.path.exists(folder) and not os.path.isdir(folder):
        os.remove(folder)
    os.makedirs(folder, exist_ok=True)


def preprocess_image(image_path):
    img = Image.open(image_path).convert("RGB")
    img = img.resize((224, 224))
    img_array = np.array(img) / 255.0
    img_array = np.expand_dims(img_array, axis=0)
    return img_array


def get_last_conv_layer_name(model):
    for layer in reversed(model.layers):
        if isinstance(layer, tf.keras.layers.Conv2D):
            return layer.name

    for layer in reversed(model.layers):
        if hasattr(layer, "layers"):
            for nested_layer in reversed(layer.layers):
                if isinstance(nested_layer, tf.keras.layers.Conv2D):
                    return nested_layer.name

    return "conv5_block16_concat"


def generate_gradcam(model, image_array, original_image_path, output_path):
    last_conv_layer_name = get_last_conv_layer_name(model)

    grad_model = tf.keras.models.Model(
        inputs=model.inputs,
        outputs=[model.get_layer(last_conv_layer_name).output, model.output]
    )

    with tf.GradientTape() as tape:
        conv_outputs, predictions = grad_model(image_array)
        loss = predictions[:, 0]

    grads = tape.gradient(loss, conv_outputs)
    pooled_grads = tf.reduce_mean(grads, axis=(0, 1, 2))

    conv_outputs = conv_outputs[0]
    heatmap = conv_outputs @ pooled_grads[..., tf.newaxis]
    heatmap = tf.squeeze(heatmap)

    heatmap = tf.maximum(heatmap, 0)
    max_value = tf.reduce_max(heatmap)

    if max_value == 0:
        heatmap = np.zeros((224, 224))
    else:
        heatmap = heatmap / max_value
        heatmap = heatmap.numpy()

    heatmap = cv2.resize(heatmap, (224, 224))
    heatmap = np.uint8(255 * heatmap)
    heatmap = cv2.applyColorMap(heatmap, cv2.COLORMAP_JET)

    original_img = cv2.imread(original_image_path)
    original_img = cv2.resize(original_img, (224, 224))

    superimposed_img = cv2.addWeighted(original_img, 0.6, heatmap, 0.4, 0)
    cv2.imwrite(output_path, superimposed_img)


@app.route("/", methods=["GET"])
def home():
    return jsonify({
        "message": "TB Detection API Running"
    })


@app.route("/uploads/<filename>", methods=["GET"])
def uploaded_file(filename):
    return send_from_directory(UPLOAD_FOLDER, filename)


@app.route("/gradcam/<filename>", methods=["GET"])
def gradcam_file(filename):
    return send_from_directory(GRADCAM_FOLDER, filename)


@app.route("/predict", methods=["POST"])
def predict():
    if "image" not in request.files:
        return jsonify({
            "error": "No image uploaded"
        }), 400

    file = request.files["image"]

    if file.filename == "":
        return jsonify({
            "error": "Empty filename"
        }), 400

    filename = secure_filename(file.filename)
    file_path = os.path.join(UPLOAD_FOLDER, filename)
    file.save(file_path)

    processed_image = preprocess_image(file_path)
    prediction = model.predict(processed_image)[0][0]

    if prediction > 0.5:
        result = "TB Detected"
        confidence = float(prediction * 100)
    else:
        result = "Non-TB"
        confidence = float((1 - prediction) * 100)

    name, _ = os.path.splitext(filename)
    heatmap_filename = f"{name}_gradcam.jpg"
    heatmap_path = os.path.join(GRADCAM_FOLDER, heatmap_filename)

    try:
        generate_gradcam(model, processed_image, file_path, heatmap_path)
        heatmap_url = f"http://127.0.0.1:5000/gradcam/{heatmap_filename}"
    except Exception as error:
        print("Grad-CAM generation failed:", error)
        heatmap_url = None

    uploaded_image_url = f"http://127.0.0.1:5000/uploads/{filename}"

    return jsonify({
        "prediction": result,
        "confidence": round(confidence, 2),
        "uploaded_image_url": uploaded_image_url,
        "heatmap_url": heatmap_url
    })


if __name__ == "__main__":

    import os

    port = int(os.environ.get("PORT", 5000))

    app.run(host="0.0.0.0", port=port)